---
name: spectre-console
description: Use when building or editing a .NET console or CLI application with Spectre.Console, to render rich output safely and keep prompts, progress, and live display correct.
trigger: model_decision
tags: [dotnet, spectre-console, cli, console]
---

# Spectre.Console

- **Escape user input before markup.** Any string from input, config, or a file that may contain square brackets must pass through `Markup.Escape(...)` before it is embedded in markup — `[debug]` is a style tag, not text. For interpolated strings, prefer `AnsiConsole.MarkupLineInterpolated(...)`, which escapes the values automatically.
- **Markup formats; it does not carry data.** Keep static styling in the markup string and pass the dynamic value as an argument. Never build a style tag out of a runtime value.
- **Use prompts, not raw `Console.ReadLine`.** `AnsiConsole.Prompt(new TextPrompt<T>(...))` and `SelectionPrompt<T>` validate, loop, and honor cancellation. A hand-rolled read loop re-implements what the prompt already guarantees.
- **`Status` and `Progress` for long work.** Wrap blocking work in `AnsiConsole.Status()` and loop progress in `AnsiConsole.Progress()` so the user sees activity without a wall of log lines. A live display replaces its finished message — do not print it again.
- **Tables and trees for structured output.** Use `Table`, `Tree`, and panels instead of aligning columns with spaces. Never emit color or styling with raw ANSI escape codes — Spectre renders them, and a hardcoded escape breaks piping and non-ANSI terminals.
- **Exit with a meaningful code.** Set a non-zero exit code on failure (`Environment.ExitCode` or the returned code) so the shell and CI can act on it. A CLI that prints "failed" and exits 0 lies to its caller.
