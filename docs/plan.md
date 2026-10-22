# Tubegram: project plan
## 1. Goal
Tubegram is an open-source web app. A user pastes an Instagram or YouTube URL and the video downloads to their device, into a folder they choose. It runs as a public hosted instance (Vercel + Render) and can also be self-hosted by anyone with one command.

## 2. Versions
- **v1:** Paste a URL, get the video as MP4 (best single-file quality). User chooses the save location.
- **v1.5:** Preview card (thumbnail, title, duration) with quality choice (e.g. 360p/720p/1080p) and format choice (MP4 or MP3).
- **v2:** Android APK wrapping the same web app.

## 3. Stack decisions
| Part | Choice | Why |
|---|---|---|
| Download engine | `yt-dlp` | Open source, already supports YouTube and Instagram. We never write our own scraper; those break constantly. |
| Backend | Node.js + Express in Docker, hosted on Render | Vercel serverless has short time limits and can't hold yt-dlp/ffmpeg binaries. Render runs a Docker container with both installed. Same language as the frontend. |
| Frontend | React + Vite, hosted on Vercel | Plain React, minimal packages, no Redux (`useState` is enough). |
| Server storage | None | The backend streams the video from yt-dlp straight to the browser. No files saved, no cleanup, no storage cost. |
| APK (v2) | Capacitor | Wraps the existing React app with minimal rewriting. |

**Save-folder behaviour**
- Desktop Chrome/Edge: folder picker (File System Access API), app writes the file there.
- Firefox/Safari: normal download plus a tip to enable "Ask where to save each file".
- Mobile web: browser default download.
- APK (v2): Android native save dialog via Capacitor filesystem plugin.

## 4. Architecture
Browser (React on Vercel)
    | 1. POST /api/info  (url)        -> title, thumbnail, formats   [v1.5]
    | 2. GET  /api/download?url=...   -> video stream

Backend (Node/Express in Docker on Render)
    '-- runs yt-dlp (+ ffmpeg for merge/MP3) -> pipes output back

## 5. API
| Endpoint | Purpose | Version |
|---|---|---|
| `GET /api/health` | Uptime check | v1 |
| `GET /api/download?url=` | Validate URL, stream MP4 with filename header | v1 |
| `POST /api/info` | Title, thumbnail, duration, available qualities | v1.5 |
| `GET /api/download?url=&quality=&format=` | Same endpoint with options (mp4/mp3) | v1.5 |

**Rules for every endpoint**
- Domain allowlist only (youtube.com, youtu.be, instagram.com).
- Rate limit per IP (stricter on the public instance, configurable by env var).
- Max video length and size caps (configurable by env var).
- Never build shell commands from user input; pass arguments as a list.

## 6. Public instance and self-hosting (both are first-class)

**Public instance (Vercel + Render)**
- Because it's open to anyone, abuse protection is part of v1, not later: rate limiting, length/size caps, domain allowlist, and a basic bot check (e.g. Cloudflare Turnstile) if abuse shows up.
- Free Render tier sleeps when idle and has bandwidth limits, so the README should say the public instance may be slow or limited.

**Self-hosting**
- `docker-compose.yml` that starts frontend and backend with one command.
- A "Deploy to Render" path and a "Deploy to Vercel" path documented step by step.
- All limits and settings come from environment variables, with a `.env.example` file.
- `docs/SELF_HOSTING.md` explaining that running at home or on a personal server avoids most of the IP-blocking problems cloud hosts face.

## 7. Repo structure
/frontend            React + Vite app
/backend             Express server + Dockerfile
/docs                SELF_HOSTING.md, CONTRIBUTING.md
docker-compose.yml   one-command self-hosting
.env.example
README.md, LICENSE (MIT)

## 8. Milestones
**M0: Setup.** Monorepo, GitHub repo named `tubegram`, MIT license, README with legal disclaimer. *Done when:* both apps run locally.

**M1: Backend v1.** Dockerfile with yt-dlp, health and download endpoints, domain allowlist, rate limiting, size/length caps. *Done when:* curl with a YouTube and an Instagram URL returns a playable MP4.

**M2: Frontend v1.** URL input, Download button, loading and error states, folder picker with fallback. *Done when:* a pasted link ends with a file saved in the chosen folder.

**M3: Deploy v1.** Backend on Render (Docker), frontend on Vercel, env vars for API URL and CORS. *Done when:* the public URL works end to end.

**M3.5: Self-host path.** docker-compose, `.env.example`, `SELF_HOSTING.md`. *Done when:* a fresh machine runs `docker compose up` and the app works.

**M4: v1.5.** Info endpoint, preview card, quality and format selectors, ffmpeg for MP3 and video+audio merging. *Done when:* the user can pick 720p MP4 or MP3 and get the right file.

**M5: Hardening.** Auto-update yt-dlp on each deploy, clear errors for private/deleted videos, basic tests, CI.

**M6 (v2): APK.** Capacitor wrapper, native save dialog, signed APK in GitHub Releases.