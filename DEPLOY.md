# Deploy to Vercel

## Production build

```bash
npm install
npm run build
```

The static web build is generated in `dist/`.

## Vercel settings

- Framework Preset: `Other`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## Deploy from Vercel dashboard

1. Create a new Vercel project.
2. Import the repository with this project.
3. Use the settings above.
4. Deploy.

## Deploy from CLI

```bash
npm install -g vercel
vercel
vercel --prod
```

`vercel.json` already contains the production build command, output directory, and SPA rewrite to `index.html`.
