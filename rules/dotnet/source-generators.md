---
name: source-generators
description: Use when writing a Roslyn source generator, incremental generator, or analyzer, to keep them incremental, deterministic, and debuggable.
trigger: model_decision
tags: [dotnet, source-generators, roslyn, analyzers]
---

# Source Generators and Analyzers

- **Prefer `IIncrementalGenerator`.** It runs only on changed inputs and scales with the solution; `ISourceGenerator` re-runs over everything on every keystroke. Design around incremental values from the start.
- **Emit deterministic output.** Generated code must be byte-for-byte stable for the same input — no timestamps, GUIDs, or machine-dependent paths. Non-determinism breaks incremental caching and reproducible builds.
- **Generate partial types; never edit user code.** A generator adds to a `partial` declaration the user owns. Rewriting or regenerating the user's own source is a landmine for tooling and review.
- **Report problems with `Diagnostic`, not exceptions.** A generator that throws crashes the build with no useful location. Emit a `Diagnostic` with a source location and a clear message so the user sees it in the editor.
- **Snapshot-test the output with Verify.** Golden-file tests catch regressions in generated code that unit tests miss. Pin the generated output and review the diff.
- **Ship the generator as its own project.** Target `netstandard2.0` for maximum host compatibility and reference it from the consuming project via `OutputItemType="Analyzer"`. Keep the generator free of the host's runtime dependencies.
- **Document the generated API.** The generated surface is part of the consumer's API; without documentation, the user cannot tell what they got or why.
