---
name: mudblazor
description: Use when building or reviewing a MudBlazor UI, to pick the right data component, validate forms explicitly, and keep dialogs and feedback consistent.
trigger: model_decision
tags: [dotnet, mudblazor, blazor, ui]
---

# MudBlazor

- **`MudDataGrid` for feature-rich data, `MudTable` for simple templates.** Choose `MudDataGrid` when you need filtering, editing, grouping, aggregation, or server-side `IQueryable`; use `MudTable` (and its `RowTemplate`) for a simple responsive table, and `SimpleTable` for plain HTML with no MudBlazor logic. New feature-heavy tables start with `MudDataGrid`.
- **Validate forms explicitly.** Setting `Required` on a field does not block submit by itself. Call `await form.ValidateAsync()` and check `form.IsValid` before saving. A form that submits without this check bypasses every rule you set.
- **Prefer FluentValidation over inline validation.** Attach a FluentValidation validator through the field's `Validation` parameter instead of scattering `Validation` lambdas, so the rules are shared, unit-testable, and kept out of the markup.
- **Dialogs return a result, not a side effect.** A `MudDialog` closes with `MudDialog.Close(DialogResult.Ok(result))`; the caller awaits `DialogService.ShowAsync<T>(...)` and reads the result. Do not mutate shared state from inside a dialog.
- **Feedback through `MudSnackbar`.** Surface transient success and error with `ISnackbar`, not a silent state change. A failure the user cannot see is a failure you will not catch.
- **Theme once with `MudTheme`.** Centralize colors, typography, and layout in a `MudTheme` applied via `MudThemeProvider`, not with per-component inline styles. Inline styling defeats the design system.
- **Stay C#-first.** MudBlazor is built with minimal JavaScript; keep component logic in C# and reach for JS interop only when no component or API already covers it.
