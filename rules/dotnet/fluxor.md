---
name: fluxor
description: Use when adding or changing state management in a Fluxor/Blazor app, to keep state immutable, reducers pure, and side effects in effects.
trigger: model_decision
tags: [dotnet, fluxor, blazor, state-management]
---

# Fluxor (Redux for Blazor)

- **Unidirectional flow only.** Dispatch an action, reduce it to new state, and let the UI re-render from that state. Never mutate state from a component and never write to the store outside a reducer.
- **State is immutable and carries a parameterless constructor.** Decorate the state with `[FeatureState]` so `AddFluxor` discovers it automatically, make it a `record` (or an immutable class), and keep the required parameterless constructor — private is fine — for the initial value.
- **Reducers are pure.** A `[ReducerMethod]` is static, takes `(state, action)`, and returns a brand-new state — no I/O, no mutation, no `DateTime.Now`. The same inputs must always produce the same output.
- **Side effects live in effects, not reducers.** `[EffectMethod]` (or `Effect<TAction>`) performs async work — API calls, timers, navigation — and dispatches a result action. An effect never writes state directly.
- **Actions are data, not behavior.** Keep actions small and descriptive (`FetchDataAction`, `FetchDataResultAction`); they are messages, not methods. An empty action is fine.
- **Read through `IState<TState>`, write through `IDispatcher`.** Components `@inject IState<...>` for data and `IDispatcher` to dispatch. Inherit `FluxorComponent` so subscriptions unsubscribe on dispose and avoid leaks.
- **Organize by feature, not by type.** One folder per feature holding its state, actions, reducers, and effects — not one folder for every reducer. A monolith state grows into merge conflicts and cross-feature coupling.
- **Model loading and error as actions.** An effect fetches and dispatches a result action; a second reducer applies it. Loading, success, and failure are all actions so the UI renders each state instead of guessing from nulls.
