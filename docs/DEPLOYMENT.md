# Journey Through Space deployment

Production: https://event-horizon.ericzwierzynski.dev

Vercel project `event-horizon` in `Eric's projects` hosts the Vite frontend from
GitHub `ericshark/event-horizon`, production branch `main`.
The architecture is Browser → Vercel static assets.

The custom domain is attached to the production environment. Cloudflare hosts
its DNS-only CNAME using the project-specific target returned by Vercel.
Existing Vercel addresses remain available. No backend custom domain was added.
No application environment variables are configured in Vercel.

Push reviewed commits to `main`, check GitHub Actions when configured, and verify
the corresponding Vercel production deployment. Check Vercel's deployment logs
if a build fails. If no Git deployment appears, deploy the exact Git commit through
Vercel rather than assuming the push released it. Roll back through Vercel's
previous production deployment, then verify the production URL again.

Verified on November 16, 2026: DNS, HTTPS, and an HTTP 200 response at the custom
URL. This setup uses the existing Vercel Hobby project and Cloudflare DNS; no
paid resources were added.

## Rename coordination

The local application is now named Journey Through Space (`journey-through-space`).
The user will rename the GitHub repository, Vercel project, and custom domain
later; no remote rename, push, DNS mutation, or production release was performed
by the interface implementation. The hosting configuration above remains the
last verified setup. The intended future hostname is
`journey-through-space.ericzwierzynski.dev`; its availability and HTTPS have not
been established by this work. Preserve the existing domain until its migration
behavior is explicitly chosen.
