# CEF Viewer

Browser-based viewer for **Common Event Format (CEF)** strings. Paste or edit an event on the **Event message** line; **Parsed fields** shows the header, extensions, and dictionary-backed notes. Everything runs **locally** in your browser (no requests for your log data).

Branding uses `public/icon.png` for the in-app header, favicon, Apple touch icon, web app manifest, and social preview meta tags.

## Disclaimer

This project was largely **vibe-coded with AI assistance**. Your CEF text and parsed results stay **in the browser**: **no log data is sent to any remote server** for parsing or viewing when you use the built app offline or locally. (Installing packages or opening external links during development still uses the network as usual.)

## Requirements

- [Bun](https://bun.sh/)

## Setup & dev

```bash
bun install
bun run dev
```

App defaults to [http://localhost:3000](http://localhost:3000).

## Production build

```bash
bun run build
bun run preview
```

## Tests

```bash
bun run test
```

## Lint & format

```bash
bun run lint
bun run format
bun run check
```

## Stack

- [TanStack Start](https://tanstack.com/start) / [TanStack Router](https://tanstack.com/router) — routing and SSR shell
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/) v4 — `src/styles.css`
- [Biome](https://biomejs.dev/) — lint & format
- [Vitest](https://vitest.dev/) — tests

Parser and display logic live under `src/lib/`; extension metadata is in `src/data/extension-dictionary.json`.
