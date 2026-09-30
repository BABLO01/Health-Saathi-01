# Health Saathi

A plain-local, GitHub Pages-ready, offline-first personal health tracking PWA.

## Run locally

Because service workers require a secure origin, use any local static server from this folder, for example:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173` in a browser. The app can also be opened directly for basic UI use, but offline/PWA installation requires HTTPS or localhost.

## Publish on GitHub Pages

1. Create or open your GitHub repository.
2. Copy the contents of this folder into the repository root (or the chosen Pages directory).
3. Commit and push the files.
4. Enable GitHub Pages from the repository's Pages settings.
5. Open the HTTPS Pages URL on Android Chrome and use Settings → Install Health Saathi when supported.

All health data stays in the browser's local storage/IndexedDB. This project does not use a server, login, phone number, external images, or an AI health assistant.

See `HEALTH_SAATHI_CONTINUE.txt` for the development plan and continuation rules.
