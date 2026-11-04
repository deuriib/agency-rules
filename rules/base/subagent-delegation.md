---
name: subagent-delegation
description: Use when the user says spawn, dispatch, or invoke, or when a task is context-heavy, parallelizable, or narrow enough to hand off.
trigger: model_decision
tags: [workflow, subagents, context-management]
---

# Subagent Delegation Rules

- **Trigger words.** When the user says `spawn`, `dispatch`, or `invoke`, they are explicitly asking you to delegate the task to a subagent. Do not attempt to execute the task in the main thread.
- **When to delegate.** Use subagents for:
  - **Context-heavy tasks:** Searching large codebases, reading multiple files, or exploring documentation.
  - **Parallelizable work:** Multiple independent fixes or searches that can happen concurrently.
  - **Specialized tasks:** Writing tests, refactoring specific modules, or applying strict formatting.
- **Clear prompts.** When spawning a subagent, provide a self-contained prompt. Do not assume the subagent has access to the current conversation history. Pass all necessary context, file paths, and constraints explicitly.
- **Await and synthesize.** Wait for the subagent to complete and return its result. Verify the output and synthesize it back into the main workflow before presenting the final answer to the user.
- **Fail safely.** If a subagent fails or hits a limit, do not silently retry in the main thread. Report the failure, analyze the error, and decide whether to retry the subagent with a better prompt or escalate to the user.

## Do not delegate

- A single-file edit you already have open in context.
- Work that depends on the current conversation's nuance and cannot be restated in a self-contained prompt.
