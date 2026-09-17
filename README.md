# Naga — Backend Engineering Logbook

A lightweight personal blog + portfolio built with [Astro](https://astro.build).
Ships **zero JavaScript** by default (except a tiny theme toggle), so it's fast
and free to host anywhere. Each blog post is a Markdown file that becomes its own
page automatically.

## Quick start

```bash
npm install
npm run dev      # http://localhost:4321
```

```bash
npm run build    # outputs a static site to ./dist
npm run preview  # preview the production build locally
```

## How it's laid out

```
src/
├── content/blog/        ← your posts (one .md file = one page)
├── data/site.ts         ← your name, bio, projects, stack, links
├── pages/
│   ├── index.astro      ← the homepage
│   └── blog/[...slug].astro  ← the template every post uses
├── layouts/BaseLayout.astro
├── components/Header.astro
└── styles/global.css    ← all the design (colours, fonts, spacing)
```

## Make it yours

**1. Your details** — edit `src/data/site.ts`: name, role, bio, the "currently"
line, projects, stack chips, and your GitHub / LinkedIn / email links.

**2. Add a post** — drop a new file in `src/content/blog/`, e.g.
`my-post.md`, with this frontmatter:

```markdown
---
title: Your post title
dek: One-line summary shown under the title and in the list.
date: 2026-05-01
readTime: 6 min read
tags: ["Kafka", "Debugging"]
draft: false        # set true to hide it while you write
---

Your post body in Markdown. Code blocks get highlighted automatically:

​```java
System.out.println("hello");
​```
```

The file name becomes the URL (`my-post.md` → `/blog/my-post`). Posts are
sorted newest-first on the homepage.

**3. Restyle** — colours and fonts live as CSS variables at the top of
`src/styles/global.css`. Change `--accent` to reskin the whole site.

## Deploy for free

Run `npm run build` first — the site is fully static, so any of these free tiers
work with no server and no cost:

### GitHub Pages (recommended — free forever, no card)
This project is **already set up** for GitHub Pages via `.github/workflows/deploy.yml`.
To go live:

1. Create a **public** repo on GitHub named exactly `chaitu518.github.io`.
2. Push this project to it:
   ```bash
   git init
   git add .
   git commit -m "my blog"
   git branch -M main
   git remote add origin https://github.com/chaitu518/chaitu518.github.io.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Done. Every push auto-builds and publishes to **https://chaitu518.github.io**.

Using a different repo name? Then your site lives at
`https://chaitu518.github.io/REPO_NAME`, so add `base: '/REPO_NAME'` in
`astro.config.mjs`.

### Netlify / Vercel / Cloudflare Pages (alternative)
1. Push this folder to a GitHub repo.
2. "Import" the repo in the dashboard.
3. Build command: `npm run build` · Publish directory: `dist`
4. You get a URL and automatic redeploys on every push.

Cloudflare Pages is the pick if you want a **private** repo + unlimited bandwidth.

## Notes
- The RSS link in the footer is a placeholder. To make it real, add
  `@astrojs/rss` and an `src/pages/rss.xml.js` route (Astro has a short guide).
- No database, no CMS, no tracking — just Markdown files and static HTML.
"# naga-blog" 
