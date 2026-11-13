---
name: api-versioning
description: Use when adding or changing versioning on a .NET HTTP API, to version the contract and avoid breaking existing clients.
trigger: model_decision
tags: [dotnet, api, versioning]
---

# API Versioning

- **Version the contract, not the endpoint name.** Use `Asp.Versioning` to version by URL path (`/v1/...`) or header, and pick one scheme for the whole API. Versioning by a route string that drifts is not versioning.
- **Additive changes do not bump the major version.** Adding a field, endpoint, or optional parameter is backward-compatible. A breaking change — removed field, changed type, renamed route — is a new major version.
- **Deprecate before you remove.** Mark the old version obsolete, emit sunset/deprecation headers, and give clients a migration window. Deleting a version out from under a client is a contract violation.
- **One version per release, documented.** A version without documentation or a changelog is a surprise. State what changed and how to migrate between versions.
- **Do not fork controllers for trivial changes.** A new version should differ in contract, not duplicate an entire surface for one field. Share logic and vary only the DTO/mapping.
- **Version the request and response DTOs.** A v1 and v2 of the same resource are different types. Reusing one DTO for both versions silently couples them.
