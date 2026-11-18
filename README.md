# brain-dump-catcher

Catches long, unstructured "brain dump" prompts. When a prompt you send is 150 words or more, Claude does not start the work; it asks you 2-4 clarifying questions, then rewrites your request into your prompting framework and asks whether to run it.

- `/framework` shows the framework; `/framework <text>` saves yours (kept across sessions); `/framework reset` restores the default (Role, Goal, Context, Task, Constraints, Output format, Success criteria).
- `/braindump on|off|<words>` toggles the catcher or sets the word threshold.
- Start a prompt with `!raw` to send it as-is once.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install brain-dump-catcher --marketplace afonsotp/brain-dump-catcher
```

From a shell:

```
claude plugin install brain-dump-catcher --marketplace afonsotp/brain-dump-catcher
```

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with `afonsotp/brain-dump-catcher`, then Add plugin.

This repository is private: installing needs GitHub access to it and a git credential for github.com on the machine (an SSH key, or `gh auth login` then `gh auth setup-git`).
