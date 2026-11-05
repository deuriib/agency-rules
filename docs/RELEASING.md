# Releasing

`release-please` opens the release PR from the commit log, and `.github/workflows/release.yml`
publishes to npm with provenance. The part that needs a procedure is the part
nobody sees: **a green release run is not proof the version reached the
registry.**

## Why the badge is not evidence

Measured on this repository before this document existed:

- 5 of 30 tags never reached npm — `0.2.0`, `0.3.0`, `0.3.1`, `0.9.0`, `0.10.0`.
- `v0.9.0` has a **successful** run whose `publish-npm` job was **skipped**, while
  the release page says "released".
- The publish step is idempotent by design: it exits 0 when the version already
  exists. That guard is correct, and it means "success" can also mean "did
  nothing".

So the check is the registry's own record, compared against what CI built.

## The check

Three commands. `VERSION` is the version in the release commit.

```bash
VERSION=$(node -p "require('./package.json').version")

# 1. The per-version document. 200 means the artifact exists; 404 means it does not.
curl -s -o /dev/null -w '%{http_code}\n' "https://registry.npmjs.org/agency-rules/${VERSION}"

# 2. The shasum the registry holds for it.
curl -s "https://registry.npmjs.org/agency-rules/${VERSION}" | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).dist.shasum"

# 3. The shasum CI reported when it published.
gh run view --log --job "$(gh run list --workflow release.yml --limit 1 --json databaseId --jq '.[0].databaseId')" \
  | grep 'shasum:'
```

**The two shasums must be identical.** That is the whole check: it proves the
bytes on the registry are the bytes CI built from that commit, which a dist-tag
cannot tell you.

### Do not trust `dist-tags` or the packument for the first few minutes

npm returns new versions asynchronously and says so in the publish log:

> `npm notice Your package is being processed and may take a few minutes to become available.`

The abbreviated packument (`/agency-rules`) replicates on its own schedule. On
2026-11-05 it reported `latest: 0.19.5` for **over 90 seconds** after the publish
step had printed `+ agency-rules@0.20.0`, while `/agency-rules/0.20.0` already
returned **200**. Reading the packument first produces a false "not published".

A cache-busting query string (`?t=$(date +%s)`) does not help: the delay is
server-side. The per-version document is the authority.

## Worked example — 0.20.0

| Check | Result |
| --- | --- |
| `GET /agency-rules/0.20.0` | `200` |
| shasum in the publish log | `434923e9b004b613ef001cb1255f7f5030ccc15f` |
| shasum in the registry | `434923e9b004b613ef001cb1255f7f5030ccc15f` |
| `dist-tags.latest` (after replication) | `0.20.0` |
| GitHub Release | `v0.20.0`, 2026-11-05T20:03:34Z |
| `npx agency-rules@0.20.0 convert --harness copilot` | 51 files |

## Verifying the package, not just its existence

The tarball can be checked without installing it:

```bash
curl -s -o pkg.tgz "https://registry.npmjs.org/agency-rules/-/agency-rules-${VERSION}.tgz"
tar -tzf pkg.tgz | grep -E 'renderers/|tools.json'
tar -xzf pkg.tgz package/package.json -O | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).version"
```

`tests/package-manifest.test.mjs` already fails the build when `bin/`,
`scripts/`, or `tools.json` would be missing from the packed file list, so a
tarball that installs and cannot run is caught before the release, not after.

## If a version is missing from the registry

1. Confirm with the per-version document — not the packument, not the badge.
2. Check the release run's jobs: a `publish-npm` job that is `skipped` is the
   known failure mode above.
3. Re-running the workflow is safe: the publish step exits 0 when the version is
   already there, and treats a `E409` conflict as success. It is deliberately
   idempotent so a re-run cannot corrupt a published version.
