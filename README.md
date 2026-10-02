# Service status

The status page of the service, served by GitHub Pages from the `main` branch.

**Do not edit `main` by hand.** It is published, whole, by the application
(`php artisan status:publish`, and on every change in the admin panel), and the next
publish replaces anything changed here. The source lives in the application's
repository: `resources/views/status/`, `resources/status/repo/`, `config/status.php`
(→ docs/DECISIONS.md D-73).

## The checker

`.github/workflows/check.yml` runs `check.mjs` every five minutes. It requests every URL
in `components.json`, and commits what it saw to `checks.json` on the **`checks`**
branch — a branch of its own, so it never races the application's publishes and never
triggers a Pages build. The page reads it in the browser from
`raw.githubusercontent.com`.

## When the application itself is down

The page still loads (it is static, and hosted here), and the checker still reports the
outage. To write an incident while the admin panel is unreachable, edit nothing here:
post on the status page after recovery, with the real start and end times.

## Setup, once

1. Settings → Pages → Build and deployment: **Deploy from a branch**, `main`, `/ (root)`.
2. Custom domain: the host in `CNAME`; DNS: a `CNAME` record from it to
   `<owner>.github.io`. Tick **Enforce HTTPS** once the certificate is issued.
3. Nothing to change for the checker's permission: its workflow asks for `contents: write`
   itself, which works even where the organisation's default is read-only.
