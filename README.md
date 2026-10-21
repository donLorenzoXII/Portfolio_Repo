# Lorenzo Reimann — Portfolio

React + TypeScript (Vite) site with a small built-in CMS. Hosted on Hostpoint at **lorenzo-reimann.com** (Apache + PHP).

```bash
npm install
npm run dev        # http://localhost:5173 — shows the live site's content
npm run deploy     # build + upload to Hostpoint (asks for your FTP login)
```

## Folders

| Folder | What's in it |
| --- | --- |
| `src/content/` | Default texts, projects, contact. The CMS overrides these once you save. |
| `src/components/` | Site sections (`sections/`), layout (nav, cursor, transitions), small UI parts |
| `src/admin/` | The CMS screens (`/login`, `/admin`). Loaded only when someone opens them. |
| `public/api/index.php` | The CMS server: sign-in, content, uploads. A single PHP file. |
| `public/.htaccess` | HTTPS, security headers, routing |
| `public/media/` | Built-in images and videos (placeholders, see below) |
| `scripts/` | `deploy.mjs` (upload) · `optimize-images.mjs` (hero photo) |
| `assets/`, `references/` | Your source photo and design references. Not uploaded. |

## CMS

Sign in at **lorenzo-reimann.com/login** (also in the menu). There you can edit projects (wheel cards, teaser videos, project pages and galleries), About & Skills, Contact and General texts. Changes go live when you press **Save** (⌘S). The last 10 versions are kept as backups.

On the server:

- **`cms-data/`** sits one level *above* the website folder. It holds the password hash, content, backups, sessions and the login rate-limit. It is created automatically and can't be reached from the web.
- **`uploads/`** sits inside the website folder and holds your uploaded images and videos. The deploy never deletes it.

Change the CMS password:

```bash
npm run deploy -- --password
```

Editing only works on the live site. During `npm run dev` the CMS screens load, but saving is refused by design.

## Security

- **Connection:** HTTPS only, with HSTS. A strict Content-Security-Policy, X-Frame-Options, nosniff, Referrer-Policy and Permissions-Policy are set in `public/.htaccess`.
- **Passwords:** stored only as a bcrypt/argon2 hash, never in the code or the repository.
- **Sessions:** httpOnly, `Secure`, `SameSite=Strict` cookies that expire after 12 hours.
- **Sign-in:** after 8 failed attempts, an IP is blocked for 15 minutes.
- **Cross-site requests:** every change must carry a custom header from the same origin, so other sites can't send changes.
- **Content checks:** the server only accepts known sections. Links must be `https://`, and media paths must point to `/uploads/` or `/media/`.
- **Uploads:** the file type is checked from the file's content. Files get random names, and nothing in `uploads/` can ever be executed.
- **Deploy:** FTPS only (encrypted). The first password is set with a one-time code that expires after 10 minutes. No login is ever saved on disk.

## Deploying

Before the first deploy, in the Hostpoint control panel:

1. Point **lorenzo-reimann.com** to a website folder and note its path.
2. Set PHP to **8.1 or newer** for that domain.
3. Turn on the free **SSL certificate** (Let's Encrypt).

Then run `npm run deploy`. It asks for the FTP server, username and password, plus the web folder, and stores none of them. It uploads the site over FTPS and removes outdated build files. On the very first deploy it also asks you to choose the CMS username and password.

## Your photo

Replace `assets/My foto.png`, then run `npm run optimize:images`. That rebuilds the responsive versions and the silhouette mask used by the outlined name.

## Placeholders still to replace

The project images and videos and the showreel in `public/media/` are placeholders, and so are the texts marked `TODO` in `src/content/`. The easiest way to replace them is in the CMS.
