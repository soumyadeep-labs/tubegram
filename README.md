# Tubegram

> Paste a YouTube or Instagram link. Preview it, choose MP4 or MP3, and save it where you want.

![Version](https://img.shields.io/badge/version-2.0.0-ff7a45)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What it does

- **Preview first** — title, thumbnail, duration, and the qualities the video actually offers.
- **Pick a format** — MP4 video or MP3 audio.
- **Choose the folder** — desktop Chrome and Edge use the File System Access API. Firefox, Safari, and mobile use the browser's normal download flow.
- **No server storage** — yt-dlp downloads into a temporary folder, the file streams to the browser, and the folder is deleted immediately.
- **Guard rails** — domain allowlist, per-IP rate limit, duration cap, and size cap.

Everything lives in one Next.js app. There is no separate frontend and backend to deploy.

## Requirements

| Tool | Why |
|---|---|
| Node.js **20.9+** | Runs the app |
| [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) **recent version** | Extracts the video |
| `ffmpeg` | Merges video + audio and converts to MP3 |

Install them on your machine:

```bash
# macOS (Homebrew)
brew install yt-dlp ffmpeg

# Ubuntu / Debian
sudo apt install ffmpeg
pipx install yt-dlp        # or: python3 -m pip install --user yt-dlp

# Windows
winget install yt-dlp.yt-dlp
winget install Gyan.FFmpeg
```

Make sure both commands work in the same terminal you use to start the app:

```bash
yt-dlp --version
ffmpeg -version
```

## Run locally

```bash
git clone https://github.com/soumyadeep-labs/tubegram.git
cd tubegram
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

That is the only supported way to run Tubegram yourself. The Dockerfile exists only so the public instance can be deployed on Render.

### Configuration

All settings are optional and live in `.env.local` (or the process environment).

| Variable | Default | Meaning |
|---|---|---|
| `ALLOWED_DOMAINS` | `youtube.com,youtu.be,instagram.com` | Comma-separated domain allowlist |
| `RATE_LIMIT_PER_MINUTE` | `10` | Requests per minute per IP |
| `MAX_VIDEO_DURATION_MINUTES` | `30` | Reject longer videos |
| `MAX_VIDEO_SIZE_MB` | `200` | Reject larger files |
| `DOWNLOAD_TIMEOUT_MS` | `600000` | Stop a stalled download |
| `YTDLP_PATH` | `yt-dlp` | Path to the yt-dlp binary |
| `FFMPEG_PATH` | *(system PATH)* | Optional ffmpeg binary path |
| `YTDLP_JS_RUNTIME` | `node` | JS runtime yt-dlp uses for YouTube challenges; set empty to disable |

### Commands

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # run the production build
npm test         # unit and route tests
```

## API

### `GET /api/health`

```json
{ "status": "ok", "version": "2.0.0", "timestamp": "2026-10-22T10:00:00.000Z" }
```

### `POST /api/info`

```json
{ "url": "https://www.youtube.com/watch?v=VIDEO_ID" }
```

Returns `title`, `thumbnail`, `durationSeconds`, `uploader`, `sourceUrl`, `filename`, and `qualities` (best plus the available heights).

### `GET /api/download?url=…&format=mp4|mp3&quality=best|360|720|1080`

Streams the finished file with an attachment filename. The temporary file is removed after the response closes.

## Deploy the public instance

Vercel cannot host this: serverless functions are too short-lived, have no room for the yt-dlp binary, and cap response size. Use **one Render Web Service** built from the included `Dockerfile`.

1. Push the repo to GitHub.
2. In Render, create a **Blueprint** from `render.yaml`, or a **Web Service** with runtime **Docker** and Dockerfile path `./Dockerfile`.
3. Set the environment variables from the table above. The defaults are already conservative for a public instance.
4. Health check path: `/api/health`.

The free Render instance sleeps when idle and has limited bandwidth. YouTube and Instagram often block cloud-provider IP addresses, and Instagram may require a logged-in session. Running locally from a home connection is more reliable.

The Dockerfile downloads the latest yt-dlp release at build time, so redeploy after yt-dlp updates if downloads start failing.

## Android app

The plan's Capacitor wrapper (M6) is not included in this release. It needs a deployed public URL to load and an Android signing key, neither of which belongs in the repository. The web app is mobile-friendly and works in a phone browser today.

## Legal

Tubegram is for content **you own or have permission to download**. Downloading from YouTube or Instagram violates their terms of service, and downloading copyrighted content without permission can be illegal. Tubegram hosts no videos and keeps no copies on the server. A public instance can be suspended or receive takedown notices.

## License

MIT — see [LICENSE](LICENSE).
