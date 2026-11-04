---
name: python
description: Use when editing Python modules, scripts, or packages, to keep typing, imports, and path handling consistent.
globs:
  - "**/*.py"
tags: [language, python]
---

# Python Rules

- **Type hints on public functions.** Every exported function, method, and module-level callable declares its parameter and return types. Use `from __future__ import annotations` when the annotations reference forward types.
- **`pathlib` over `os.path`.** Build paths with `pathlib.Path`; never concatenate path strings by hand.
- **No wildcard imports.** `from module import *` hides where names come from and breaks static analysis. Import the names you use, explicitly.

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
