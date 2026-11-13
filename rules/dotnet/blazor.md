---
name: blazor
description: Use when writing or reviewing Blazor components, to keep them small, communicate through parameters and callbacks, and defer JS interop to render time.
globs:
  - "**/*.razor"
tags: [dotnet, blazor, razor]
---

# Blazor Components

- **Small, focused components.** Keep a component under ~200 lines and split repeated markup or logic into child components. A component that does one thing is testable; a page that does everything is not.
- **`[Parameter, EditorRequired]` for required parameters.** Mark parameters a parent must supply. Never mutate a `[Parameter]` directly — copy it into local state and own the change. Mutating a parameter fights the renderer and gets overwritten on re-render.
- **`EventCallback<T>` for child-to-parent communication.** Not `Action<T>`. `EventCallback` participates in the component's lifecycle, handles `async` correctly, and lets the parent re-render at the right time.
- **JS interop after first render.** Do not call `IJSRuntime` in `OnInitialized` / `OnInitializedAsync` — the DOM is not ready. Use `OnAfterRenderAsync` and guard one-time work with `firstRender`. The same rule applies to any DOM-dependent work.
- **`@key` on list items.** Give each item in a loop an `@key` so the diffing engine tracks identity, not position — correct focus, state, and animations when items reorder.
- **Wrap fragile trees in `<ErrorBoundary>`.** An unhandled exception in one component must not take down the whole app. Add an `<ErrorBoundary>` around component trees that can fail, with a recovery callback.
- **`RenderFragment` for templated content.** Let callers compose pieces instead of passing strings and booleans that reconstruct markup.
