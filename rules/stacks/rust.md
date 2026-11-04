---
name: rust
description: Use when editing Rust source files, to keep panics out of production paths and every unsafe block audited.
globs:
  - "**/*.rs"
tags: [language, rust]
---

# Rust Rules

- **No `unwrap()` or `expect()` in production paths.** Propagate with `?`. `expect()` is acceptable only where the invariant is proven, and its message states which invariant.
- **Every `unsafe` block carries a `// SAFETY:` comment.** Name the invariant that makes the block sound. An unexplained `unsafe` is an unreviewed one.
- **No catch-all arm on your own enums.** A `_ =>` over your own type lets a new variant pass silently. A new variant should break the build.
- **Borrow, don't clone.** `Clone` to satisfy the borrow checker hides a data-flow problem. Prefer `&str` and slices in signatures.
- **Interior mutability is justified, not default.** `RefCell` and `Mutex` push the borrow check to runtime — say why the static one cannot work.
- **`Result`, never `panic!`, in a library.** A panic unwinds into a caller that did not agree to it.
- **Errors carry context.** `thiserror` for libraries, `anyhow` for binaries — never a bare `Box<dyn Error>` with no message.
- **Clippy warnings are errors.** Deny `clippy::unwrap_used` and `clippy::expect_used` in library crates so the rule is enforced by the build.
