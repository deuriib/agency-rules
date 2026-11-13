---
name: dotnet-testing
description: Use when writing or reviewing .NET tests, to pick the right framework, assertions, mocking, and parameterization and keep validation separate from DTOs.
trigger: model_decision
tags: [dotnet, testing, xunit, fluentassertions]
---

# .NET Testing

The obligation to write tests and the coverage floors live in `testing-discipline`
and `testing-strategy`. This rule covers the .NET specifics.

- **xUnit is the primary framework.** New suites are xUnit. Follow AAA (Arrange, Act, Assert) and keep each test isolated, deterministic, and fast — no shared state, no `sleep`, no network in a unit test.
- **FluentAssertions for readable assertions.** Write `result.Should().Be(...)` and `action.Should().Throw<...>()` instead of `Assert.Equal`. A readable assertion makes a failure self-explanatory.
- **Moq for mocking dependencies.** Mock at the boundary; assert interactions only when they are the contract, not the implementation detail.
- **Parameterize with `[Theory]` and `[InlineData]`.** A table of inputs over one test body beats copy-pasted `[Fact]`s. Use `[MemberData]` or a custom `DataAttribute` when the cases are too rich for `[InlineData]`.
- **Every new feature has a test; every bug fix has a regression test.** The regression test fails on the old code and passes on the fix — this is the gate, not an afterthought.
- **FluentValidation for complex rules.** Use FluentValidation instead of Data Annotations when rules depend on each other or on injected services. Keep validators in their own classes, separate from DTOs and reusable across layers.
- **Real databases over in-memory.** Integration tests run against Testcontainers or a Docker database, never `InMemoryDatabase`, which hides real SQL semantics.
