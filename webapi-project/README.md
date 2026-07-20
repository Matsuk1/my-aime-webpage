# My Aime 临时查分

Cloudflare Pages project with a static page and Pages Functions. The page accepts a
20-digit Aime access code, temporarily binds it to the first empty My Aime slot,
and then generates a JP maimai score image through JiETNG.

The frontend is installable as a PWA and includes client-side OCR for scanning
the printed Aime access code from a camera/photo. OCR runs in the browser; the
selected image is not uploaded to the server.

## Run

```bash
npm install
npm run dev
```

Then open the local URL printed by Wrangler. The dev command builds the Vite
frontend into `dist` before starting Pages Functions.

## Environment

For local development, create `.dev.vars`:

```env
SEGA_ID=your-sega-id
SEGA_PASSWORD=your-sega-password
SESSION_SECRET=change-this-to-a-long-random-string
```

For multiple SEGA accounts, use `SEGA_ACCOUNTS` instead. Each account adds up
to three My Aime slots to the pool:

```env
SEGA_ACCOUNTS=[{"id":"sega-id-1","password":"password-1"},{"id":"sega-id-2","password":"password-2"}]
SESSION_SECRET=change-this-to-a-long-random-string
```

For Cloudflare Pages production, add these environment variables in the Pages project settings:

```text
SEGA_ACCOUNTS
SESSION_SECRET
```

`SEGA_ID` and `SEGA_PASSWORD` are still supported for single-account deployments
when `SEGA_ACCOUNTS` is not set.

The page calls `GET /api/my-aime/status` on load to check whether a slot is
available across the SEGA account pool or when the next temporary slot becomes
replaceable. The browser caches this availability result for 60 seconds so
simple refreshes do not keep logging in to SEGA. When the status check does run,
it removes timestamp-named temporary cards older than 5 minutes.

The page calls `POST /api/my-aime/score` to log in server-side, reuse an
already-bound card when possible, bind the new card to an empty slot on the
first available account, or replace the oldest timestamp-named card only when
that account is full and that card is older than 5 minutes. New temporary cards
use the current millisecond timestamp as the alias. The function then calls
JiETNG with `ver=jp`, the selected account credentials, and the bound Aime slot,
then returns the generated PNG.

`POST /api/my-aime/bind` is still kept for compatibility with the earlier JSON
binding flow.

## GitHub Actions Deploy

The repository includes `.github/workflows/deploy-pages.yml`. It deploys this
project to Cloudflare Pages when `main` is pushed, using:

```bash
npm ci
npm run build
wrangler pages deploy dist --project-name=my-aime-webpage
```

Configure these GitHub repository secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

Configure these Cloudflare Pages environment variables for production:

```text
SEGA_ACCOUNTS
SESSION_SECRET
```

The Cloudflare API token needs permission to deploy Pages/Workers for the target
account. The SEGA credentials should be set in Cloudflare Pages, not in GitHub
Actions, because Pages Functions read them at runtime.
