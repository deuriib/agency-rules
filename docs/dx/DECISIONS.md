# DX Decisions

Two kinds of record, both required by the runbook: the tool decision that chose
how Copilot support works (M7, three weighted criteria minimum, two candidates
scored, verdict plus exit path), and the mandated-versus-optional register for
the golden path (G2 clause 2.4, every choice costed in the hours it saves).

---

## M7 — How should `agency-rules` support GitHub Copilot?

### What Copilot actually documents

| Mechanism | Path | Format |
| --- | --- | --- |
| Repository-wide instructions | `.github/copilot-instructions.md` | Plain Markdown, no frontmatter |
| Path-specific instructions | `.github/instructions/NAME.instructions.md` | YAML frontmatter with `applyTo` (glob syntax, multiple patterns comma-separated) and optional `excludeAgent` |
| User-scope instructions | `$HOME/.copilot/instructions/` | Same path-specific format |

Both are documented by GitHub ("Adding repository custom instructions") and by
VS Code ("Custom instructions", which also documents `description` for task-based
discovery). Of the two roles, only the path-specific format can express "this
rule is about TypeScript files" — the repository-wide file applies to everything
by construction.

### Candidates

- **A** — one `.github/instructions/{slug}.instructions.md` per rule, `applyTo`
  compiled from `globs` (implemented: `scripts/lib/renderers/copilot.mjs`).
- **B** — one aggregate `.github/copilot-instructions.md` with every rule as a
  section.
- **C** — both.

### Criteria and weights

Chosen so that each one could actually change the answer.

| # | Criterion | Weight | Why it can decide |
| --- | --- | --- | --- |
| C1 | Covers both contract scopes (`dest.project` **and** `dest.user`) | 25 | `tools.json` requires a destination per scope; a mechanism that only exists at repository level leaves a contract slot unfillable |
| C2 | Fits the existing contract without a new `installKind` | 20 | Aggregate output is many-rules-to-one-file; `install`, the manifest, and `list` are all one-rule-to-one-file today |
| C3 | Scoping fidelity | 20 | The entire point of path-specific files is that a Go rule does not reach a TypeScript edit |
| C4 | Single source of truth | 15 | Two installed representations of the same rules can disagree while `list` still reports `synced` |
| C5 | Verified state | 10 | A mechanism without a test is a liability regardless of how it scores on design |
| C6 | Prompt cost | 10 | Instruction text enters the model's context on every interaction |

### Scores (0-5, contribution = score ÷ 5 × weight)

| Criterion | Weight | A | A·w | B | B·w | C | C·w |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C1 Cross-scope | 25 | 5 | 25 | 1 | 5 | 5 | 25 |
| C2 Contract fit | 20 | 5 | 20 | 1 | 4 | 1 | 4 |
| C3 Scoping | 20 | 4 | 16 | 2 | 8 | 2 | 8 |
| C4 Single truth | 15 | 5 | 15 | 5 | 15 | 1 | 3 |
| C5 Verified | 10 | 5 | 10 | 1 | 2 | 2 | 4 |
| C6 Prompt cost | 10 | 4 | 8 | 3 | 6 | 1 | 2 |
| **Total** | **100** | | **94** | | **40** | | **46** |

Two honest notes about the numbers: **B scores 1 on C1** because
`.github/copilot-instructions.md` is repository-wide while the documented user
scope is a directory of files, so B fills `dest.project` and leaves `dest.user`
empty. **A scores 4 on C3, not 5**, because only 6 of the 51 rules declare
`globs`; the other 45 compile to `applyTo: "**"` and receive no narrowing.

**Sensitivity:** A is not dominated — it is at least as good on all six criteria,
so no re-weighting changes the ranking. The softest point is C6; inverting it
completely moves 94 → 92 and 40 → 44 and the order holds.

### Verdict

