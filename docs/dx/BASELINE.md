# DX Baseline — the before-state

Frozen 2026-11-05, before any change. This is the "before" half of the DX
scorecard ([`SCORECARD.md`](SCORECARD.md)). Every number below carries the
command that produced it; a number without a source is marked `UNMEASURED` with
the reason, because an admitted gap is usable and a fabricated number is not.

Method: the Developer Experience Platform runbook (NEXUS-Sprint) applied to this
repository. Its non-negotiable rule: **a documented path nobody executed is not a
path.** So the first thing measured is the README, executed.

---

## Required inputs

| Input | Status | Note |
| --- | --- | --- |
| Named platform owner | ✅ Deuri Vasquez (repository owner) | Named before Week 1; handover acceptance is earned at G5, not negotiated there. |
| Raw baseline source for time to first success | ✅ Measured, see M1 | Measured directly rather than inherited from a prior report. |
| CI/CD admin access | ✅ `gh` CLI authenticated as `deuriib`, workflow read access | Enough to measure; deploy targets are npm + GitHub Releases. |
| A first-time test subject | ❌ **Not available** | No human subject was recruited. The clean-room run in M1 is a scripted substitute, executed with a fresh `HOME` and no prior checkout. It is evidence of the documented path, and it is **not** evidence of a human's experience. G4 clause 4.1 therefore cannot pass, and the scorecard says so. |
| A metrics source | ⚠️ Partial | `gh run list`/`gh run view` provide run and job timing. Step-level timing exists per job but `updatedAt` is webhook-touched, not a terminal timestamp — see the M3 note. |
| Written consent + retention for recorded sessions | ❌ **Nothing recorded** | No recording was made, so no consent, retention window, or viewer list exists to record. G4 clause 4.6 fails for lack of evidence, not for a leak. |

---

## Metrics

| Metric | Baseline | Source | State |
| --- | --- | --- | --- |
| **M1** Time to first success | **Not reached.** The documented path terminates after **70.9 s** with **0 files installed** and exit code **0** | Clean-room run, fresh `HOME`, documented commands only: clone 12.2 s, `mise install` 52.8 s, `mise run convert` 2.2 s, `mise run install --scope project` 3.7 s → `⚠️ No harness detected`, 0 artifacts | MEASURED (as a failure to reach first success) |
| **M2** CI time to first failure | `UNMEASURED` — **zero** `ci.yml` failures in 178 runs on `main`; the only failed run (`41360027029`) has 0 jobs and no retrievable log | `gh api repos/{owner}/{repo}/workflows/ci.yml/runs?branch=main&status=failure` → `total_count: 0`; `gh run view 41360027029 --log-failed` → `log not found` | UNMEASURED |
| **M3** CI pipeline duration | **p50 16 s, p90 22 s** (n=91, `main`). Literal 100-run window across branches: p50 16.8 s, p90 22.2 s (n=100) | `gh run list --workflow ci.yml --limit 100 --json databaseId,startedAt,updatedAt,...` then `gh api .../runs/<id>/jobs`, terminal = max job `completed_at` | MEASURED |
| **M4** Flake rate | `ci` **0.0%** (0/178) · `release` **2.2%** (2/90: runs 41149390539 and 41153632915, both 2026-10-31) · `sync-labels` **0.0%** (0/22) · combined **0.69%** (2/290) | `gh run list --json attempt,conclusion,headSha` + `gh api .../attempts/<n>`; a flake is `attempt > 1` with unchanged `head_sha` and a green final conclusion | MEASURED |
| **M5** Bootstrap failure rate | `UNMEASURED` — n=1 attempt. It exited 0 and installed nothing, which is neither a non-zero exit nor an off-path command, so it does not count as a runbook-defined bootstrap failure. The silent no-op is recorded as defect **D1** instead | Clean-room run above | UNMEASURED (n=1) |
| **M6** Step count | **5 documented** + **1 manual UI action** (the TTY menu on step 5) + **1 undocumented prerequisite** (a harness directory must already exist) = **7 effective** | `README.md` Quick Start; `scripts/install.mjs` interactive branch; `scripts/lib/detect.mjs:20-34` | MEASURED |
| **M7** Tool decisions recorded | **0 of 0** — no build-vs-adopt decision record existed for any harness | `ls docs/` → no decision record | MEASURED |
| **M8** Documented-command pass rate | **0%** of the install command executed in CI; `mise run install` is absent from `.github/workflows/ci.yml` | `cat .github/workflows/ci.yml` | MEASURED |
| **M9** Stale sample count | **Not applicable** — the repository ships no SDK samples; the only executable examples are doc snippets | `find . -name '*sample*' -o -name '*example*'` outside `node_modules` → none | N/A (declared, not skipped silently) |
| **M10** Senior hours per onboarding | `UNMEASURED` — no human onboarding was observed. The scripted run needed **3** interventions, all documentation defects (placeholder clone URL, undocumented harness prerequisite, undocumented TTY menu), and **0** minutes of senior-engineer time | Clean-room transcript | UNMEASURED |

