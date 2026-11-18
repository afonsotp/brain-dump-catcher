import type { Register } from 'claude-code'

// Your prompting framework. Replace it any time with `/framework <your framework>`;
// what you set is kept across sessions.
const DEFAULT_FRAMEWORK = `## Role
Who the assistant should act as.

## Goal
The single outcome wanted, in one or two sentences.

## Context
Background, current state, what has been tried, relevant files or links.

## Task
Concrete, ordered steps or deliverables.

## Constraints
Must / must-not rules, scope limits, tools, tone, deadlines.

## Output format
Exactly what the response should look like.

## Success criteria
How we'll know it's done and done well.`

const DEFAULT_MIN_WORDS = 150
const BYPASS = '!raw'
const USER_ORIGINS = new Set(['composer', 'bridge', 'sdk', 'unclassified'])

const instructions = (framework: string, words: number) => `[brain-dump-catcher]
The user's message above is a long, unstructured brain dump (${words} words). Do NOT start the work it describes yet. Instead:

1. Read it closely and find the 2-4 most important ambiguities, gaps or contradictions that would change the result (goal, scope, audience, constraints, output format, priorities). Skip anything you can answer from the text or a sensible default.
2. Ask those questions in one go. Use the AskUserQuestion tool if you have it (short options, a recommended option first); otherwise list them as numbered questions and stop to wait for answers.
3. Once answered, rewrite the whole request into the user's prompting framework below. Keep every concrete detail, requirement and example from the brain dump plus the answers; drop repetition and filler; resolve contradictions using the answers; order the content logically. Leave out a framework section only if it truly has nothing, never invent facts.
4. Show the rewritten prompt in a single fenced markdown block, then ask whether to run it now, adjust it, or stop there.

The user's prompting framework:
<framework>
${framework}
</framework>`

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

// Quoted lines (`> ...`) are text pasted from elsewhere, not your own writing.
const ownWords = (text: string) =>
  countWords(
    text
      .split('\n')
      .filter(line => !/^\s*>/.test(line))
      .join('\n'),
  )

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'framework',
      description: 'Show or set the prompting framework brain dumps are rewritten into',
      argumentHint: '[framework text | reset]',
    })
    await $.command.register({
      name: 'braindump',
      description: 'Brain-dump catcher: on, off, or a word threshold (e.g. /braindump 200)',
      argumentHint: '[on | off | <words>]',
    })
    return next(e)
  })

  on('command.run', { command: 'framework' }, async ($, e) => {
    const args = e.args.trim()
    if (args === 'reset') {
      await $.store.delete('framework')
      return { text: 'Framework reset to the default.', isTextDisplayOnly: true }
    }
    if (args) {
      await $.store.set('framework', args)
      return { text: `Framework saved (${countWords(args)} words).`, isTextDisplayOnly: true }
    }
    const current = ((await $.store.get('framework')) as string | undefined) ?? DEFAULT_FRAMEWORK
    return { text: `Current framework:\n\n${current}`, isTextDisplayOnly: true }
  })

  on('command.run', { command: 'braindump' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'on' || arg === 'off') {
      await $.store.set('enabled', arg === 'on')
    } else if (/^\d+$/.test(arg)) {
      await $.store.set('minWords', Math.max(20, Number(arg)))
    } else if (arg) {
      return { text: 'Usage: /braindump [on | off | <words>]', isTextDisplayOnly: true }
    }
    const enabled = (await $.store.get('enabled')) !== false
    const min = Number((await $.store.get('minWords')) ?? DEFAULT_MIN_WORDS)
    return {
      text: `Brain-dump catcher is ${enabled ? 'on' : 'off'}; it catches prompts of ${min}+ words. Start a prompt with ${BYPASS} to skip it once.`,
      isTextDisplayOnly: true,
    }
  })

  on('prompt.submit', async ($, e, next) => {
    const kind = e.origin?.kind
    if (e.command || e.isMeta || (kind && !USER_ORIGINS.has(kind))) return next(e)

    const trimmed = e.text.trimStart()
    if (trimmed.startsWith(BYPASS)) {
      return next({ ...e, text: trimmed.slice(BYPASS.length).trimStart() })
    }
    if ((await $.store.get('enabled')) === false) return next(e)

    const words = ownWords(e.text)
    const min = Number((await $.store.get('minWords')) ?? DEFAULT_MIN_WORDS)
    if (words < min) return next(e)

    const framework = ((await $.store.get('framework')) as string | undefined) ?? DEFAULT_FRAMEWORK
    $.ui.toast(`Brain dump caught (${words} words): clarifying, then restructuring`)
    return next({ ...e, context: [...(e.context ?? []), instructions(framework, words)] })
  }).catch(($, e, next) => next(e)) // fail open: never block a prompt
}
