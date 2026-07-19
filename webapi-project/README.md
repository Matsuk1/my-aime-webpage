# My Aime 临时查分

Cloudflare Pages project with a static page and Pages Functions. The page accepts a
20-digit Aime access code, temporarily binds it to the first empty My Aime slot,
and then generates a JP maimai score image through JiETNG.

## Run

```bash
npm install
npm run dev
```

Then open the local URL printed by Wrangler.

## Environment

For local development, create `.dev.vars`:

```env
SEGA_ID=your-sega-id
SEGA_PASSWORD=your-sega-password
SESSION_SECRET=change-this-to-a-long-random-string
```

For Cloudflare Pages production, add these environment variables in the Pages project settings:

```text
SEGA_ID
SEGA_PASSWORD
SESSION_SECRET
```

The page calls `POST /api/my-aime/score`. The function logs in server-side,
removes timestamp-named cards older than 5 minutes, binds the new card with the
current millisecond timestamp as its alias, calls JiETNG with `ver=jp` and the
bound Aime slot, returns the generated PNG, and sets an encrypted HttpOnly
session cookie that expires after 5 minutes.

`POST /api/my-aime/bind` is still kept for compatibility with the earlier JSON
binding flow.

## GitHub Actions Deploy

The repository includes `.github/workflows/deploy-pages.yml`. It deploys this
project to Cloudflare Pages when `main` is pushed, using:

```bash
wrangler pages deploy public --project-name=my-aime-webpage
```

Configure these GitHub repository secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

Configure these Cloudflare Pages environment variables for production:

```text
SEGA_ID
SEGA_PASSWORD
SESSION_SECRET
```

The Cloudflare API token needs permission to deploy Pages/Workers for the target
account. The SEGA credentials should be set in Cloudflare Pages, not in GitHub
Actions, because Pages Functions read them at runtime.
