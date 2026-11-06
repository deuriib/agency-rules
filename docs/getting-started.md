# Installation and first run

This is the supported path from a fresh clone to an install you can verify. It
uses [mise](https://mise.jdx.dev/getting-started.html) for the toolchain, the
same way CI does, so the Node version and the commands are identical on every
machine.

## Prerequisites

Only one thing: **mise**.

```bash
curl https://mise.run | sh
```

Or install it with a package manager:

```bash
brew install mise
```

Everything else — Node 22, uv, the dependencies, and every task below — is pinned by
`mise.toml` and `mise.lock`. You do not need Node installed separately.

## Clone and bootstrap

```bash
git clone https://github.com/deuriib/agency-rules.git
cd agency-rules
mise install
```

`mise install` installs the pinned Node, uv, and Biome, and the `postinstall`
hook runs `npm ci`.

## Compile and install

```bash
mise run convert
mise run install --all --scope project
mise run list --harness copilot
```

- **`convert`** renders `rules/` into `integrations/<harness>/`.
- **`install --all`** copies the compiled files into every destination declared
  in `tools.json`. `--all` is deliberate on a fresh clone: detection reads the
  harness directories already on your machine, and none exist yet, so plain
  `install` would warn and install nothing.
- **`list --harness copilot`** reports the state of every rule. Every row should
  read `✅ synced`.

### What the four statuses mean

| Status | Meaning |
| --- | --- |
| `✅ synced` | Installed and byte-identical to the compiled output. |
| `🔄 modified` | Installed, but the local copy differs — edited, or not reinstalled. |
| `⬜ missing` | Compiled but never installed into that harness. |
| `❓ unbuilt` | Present in `rules/`, never compiled. |

## Install a subset

| Flag | Effect |
| --- | --- |
| `--harness <ids>` | Comma-separated harness ids from the [harness reference](https://deuriib.github.io/agency-rules/reference/harnesses/). |
| `--scope project` | Write inside this repository (the default outside a TTY). |
| `--scope user` | Write to the harness's per-user directory, usually under `$HOME`. |
| `--rules <slugs>` | Install only the named rules. |
| `--all` | Ignore detection and target every declared harness. |
| `--dry-run` | Print the plan and copy nothing. |

Preview a full install without writing:

```bash
mise run install:dry-run --all
```

`install` is a sync, not a blind copy: unchanged files are skipped so their
modification time is preserved, and a harness watching its rules directory does
not reload for no reason.

## Verify the repository

```bash
mise run ci
```

The full read-only pipeline: schema validation, duplication and contradiction
evaluation, formatting and linting, compilation, the test suite, and the
documentation build.

Individual gates are available too:

```bash
mise run validate
mise run eval
mise run test
```

## Where the files land

Every destination — project and user scope, per harness — is declared in
`tools.json` and rendered in the
[harness reference](https://deuriib.github.io/agency-rules/reference/harnesses/).
The project-scope directories are build output of `rules/` and are gitignored.

The one file `install` may create outside them is an OpenCode config that
registers the `opencode-rules` plugin; if a config already registers plugins it
says so and writes nothing, rather than creating a second file that would shadow
the first.

## Uninstall

Remove the rule files from the destination directory for each harness you
installed into. The directories themselves are disposable build output; deleting
them does not touch `rules/` or the repository.

For OpenCode, also remove the `opencode-rules` entry from the config file the
installer named in its output, unless you registered it yourself.

## Next steps

- [CLI reference](cli.md) — every command and flag.
- [Rule specification](RULE-SPEC.md) — the neutral format.
- [Adding a harness](ADDING-A-HARNESS.md) — extend the compiler.
- [Troubleshooting](TROUBLESHOOTING.md) — every stall on this page, in order.