**A is adopted.** Copilot support compiles one
`.github/instructions/{slug}.instructions.md` per rule, with `applyTo` derived
from `globs` and `**` as the default, installed to `.github/instructions/`
(project) and `~/.copilot/instructions/` (user). B is rejected for leaving the
user scope unfillable, for needing a new `installKind` and a new attribution in
`list` for a single harness, and for activating every language rule on every
file. C is rejected on both grounds and additionally installs every rule twice.

### Exit path — revisit when any of these becomes checkably true

| Trigger | How it is checked | Replaces the verdict with |
| --- | --- | --- |
| **E1** A Copilot surface reads only the aggregate file, or a rule installed with `--scope project` is shown not to apply there | GitHub Docs or VS Code Docs narrow a mechanism to certain surfaces, or a report demonstrates the miss | **C**, minimally: keep the per-rule files and add a generated `.github/copilot-instructions.md` for the affected surface, with `list` reporting both |
| **E2** A file-count limit is documented, or 51 files measurably degrade the client | The named docs declare a cap, or a measured regression appears | Re-score A vs B with C6 at the measured cost |
| **E3** The mechanism is deprecated | The docs change or remove it | Re-score the successor with these same six criteria; the criteria stay, the candidates do not |
| **E4** The glob coverage changes materially | `grep -l '^globs:' rules/**/*.md \| wc -l` stops returning 6 | Re-score only C3. Rising strengthens A; falling toward 0 makes A and B converge, and C1/C2 decide |

E1 is the one that would actually flip it. The runner-up is **C** (46): for C to
win, an actually-used surface must read only the aggregate file, `installKind`
must gain a many-to-one mode, duplicated injection must be measurably free, and
losing per-rule scoping must be judged acceptable.

### Out of scope for this decision

The rule set itself (whether 51 rules, or the 6/45 split, is the right shape);
whether Copilot really loads `~/.copilot/instructions/` in practice (**unverified
here**); real injection, tokenization and truncation behaviour (**not measured** —
C6 is modelled from file size, not observed); `excludeAgent` (deliberately not
emitted); `description`'s effect on VS Code discovery (emitted, not evaluated);
precedence when several files match one target (not verified, not relied on);
organization and enterprise instruction configuration; a general many-to-one
`installKind`.

---

## Golden path — mandated versus optional

The path is six steps, published in the README. All six are mandated: none of
them is optional, so none is optional without a costed saving.

| # | Step | Command | Decision | Why |
| --- | --- | --- | --- | --- |
| 1 | Clone | `git clone https://github.com/deuriib/agency-rules.git` | **Mandated** | At baseline the URL was a `<your-org>` placeholder; only a literal URL can be run, tested, and diffed |
| 2 | Bootstrap | `mise install` | **Mandated** | The only step that pins Node 22 + Biome 2.5.0 and the only trigger for `npm ci` (~11 s of the 24 s measured). Skipping it does not skip a convenience, it runs the suite on an unpinned toolchain |
| 3 | Run | `mise run convert` | **Mandated** | The only step that turns `rules/` into something a harness reads, and the step where the stale-`sources` defect lived. Note: step 5 depends on `convert` anyway, so step 3 is redundant for step 5 to work — it is mandated for the inspection it allows before writing 357 files, not for necessity |
| 4 | Test | `mise run ci` | **Mandated** | The baseline showed a check that existed as a task but not in the path runs for nobody. `ci` is the composition that answers "is it green", and it is now read-only so it cannot rewrite the tree it judges |
| 5 | Deploy | `mise run install --all --scope project` | **Mandated** | Where "nothing happened" and "success" were the same signal: detection on a fresh clone installs 0 files and exits 0. `--all` names the fleet instead of inferring it |
| 6 | Observe | `mise run list --harness copilot` | **Mandated** | A verification step that cannot be read does not verify. Without `--harness`, `list` falls into the same detection that found nothing and reports "No harness detected" instead of status |

### Optional, and costed

Machine time is measured; the human term is `UNMEASURED` with the instrument that
would measure it, rather than guessed.

