# DX Scorecard

The after-state, read beside [`BASELINE.md`](BASELINE.md). Same metrics, same
definitions, and the same rule as the baseline: a number without a source is
`UNMEASURED` with the reason.

**Final verdict: NEEDS WORK.** The documented path is now proven executable —
six commands, 128.1 s, 357 artifacts, 51/51 rules reporting `synced`, zero
interventions — and every command the docs show is executed by CI. The runbook's own onboarding gate (G4) does **not** pass, because
no human subject was recruited and no consented session was recorded. Those are
missing inputs, not unfixed defects, and they are listed with owners and dates
rather than averaged away.

---

## Gates

| Gate | Verdict | Basis |
| --- | --- | --- |
| **G1** Baseline frozen | **PASS** | M1-M10 either measured with a named source or `UNMEASURED` with a reason. Corrected after review — see [BASELINE.md](BASELINE.md#corrections-made-after-review) |
| **G2** Golden path published | **PASS** | Six steps, one owner each, in the README. Mandated-versus-optional recorded with costs ([DECISIONS.md](DECISIONS.md)) |
| **G3** Path built | **PARTIAL** | 3.1, 3.2, 3.3, 3.4, 3.5 hold: M8 is now **100%**, enforced by a ledger test rather than by a sweep. 3.6-3.9 remain `UNMEASURED` — there is no 20-run post-rewrite window yet, and bootstrap attempts stand at n=2 of the 20 required |
| **G4** Onboarding proof | **FAIL** | 4.2 (zero interventions) holds **for the scripted run only**. 4.1 needs three human subjects: 0 of 3. 4.6 needs written consent: no session was recorded. 4.3/4.4/4.5/4.7 are `UNMEASURED` — a script's wall clock is a lower bound on machine time, not a measurement of human time |
| **G5** Scorecard and handover | **PARTIAL** | 5.1 published and linked from the README. 5.3 every Post-runbook row carries an owner and a date. **5.2 fails** (owner has not accepted in writing) and **5.4 fails** (the evidence pack records its dates and viewers here, but no custody manifest existed when the run was made) |

The `FAIL` on G4 is not a defect in the repository. It is the gate working: it
refuses to accept an agent's clean-room run as evidence about a person's first
run. The honest name for what was proven is a **G4.0 precondition** — the
documented path executes as written — and it is now permanent, because CI runs
the last two documented commands on every push.

---

## Metrics, before and after

| Metric | Before | After | Source |
| --- | --- | --- | --- |
| **M1** Time to first success | **Not reached** — 0 files, exit 0 (artifact: archived before-run log) | **128.1 s** clone → deployed and observable, six steps, all exit 0 on the first attempt. Slower than the 72.9 s measured before M8 landed, because step 4 now also runs the documented-command ledger; the trade is stated rather than smoothed | Clean-room run, commit `33781e4`: 0.1 + 47.3 + 3.2 + 75.7 + 1.3 + 0.3 |
| **M2** CI time to first failure | `UNMEASURED` — 0 failures in 91 push runs on `main` | `UNMEASURED` — unchanged; no failure has occurred since | `gh api .../runs?branch=main&status=failure` |
| **M3** CI pipeline duration | p50 16 s / p90 22 s | **28 s** wall clock on the first post-rewrite run (n=1): the two new steps cost about 12 s over the baseline, because this runner executes the 184-test suite in **3.8 s**. No distribution exists yet — that is what the 20-run window is for | `gh api .../jobs/127492858393` → started 19:52:03, completed 19:52:31, on PR #107 |
| **M4** Flake rate | 0.0% ci (0/178) · 2.2% release · 0.69% combined | unchanged; every flake in the window has an owner (release-please retry, see commitments) | `gh run list --json attempt` |
| **M5** Bootstrap failure rate | `UNMEASURED` (n=1, silent no-op) | **1 of 2** instrumented clean-machine attempts failed at baseline, **2 of 2** succeed after | Clean-room runs; n is far below the 20 the target requires |
| **M6** Step count | 5 documented + 1 manual UI action + 1 undocumented prerequisite = **7 effective** | **6 documented, 0 manual, 0 undocumented** | README Quick Start; clean-room transcript |
| **M7** Tool decisions | **0 records** | **1 record**, full criteria set, verdict + exit path ([DECISIONS.md](DECISIONS.md)) | This work |
| **M8** Documented-command pass rate | install never executed in CI | **100%**: all 35 documented project-command instances execute in CI — 15 in `tests/documented-commands.test.mjs`, 20 in the workflow's "Documented commands" step, including `mise run ci` itself. Seven non-command lines (prerequisite installs, `cd`, scratch `mkdir`, a hypothetical-harness example, two prose references) are declared with a checkable reason instead | `tests/documented-commands.test.mjs`; `.github/workflows/ci.yml` |
| **M9** Stale samples | N/A (no SDK samples) | N/A | `find` — unchanged |
| **M10** Senior hours per onboarding | `UNMEASURED` (no human onboarding) | `UNMEASURED` — still no human onboarding | — |

### How M8 is enforced, and what "100%" counts

`tests/documented-commands.test.mjs` reduces every documented command — fenced
`bash` lines **and** inline commands in the Commands table — to a signature
(`surface | subcommand | flags`) and requires each one to be claimed by an entry
that executes it, or by a declaration with a reason. It fails in both
directions: an unclaimed documented command fails the build, and an entry that no
longer covers a documented command fails too, so coverage cannot outlive the docs
it defends.

The denominator, stated the way the baseline review taught: **35 project-command
instances** are documented across the README, CONTRIBUTING, and the four docs, and
all 35 execute — 15 through the test suite against the real binary, 20 through the
workflow's "Documented commands" step. A further **7 lines** are not project
commands (`curl https://mise.run | sh`, `brew install mise`, `cd`, a scratch
`mkdir`, the hypothetical `example-agent` pair, and two prose references to
`node --test`) and are each declared with a checkable reason. They are not counted
in the 35. A rate without its denominator is how the baseline got M2 wrong.

---

## The before/after, in one line each

| | Before | After |
| --- | --- | --- |
| Clone | `https://github.com/<your-org>/agency-rules.git` — not executable | literal URL |
| Deploy | `install --scope project` → `⚠️ No harness detected`, **0 files, exit 0** | `install --all --scope project` → **357 files, 7 destinations, exit 0** |
| Observe | no step; nothing to read | `list --harness copilot` → **51/51 `✅ synced`** |
| Test | not on the path; `ci` could rewrite the tree | `mise run ci` → **184 tests, read-only** |
| Leftovers | up to 7 untracked harness directories | **0** (working tree clean after all six steps) |
| Whole path | 69.4 s to a silent no-op | **128.1 s to a verified install** |

---

## Evidence pack

Manifest, so the claims above can be re-checked rather than believed:

| Item | Path | Supports | Verified by |
| --- | --- | --- | --- |
| Per-step timings | `/tmp/dx-proof/run4/timings.txt` | the 128.1 s, six exit-0 steps | Evidence Collector (**no internal timestamps** — durations cannot be independently cross-checked) |
| Run transcript | `/tmp/dx-proof/run4/session.log` | all six commands green, no retries | Evidence Collector |
| Observe output | `/tmp/dx-proof/run4/list.txt` | 51 rules, 52 `✅` rows (51 rules + legend), 0 non-`synced` | Evidence Collector |
| Clean-room checkout | `/tmp/dx-proof/run4/agency-rules/` | 51 files in each of 7 destinations = 357 | Evidence Collector |
| Fresh HOME | `/tmp/dx-proof/run4/home/` | the run did not touch the operator's real environment | Evidence Collector — **excluded from the pack**, see below |
| Before-run artifacts | `/tmp/dx-archive/before-step5a-install.log`, `before-step4-convert.log`, `before-step3-mise.log` | the baseline outcome: `No harness detected`, 0 files, exit 0 | This work |
| CI raw dumps (~42) | `/tmp/dx-baseline/raw/` | M2/M3/M4 | Analytics Reporter — **not re-verified** by the Evidence Collector, whose sandbox could not read that path. Treat the CI numbers as single-source |

**Run manifest:** commit `33781e4` · Linux
6.18.33.2-microsoft-standard-WSL2 · mise 2026.11.1 · `env -i HOME=<fresh>
TERM=dumb PATH=<mise + coreutils>` · **clone source was the local repository
path**, because the GitHub remote did not yet carry these commits. A third party
cannot reproduce the clone from this pack alone — that is a real limitation, not
a detail.

**Retention, viewers, deletion** — a scripted run is not a recorded session, so
the runbook's 90-day default for recorded sessions does not apply to the raw
artifacts:

| Class | Items | Window | Deletion date |
| --- | --- | --- | --- |
| Transcript and derived timings | `session.log`, `list.txt`, `timings.txt` | 30 days (no subject, no personal data, regenerable) | 2026-12-05 |
| Checkout and fresh HOME | `agency-rules/`, `home/` | 14 days (pure reproduction surface) | 2026-11-19 |
| CI raw dumps | `raw/` (~42) | 30 days (re-derivable) | 2026-12-05 |
| Synthesis documents | `BASELINE.md`, `DECISIONS.md`, `SCORECARD.md` + gate records | 90 days past handover | 2027-02-03 |
| Recorded session + consent | **do not exist** | n/a | n/a |

**Viewers:** DX Engineer, Evidence Collector, Reality Checker. The runbook's
fourth slot is "the subject" — there is no subject, so the list is three. The
pack is internal-only.

**Redaction.** No GitHub token, npm token, private key, `Authorization` header,
cookie or customer record appears in the pack. Three items were found and are
disclosed rather than shipped silently: the clean-room `.git/config` names the
local clone path (which is why the clone source is disclosed above),
`package.json` carries the maintainer's public author email, and `SECURITY.md`
carries the same email after a line reading `(replace before publishing)` — a
pre-existing repository issue, not created by this work. `home/` is excluded
because a vendored toolchain carries third-party contributor emails: no
evidentiary value, avoidable personal data.

---

## Post-runbook commitments

Owned, dated, and not yet done. Every row is a `FAIL` or `UNMEASURED` above.

| # | Work | Owner | Date | Closes |
| --- | --- | --- | --- | --- |
| W1 | Recruit and run 3 first-time subjects on clean machines; log each stall with its step and duration | DX Engineer | 2026-11-26 | 4.1, 4.2, 4.5, M1 human, M10 |
| W2 | Written consent, retention window, viewer list per recorded session — or amend the runbook in writing to distinguish a scripted run from a recorded session | Platform Engineer + owner | 2026-11-19 | 4.6, 5.4 |
| W3 | Custody manifest generated at run time (SHA, host, env, captured timings), not reconstructed afterwards | SRE | 2026-11-14 | 5.4, and the "no internal timestamps" finding |
| ~~W4~~ | ~~M8 to 100%~~ — **done 2026-11-05**: 35 of 35 command instances execute, enforced by a ledger test that fails when a documented command has no claim | Developer Tooling Engineer | closed | 3.1 ✅ |
| W5 | Owner accepts handover in writing | Repository owner | 2026-11-26 | 5.2 |
| W6 | Post-rewrite gate window: M2/M3/M4 over the first 20 default-branch runs of the new pipeline. M3 will read higher than the 16 s baseline: the CI job now runs the documented commands, including `mise run ci` again (~75 s in the clean room). First post-rewrite run measured 28 s, not the ~75 s the clean room predicted — the runner is 12× faster than the machine the clean room ran on, which is why a clean-room number is not a CI estimate | Analytics Reporter | 2026-12-05 | 3.6, 3.7, 3.8 |
| W7 | 20 instrumented clean-machine bootstrap attempts (n is 2 today) | Platform Engineer | 2026-12-05 | 3.9 |
| W8 | DORA lead time and change failure rate, 30-day rolling against baseline | Analytics Reporter | 2026-12-05 | DORA rows in the baseline |
| W9 | Registry truth: 5 of 30 tags never reached npm (`0.2.0`, `0.3.0`, `0.3.1`, `0.9.0`, `0.10.0`), and `v0.9.0` has a green run whose publish job was skipped. The check is now written down in [`docs/RELEASING.md`](../RELEASING.md): per-version document plus shasum comparison, because the packument lagged 90 s behind a publish that had already succeeded. `0.20.0` verified that way — shasums identical | DevOps Automator | method done 2026-11-05; backfill of the 5 missing tags 2026-11-12 | the real change-failure rate |
| W10 | Steady-state M2/M3/M4 over 100 default-branch runs; golden-path re-proof quarterly | Analytics Reporter / Workflow Optimizer | 2027-02-03, then quarterly | Post-runbook steady state |
| W11 | `--rules all` is documented nowhere and exits 1; decide whether it is a valid spelling or an error worth an explicit message | Developer Tooling Engineer | 2026-11-19 | the escape-hatch gap found in the decision record |

**Note on ownership.** This repository has one maintainer. Every owner column
resolves to Deuri Vasquez wearing that hat, so the runbook's separation of duties
is aspirational here, not staffed. The dates are commitments, not a schedule
someone else will enforce.

---

## What is proven, and what is not

**Proven, reproducibly:** the six documented commands are executable exactly as
written on a machine that already has `mise`; they install 357 files across 7
destinations; 51 of 51 rules report `synced`; the suite is 184 tests and green;
the tree is clean afterwards; and CI now fails if the last two documented
commands stop working.

**Not proven:** that a first-time human can follow the path — the operator knew
which flags to pass before typing them; that the path survives a machine without
`mise` preinstalled (the prerequisite is now documented and remains unexecuted);
M2 and the human-times; and what Copilot actually injects from the 51 installed
instruction files.

**Review record.** The change was audited by a Reality Checker (default verdict
`NEEDS WORK`, upheld here) and an Evidence Collector, and their findings changed
the work rather than the report: six unsupported claims in the baseline were
rewritten, `mise run ci` was made read-only, the new CI steps were put under test,
`opencode.json` was added to `.gitignore`, and the `mise` prerequisite was added
to the Quick Start. The review correspondence lives in the same pack as the
evidence.
