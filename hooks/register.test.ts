import { expect, test } from 'claude-code/testing'

const LONG = Array.from({ length: 200 }, (_, i) => `idea${i}`).join(' ')

const setup = (on: any) => {
  const seen: { text: string; context?: readonly string[] }[] = []
  on('command.register', () => ({ value: {} }))
  on('store.get', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('prompt.submit', (_: unknown, e: any) => {
    seen.push({ text: e.text, context: e.context })
    return { text: e.text, context: e.context }
  })
  return seen
}

test('a long prompt gets the clarify-and-restructure instructions', async ($, on) => {
  const seen = setup(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ wait: false, origin: { kind: 'composer' }, text: LONG })
  expect(seen.at(-1)?.context?.some(c => c.includes('[brain-dump-catcher]'))).toBe(true)
})

test('a short prompt and a !raw prompt pass untouched', async ($, on) => {
  const seen = setup(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ wait: false, origin: { kind: 'composer' }, text: 'fix the typo' })
  expect(seen.at(-1)?.context ?? []).toEqual([])
  await $.prompt.submit({ wait: false, origin: { kind: 'composer' }, text: `!raw ${LONG}` })
  expect(seen.at(-1)?.text.startsWith('idea0')).toBe(true)
  expect(seen.at(-1)?.context ?? []).toEqual([])
})

test('quoted lines do not count toward a brain dump', async ($, on) => {
  const seen = setup(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const quoted = LONG.split(' ').map(w => `> ${w}`).join('\n')
  await $.prompt.submit({ wait: false, origin: { kind: 'composer' }, text: `${quoted}\n\nexplain this more simply` })
  expect(seen.at(-1)?.context ?? []).toEqual([])
})
