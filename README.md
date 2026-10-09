# Sandesh's portfolio & field notes

A static personal website deployed through the existing Vercel project.

## Development

- `npm ci`
- `npm run build`
- `npm run preview`

Vercel builds with `npm run build` and serves `dist/`.

Edit the portfolio in `website/index.html`, styles in `website/style.css`, and interactions in `website/app.js`. Existing blog Markdown remains in `content/posts/`; the build renders matching posts from Markdown. The imported availability article lives in `website/posts.json`. Articles are available in the homepage reader and at their existing URLs.

The previous Hugo configuration and theme remain in the repository as reference; deployment uses the static build above.
