---
name: autobogus
description: Use when generating test fixtures or fake data in .NET, to make generation deterministic, realistic, and repeatable.
trigger: model_decision
tags: [dotnet, autobogus, testing, fixtures]
---

# AutoBogus (Test Data Generation)

- **AutoBogus is for tests, never for production.** `AutoFaker<T>` fabricates data to exercise code, not to seed real databases or drive business logic. A production path must not depend on a random generator.
- **Pin a seed for reproducibility.** Call `.UseSeed(seed)` (or `Randomizer.Seed` on Bogus) when a test must produce the same data every run. A test that fails only sometimes is worse than no test — determinism removes the "only sometimes".
- **Override only what the test depends on.** Use `.RuleFor(...)` for the one or two fields the assertion cares about and let AutoBogus fill the rest. Over-specifying every field buries the intent of the fixture.
- **Generate realistic data, not default noise.** Configure locale and sensible ranges (`.WithLocale()`, `RuleFor` with valid values) so generated data passes the same validation the real data must. A fixture full of empty strings or out-of-range numbers tests nothing.
- **Bound recursion and collection sizes.** Set `.WithRecursiveDepth()`, `.WithRepeatCount()`, and `.WithSkip<T>()` to avoid huge or circular object graphs that slow the suite or overflow the stack.
- **Reuse a shared configuration.** Configure once — globally via `AutoFaker.Configure(builder => ...)` or per faker via `AutoFaker.Create(...)` — rather than duplicating rules per test. Per-test `RuleFor` overrides only the deltas.
- **Populate existing objects with `.Populate()`** when a test needs a specific starting state plus random values, instead of generating from scratch and patching fields by hand.
