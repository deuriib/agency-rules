---
name: aspnet-auth
description: Use when configuring OpenID Connect, JWT, or authorization in a .NET app, to enforce PKCE, verify per-resource permissions, and require MFA where it matters.
trigger: model_decision
tags: [dotnet, aspnet-core, auth, oidc, jwt]
---

# ASP.NET Core Authentication and Authorization

The security principles — least privilege, session hygiene, deny by default —
live in `identity-and-data`, `web-hardening`, and `trust-boundaries`. This rule
covers the .NET wiring.

- **OIDC with PKCE and authorization code.** Configure `AddOpenIdConnect` with `UsePkce = true` and `ResponseType = "code"`. Set `MapInboundClaims = false` to preserve the provider's original claims instead of renaming them, so your policies match what Entra ID or Auth0 actually issues.
- **JWT Bearer for APIs.** Use `AddAuthentication().AddJwtBearer(...)` and authorize with policies. Apply a fallback policy so unauthenticated is the default and every endpoint must opt out explicitly — deny by default.
- **Authorize per resource, not just per login.** Being authenticated is not permission. Verify the user can act on the specific resource requested (ownership, role, scope), in the handler or the query, not only at the route.
- **MFA for critical paths.** Enforce multi-factor auth through the identity provider (`acr_values`) or a custom `IAuthorizationRequirement` for privileged routes. A password alone is not enough for admin or money-moving operations.
- **No secrets or tokens in config or logs.** Keep signing keys and client secrets in the secret store, and never log access or refresh tokens. A token in a log is a live credential.