| Optional | Cost to run | Saving if mandated | Decision |
| --- | --- | --- | --- |
| `mise run test` instead of `ci` | ≤ 44.4 s (bounded: `ci` is a superset) | < 0.0123 h per invocation; frequency `UNMEASURED` | Optional. Mandating it would delete `validate`/`eval`/`check:ci` from the path |
| `validate` / `eval` / `check:ci` individually | a subset of 44.4 s | ≤ 0.0123 h per bundle | Optional (inner loop) |
| `convert:dry-run` / `install:dry-run` | same order as the real command (~1-5 s) | cost of a bad install and its revert, `UNMEASURED` | Optional. Mandating it doubles the wall clock to say "nothing exists yet" |
| `mise run setup` after `mise install` | ~11 s = 0.0031 h | negative: it re-runs what the hook already ran | Optional |
| `--rules <slug,...>` | `UNMEASURED` | `UNMEASURED` | Optional — it is the escape hatch from `--all`, so it cannot be mandated |
| `--scope user` | `UNMEASURED` | `UNMEASURED` | Optional |
| The bare `install` menu | 3 prompts, decision time `UNMEASURED` | 0 s of machine time, decision time not measured | Optional discovery aid, excluded from the path |

### Rejected decisions, with reasons

| Rejected | Why |
| --- | --- |
| Keeping auto-detection in Deploy instead of `--all` | The detection saving is 0.4 s and it is a saving on doing nothing. The case that fails is the default case — it only works for someone who already installed, i.e. someone who no longer needs it. It also breaks determinism (two people, two different documents from one README) and breaks parity with the workflow, which runs `--all`. Detection stays where it is correct: the menu's "Detect automatically" row and `list`'s default |
| Making `install` exit non-zero when detection finds nothing | There is a legitimate no-op: a project that has not adopted a harness has nothing to install. `--harness` with no output, `--all` with no output, an unmatched `--rules`, and a manifest listing no files all already exit 1. The path does not touch this branch — the mandate is `--all`. It is now pinned by a test rather than by prose, because it *was* only prose |
| Adding an `npm test` script beside `mise run test` | `npm test` failing with `Missing script: "test"` is correct and loud. Two entry points for one gate is the defect this repository already paid for (a check in the task, absent from the workflow). A shim would also skip the pinned toolchain and the `RULES_DIR`/`INTEGRATIONS_DIR` env the task provides, and the test glob needs Node 21+. Measured demand: zero |
| A separate `npm ci` step instead of the mise hook | The work is already inside the measured step: ~11 s of 24 s is the hook's `npm ci`. A separate step adds a line whose entire content already ran, costs another ~11 s, and reopens the drift just closed (docs said `npm ci`, the task ran `npm install`) |
| Letting `mise run ci` keep depending on the write-mode `check` | The documented Test step could rewrite the files it was verifying and still exit 0. It happened to be clean in the measured run, but "happens to be clean" is not a property. `check:ci` is the read-only twin and `ci` depends on that |
| Ignoring the seven install destinations | Without the ignore rules, a first install left seven untracked directories that nothing explained — the opposite of a path you can follow |

### What the path forces, and the escapes

| Forced | Escape |
| --- | --- |
| Writes into all seven destinations | `install --harness <id>`, plus `--rules <slug,...>`; inspect first with `convert:dry-run` / `install:dry-run` |
| A 44.4 s full pipeline as the Test step | The individual tasks: `mise run test`, `validate`, `eval`, `check:ci` |
| Three prompts on a TTY in Deploy | Run it non-interactively (`</dev/null`), or pass `--all --scope project`; note `--rules all` is not a valid spelling and exits 1 |
| The ~11 s postinstall hook | None that keeps the toolchain pinned. Accepted |
| `--harness copilot` in Observe | `mise run list --harness <your-id>`; without a flag it reports detection, not status |

**Rule this record leaves behind:** a seventh step enters only with a user
problem, a confirmed defect, or measured hours; the machine cost it adds to the
72.9 s; and its escape hatch. A step justified with "it would be good" is a no
with a reason — cheaper than a maybe forever.
