# Security Policy

## Supported versions

`agency-rules` is a toolchain, not a service. Only the latest `main` branch
receives security fixes.

| Version | Supported |
| --- | --- |
| `main` | ✅ |
| releases older than latest | ❌ |

## Reporting a vulnerability

**Do not open a public issue.** Instead:

1. Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
   for this repository.
2. Or email: `deuriib@gmail.com` (replace before publishing).

Please include:

- A description of the issue and its impact.
- Reproduction steps (minimal rule + harness entry if applicable).
- Any suggested fix.

We will acknowledge within **3 business days** and aim to ship a fix within
**14 days** for confirmed issues.

## Scope

In scope:

- Arbitrary code execution via crafted rule frontmatter (YAML injection).
- Path traversal in `install.mjs` via `{{slug}}` substitution.
- Plugin registration tampering in `opencode.json`.
- Any case where a compiled rule for one harness leaks the body or
  frontmatter of a different rule.

Out of scope:

- Vulnerabilities in upstream harnesses (report to them directly).
- Issues requiring an attacker to already have write access to the repo.
- Denial-of-service via extremely large `rules/` trees.
