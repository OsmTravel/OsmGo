# Security policy

## Supported versions

Security fixes are provided for the latest release available from Google Play, GitHub Releases, and `https://osmgo.com`.

Older releases are not maintained. Builds from `develop` at `https://dev.osmgo.com` are previews for testing and should not be treated as supported releases.

## Report a vulnerability privately

Do not open a public issue with exploit details, credentials, tokens, private map data, or a proof of concept.

Use **Security and quality → Report a vulnerability** in this GitHub repository. If private vulnerability reporting is unavailable, open a minimal public issue asking the maintainer for a private contact method without including security details.

Include, when possible:

- the affected version or commit;
- the platform and installation source;
- the security impact and who can trigger it;
- minimal reproduction steps using test data;
- whether downloaded or pending OSM edits remain safe;
- a suggested mitigation, if known.

Do not include real OAuth tokens, signing material, passwords, or unnecessary personal location data. Revoke any credential that may already be exposed.

The maintainers will assess the report, reproduce it in a safe environment, and coordinate a fix and disclosure when appropriate. Response times depend on maintainer availability; no fixed service-level agreement is offered.

## Safe security testing

- Do not write test data to the production OpenStreetMap API. Use the OSM development server or local fixtures.
- Do not access, modify, or delete another person's data.
- Do not disrupt `osmgo.com`, Cloudflare, GitHub Actions, or OpenStreetMap services.
- Stop testing and report privately if pending edits, credentials, signing keys, or user data could be exposed or lost.

## Dependency audits

`npm audit --omit=dev` is the release gate. High or critical production dependency advisories must be fixed before a release.

The full development audit currently reports critical advisories in `request` and `form-data` through `spritesmith`. This dependency is used only by the local sprite generator, receives repository-controlled PNG file paths, and is not included in the application. Do not pass URLs or untrusted files to the sprite generator. Replace this dependency when a maintained alternative fits the existing simple pipeline.

Review the full audit regularly. Any new high or critical advisory must either be fixed or documented here with its exact scope and mitigation.

## Maintainer handling

For a confirmed vulnerability:

1. keep exploit details and fixes private until users have a safe upgrade path;
2. add a focused regression test without real secrets or production OSM writes;
3. rotate exposed credentials and verify Android signing identity when relevant;
4. run the normal web, Android, and production dependency checks for the affected path;
5. publish a patch release and security advisory with clear upgrade guidance;
6. merge the fix back to `develop` and monitor new reports.
