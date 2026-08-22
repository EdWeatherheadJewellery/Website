# Your Jewellery Business — website

React + Vite scaffold. Built to run locally and deploy to your existing hosting.

## Running it locally

```
npm install
npm run dev
```

Then open the local URL it prints (usually http://localhost:5173).

## Building for deployment

```
npm run build
```

This outputs a static `dist/` folder — upload its contents to your hosting
company as you would any static site. If your host needs a different
build target (e.g. a Node server), let me know and we can adjust.

## What's here

- `src/data/products.js` — **the file you'll edit most.** One array, one
  object per product. Add a product by copying an existing entry and giving
  it a unique `name`. Retire a product to the "Older Work" page by setting
  `archived: true` — nothing else needs to change.
- `public/photos/` — drop product photos here. Naming convention is in
  `public/photos/README.txt`.
- `src/components/SparkleBackground.jsx` — your old sparkle effect, ported
  to React. Same visual behaviour (mouse-triggered on desktop,
  device-orientation-triggered on mobile), still generated fresh on every
  load.
- `src/pages/` — Home, Shop, Older Work (archive), About, Custom & Contact.
- `src/styles/tokens.css` — all colors, type, and spacing in one place.
  Change a value here to restyle the whole site.

## Known placeholders — replace before launch

- **Logo**: `Navbar.jsx` currently shows the business name as text. Add
  your logo file to `public/` and swap in an `<img>` tag.
- **Hero photo**: `Hero.jsx` has a placeholder box where a real photo
  should go.
- **About page copy**: currently placeholder text.
- **Contact form**: currently just shows a success message on submit — it
  isn't wired to actually send anywhere yet. Easiest options: Formspree or
  Netlify Forms (a few lines to add), or a custom backend if you want one.
- **Prices**: every product currently has a placeholder price of $50 —
  update in `products.js` once real prices are set.
- **Domain / favicon / meta tags**: `index.html` has a generic title —
  update once the domain is live.

## Not yet built (flagged for a later pass)

- E-commerce / checkout — you mentioned this is likely down the line. The
  data structure (price, sold flag) is ready for it, but no cart or
  payment flow exists yet.
- A CMS — right now editing `products.js` by hand is "quick and easy" for
  a developer, but if non-technical editing matters later, a headless CMS
  (e.g. Sanity, Contentful) could sit in front of this same data shape.
