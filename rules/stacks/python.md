---
name: python
description: Use when editing Python modules, scripts, or packages, to keep typing, imports, and path handling consistent.
globs:
  - "**/*.py"
tags: [language, python]
---

# Python Rules

- **Type hints on public functions.** Every exported function, method, and module-level callable declares its parameter and return types. Use `from __future__ import annotations` when the annotations reference forward types.
- **A strict type checker gates the build.** `mypy --strict` or `pyright` in strict mode, wired into CI. Undeclared types in a checked function are an error, not a warning.
- **`Any` is banned, `object` is not.** `Any` disables checking everywhere it flows. Use `object` plus narrowing, or a `Protocol` for structural typing, `TypedDict` for dict literals, `Literal` for closed sets, and `TypeVar` for generics.
- **No bare `cast()`.** A cast tells the checker to trust you; narrow with `isinstance` or a runtime validator instead. When a cast is unavoidable, it names the invariant in a comment.
- **`pathlib` over `os.path`.** Build paths with `pathlib.Path`; never concatenate path strings by hand.
- **No wildcard imports.** `from module import *` hides where names come from and breaks static analysis. Import the names you use, explicitly.
- **Immutable by default.** `@dataclass(frozen=True)` or `NamedTuple` for value objects, `Enum` for closed sets, tuples over lists for fixed records. A mutable default argument (`def f(x=[])`) is shared across every call — use `None` plus a sentinel.
- **No stringly-typed code.** An `Enum` or a `Literal` alias, not a bare `str`. Keyword arguments over positional booleans.

## Examples

```python
# ✅ good
from pathlib import Path

from mypackage.models import User


def load_user(path: Path, user_id: str) -> User | None:
    ...
```

```python
# ❌ avoid
import os                          # os.path instead of pathlib
from mypackage.models import *     # wildcard import
def load_user(path, user_id):      # no type hints
    ...
```
