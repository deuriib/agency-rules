"""MkDocs hook: remove the edit link from pages this build generated.

The rule library, the harness reference, and the mirrored project pages are
written into `docs/` at build time from sources that live elsewhere. Their
default edit URL points at a file that is not in the repository, so the button
would 404. Pages that are committed under `docs/` keep their edit link.
"""

from __future__ import annotations

from mkdocs.config.defaults import MkDocsConfig
from mkdocs.structure.nav import Navigation
from mkdocs.structure.pages import Page
from mkdocs.utils.templates import TemplateContext

GENERATED = {
    "reference/harnesses.md",
    "contributing.md",
    "security.md",
    "changelog.md",
}


def on_page_context(
    context: TemplateContext,
    page: Page,
    config: MkDocsConfig,
    nav: Navigation,
) -> TemplateContext:
    if page.file.src_uri.startswith("rules/") or page.file.src_uri in GENERATED:
        page.edit_url = None
    return context
