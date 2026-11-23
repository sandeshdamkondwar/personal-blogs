# Sandesh's portfolio & field notes

A static personal website deployed through the existing Vercel project.

## Development

- `npm ci`
- `npm run build`
- `npm run preview`

Vercel runs `npm ci`, builds with `npm run build`, and serves `dist/`. The deployment settings are in `vercel.json`. Local preview requires Python 3 and serves the build at http://localhost:4173.

Edit the portfolio in `website/index.html`, styles in `website/style.css`, and interactions in `website/app.js`. Existing blog Markdown remains in `content/posts/`; the build renders matching posts from Markdown. The imported availability article lives in `website/posts.json`. Articles are available in the homepage reader and at their existing URLs.