### DORA proxies (reported post-runbook, per the runbook's own window rules)

| Proxy | Value | Source |
| --- | --- | --- |
| Lead time for changes (PR proxy) | median **0.02 h** (1.2 min), n=71 merged PRs | `gh api graphql` over `pullRequests(states:MERGED)` |
| Deploy frequency | **6.33 releases/day** (30 tags / 4.74 days of history) | `git tag --sort=-creatordate`, `gh release list --limit 60` |
| Change failure rate (normalized) | **19.0%** (19 of 100 integrations); 0 reverts | `git log origin/main --first-parent --format=%s` |
| Change failure rate (registry truth) | **16.7%** (5 of 30 tags never reached npm: `0.2.0`, `0.3.0`, `0.3.1`, `0.9.0`, `0.10.0`; `v0.9.0` has a **green run whose `publish-npm` job was skipped**) | `curl registry.npmjs.org/agency-rules` vs `git tag`, `gh api .../runs/<release-run>/jobs` |

The repository is 4.74 days old, so every 30- and 90-day window is saturated by
the whole history. Monthly deploy frequency and a 90-day change-failure rate are
extrapolations and are not reported.

---

## Defects confirmed at baseline

Each is a place where the documented path and the code disagree. All were
reproduced, not inferred.

| # | Defect | Evidence |
| --- | --- | --- |
| D1 | `install` with nothing detected prints a warning, writes nothing, and **exits 0**. On a fresh clone this is the default outcome, so "success" and "nothing happened" look identical | `scripts/install.mjs:127-131`; clean-room run |
| D2 | `install` with no `--harness`/`--all` on a TTY blocks on a three-prompt menu (harnesses → scope → rules), which the README never mentions | `scripts/install.mjs` interactive branch; measured as a 600 s cap on a pty run |
| D3 | The documented clone URL was `https://github.com/<your-org>/agency-rules.git` — a placeholder, so step 1 cannot be executed as written | `README.md` Quick Start, `CONTRIBUTING.md` Setup |
| D4 | The README claimed rules land in 4 directories; `tools.json` declared 6 harness destinations at baseline (7 after this work) | `README.md` vs `tools.json` |
| D5 | `mise run setup` ran `npm install` while the docs and the mise `postinstall` hook both said `npm ci` — two bootstrap paths for one job | `mise.toml:14` vs `README.md` commands table |
| D6 | `eval` and `convert` declared `sources` that omitted files the tasks import, so an edit to `contradictions.mjs`, `eval.mjs`, or `convert.mjs` printed `sources up-to-date, skipping` and tested stale code | `mise.toml:43,49`; reproduced by touching `scripts/lib/contradictions.mjs` |
| D7 | `docs/ARCHITECTURE.md` claimed CI runs `mise install --locked`; CI runs `jdx/mise-action` and passes no such flag | `docs/ARCHITECTURE.md` vs `.github/workflows/ci.yml` |
| D8 | An install into a project left up to 7 untracked harness directories that `.gitignore` did not cover | `.gitignore` (only `integrations/` was ignored); `git status` showed `?? .pi/` |
| D9 | `mise run create-rule -- <slug>`, as documented, exits 1: `new` requires `--description` when stdin is not a TTY | `README.md` commands table vs `scripts/new.mjs` |

---

## What this baseline does not measure

Stated so the scorecard cannot be read as broader than it is:

- **A human's first-run experience.** No subject was recruited. M1 and M10 are
  therefore an executed script, not an observed person.
- **M2.** There is no CI failure in the history to time. The metric unblocks with
  the first `ci.yml` failure on `main`.
- **Windows longer than the repository's age.** 30-day and 90-day DORA windows are
  saturated by the full 4.74-day history.
- **Copilot's real injection behaviour.** Nothing here measures what GitHub
  Copilot or VS Code actually loads, truncates, or de-duplicates; the Copilot
  work is judged on the file format it documents, not on observed model input.
