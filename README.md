# Bubble Contact (GitHub Pages)

This is a browser-friendly wrapper for the Bubble Contact Electron UI.

## Run locally
- Open `index.html` with a local web server (recommended).
  - Example: VS Code “Live Server”, or `python -m http.server` from this folder.

## Deploy to GitHub Pages
- Create a repo (or use an existing one)
- Put these files at the repo root (or in `/docs`)
- In GitHub: **Settings → Pages**
  - Source: `Deploy from a branch`
  - Branch: `main`
  - Folder: `/ (root)` (or `/docs` if you used that)

Notes:
- Data saves to the browser via `localStorage` (same as Electron storage logic here).
