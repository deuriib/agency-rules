---
name: central-package-management
description: Use when adding, upgrading, or pinning NuGet dependencies, to declare versions once and force patched transitive versions.
globs:
  - "**/Directory.Packages.props"
tags: [dotnet, nuget, dependencies]
---

# Central Package Management

- **Enable CPM.** Set `<ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>` in `Directory.Packages.props` so versions are declared once, not per project.
- **One version per package.** Declare every NuGet version only in `Directory.Packages.props`; project files list packages without a `Version` attribute. A second declaration is a drift waiting to happen.
- **`VersionOverride` is an exception, not a habit.** Use it for a single-project pin when there is no alternative, and comment why. Review overrides regularly — they defeat central control.
- **`GlobalPackageReference` for analyzers everywhere.** Reference analyzers consumed by every project as a global package reference so they are not repeated per project.
- **Pin transitive dependencies.** Enable `CentralPackageTransitivePinningEnabled` to force patched versions of vulnerable transitive dependencies rather than accepting what the direct package pulls in.
- **Upgrade deliberately.** Changing a version is a single edit in `Directory.Packages.props` that affects the whole solution — review the diff and run the build and tests before merging.
