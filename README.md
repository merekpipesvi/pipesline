# pipesline

Static marketing site for Pipesline (Merek Pipes: AI consulting). No build step.

- `config.js`: `EMAIL` / `BOOK_URL`, shared by every page
- `index.html`: content
- `styles.css`: styles
- `main.js`: scroll-driven pipe and terminal
- `about.html` / `about.css` / `about.js`: the about page (`/about`, deep-linkable as `/about#work` etc.); prints as a resume
- `img/`: headshot

Local preview: `python -m http.server` then open http://localhost:8000.
Deploys to Vercel on every push to `main`.
