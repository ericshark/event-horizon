# Journey Through Space deployment

Production: https://journey-through-space.ericzwierzynski.dev

Vercel project `journey-through-space` in `Eric's projects` hosts the Vite frontend from
GitHub `ericshark/journey-through-space`, production branch `main`.
The architecture is Browser → Vercel static assets.

The custom domain is attached to the production environment. Cloudflare hosts
its DNS-only CNAME using the project-specific target returned by Vercel.
The previous hostname `event-horizon.ericzwierzynski.dev` stays attached to the
project and permanently (308) redirects to the production URL. The default
`event-horizon-six-lake.vercel.app` address remains available. No backend custom domain was added.
No application environment variables are configured in Vercel.

Push reviewed commits to `main`, check GitHub Actions when configured, and verify
the corresponding Vercel production deployment. Check Vercel's deployment logs
if a build fails. If no Git deployment appears, deploy the exact Git commit through
Vercel rather than assuming the push released it. Roll back through Vercel's
previous production deployment, then verify the production URL again.

Verified on November 16, 2026: DNS, HTTPS, and an HTTP 200 response at the
custom URL, and the old hostname redirecting to it. This setup uses the existing Vercel Hobby project and Cloudflare DNS; no
paid resources were added.

## Rename history

The project was renamed from Event Horizon to Journey Through Space
(`journey-through-space`) on November 16, 2026. The GitHub repository and Vercel
project were renamed in place (the Git link follows the repository ID, so
deployments from `main` continue). `journey-through-space.ericzwierzynski.dev`
was added with a DNS-only Cloudflare CNAME to the project's Vercel target, and the
old hostname's record was kept so existing links redirect.

The renamed application reached `main` on November 17, 2026 (commit `a4b69a7`)
and Vercel built and deployed that exact commit to production. Verified the same
day: the new hostname resolves through Cloudflare to the project's Vercel target
on public resolvers, serves HTTPS 200 with a valid Let's Encrypt certificate and
the title "Journey Through Space", loads in a browser with no console or network
errors on desktop and mobile, and the old hostname answers 308 to the new one.

Static assets now include 8K texture maps (about 38 MB), fetched only on the
high quality tier for the world being observed. No paid resources were added.
