# Tubegram

> Paste a YouTube or Instagram link. Preview it, choose MP4 or MP3, and save it where you want.

![Version](https://img.shields.io/badge/version-2.1.0-ff7a45)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What it does

- **Preview first** — title, thumbnail, duration, and the qualities the video actually offers.
- **Pick a format** — MP4 video or MP3 audio.
- **Choose the folder** — desktop Chrome and Edge use the File System Access API. Firefox, Safari, and mobile use the browser's normal download flow.
- **No server storage** — yt-dlp downloads into a temporary folder, the file streams to the browser, and the folder is deleted immediately.
- **Guard rails** — domain allowlist, per-IP rate limit, duration cap, and size cap.

Everything lives in one Next.js app. `npm install` also installs the download engine, ffmpeg, and ffprobe for the current operating system.

## Requirements

| Tool | Why |
|---|---|
| Node.js **20.9+** | Runs the app and installs everything else |

That is the whole list. There is no Docker, no Python, and no manual yt-dlp or ffmpeg setup.

During install:

- `scripts/install-tools.js` downloads a self-contained **yt-dlp** binary into `.tools/`.
- The `ffmpeg-static` package downloads a static **ffmpeg** binary for your OS.
- The `@ffprobe-installer/ffprobe` package provides **ffprobe** for MP3 conversion and format checks.

The first install downloads roughly 190 MB. All three tools work on Linux, macOS, and Windows.

If npm lifecycle scripts are disabled in your environment, install yt-dlp, ffmpeg, and ffprobe yourself and set `YTDLP_PATH`, `FFMPEG_PATH`, and `FFPROBE_PATH`.

## Run locally

```bash
git clone https://github.com/soumyadeep-labs/tubegram.git
cd tubegram
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

The same commands work on Linux, macOS, and Windows. To run a production build:

```bash
npm ci
npm run build
npm start
```

Set `PORT` if you need a port other than `3000`.

### Configuration

All settings are optional and live in `.env.local` (or the process environment).

| Variable | Default | Meaning |
|---|---|---|
| `ALLOWED_DOMAINS` | `youtube.com,youtu.be,instagram.com` | Comma-separated domain allowlist |
| `RATE_LIMIT_PER_MINUTE` | `10` | Requests per minute per IP |
| `MAX_VIDEO_DURATION_MINUTES` | `30` | Reject longer videos |
| `MAX_VIDEO_SIZE_MB` | `200` | Reject larger files |
| `DOWNLOAD_TIMEOUT_MS` | `600000` | Stop a stalled download |
| `YTDLP_PATH` | `.tools/yt-dlp`, then PATH | Override the yt-dlp binary |
| `FFMPEG_PATH` | `ffmpeg-static`, then PATH | Override the ffmpeg binary |
| `FFPROBE_PATH` | `@ffprobe-installer`, then PATH | Override the ffprobe binary |
| `YTDLP_SKIP_DOWNLOAD` | `0` | Install-time only; set to `1` in your shell to skip the automatic yt-dlp download |
| `YTDLP_JS_RUNTIME` | `node` | JS runtime yt-dlp uses for YouTube challenges; set empty to disable |

### Commands

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # run the production build
npm test             # unit and route tests
npm run tools:update # download the latest yt-dlp now
```

## API

### `GET /api/health`

```json
{ "status": "ok", "version": "2.1.0", "timestamp": "2026-10-22T10:00:00.000Z" }
```

### `POST /api/info`

```json
{ "url": "https://www.youtube.com/watch?v=VIDEO_ID" }
```

Returns `title`, `thumbnail`, `durationSeconds`, `uploader`, `sourceUrl`, `filename`, and `qualities` (best plus the available heights).

### `GET /api/download?url=…&format=mp4|mp3&quality=best|360|720|1080`

Streams the finished file with an attachment filename. The temporary file is removed after the response closes.

## Deploy on Render

Vercel cannot host this: serverless functions are too short-lived, have no room for the yt-dlp binary, and cap response size. Render's **native Node runtime** works without Docker.

1. Push the repo to GitHub.
2. In Render, create a **Blueprint** from `render.yaml`, or a **Web Service** with:
   - **Runtime:** Node
   - **Build command:** `npm ci && npm run build`
   - **Start command:** `npm start`
3. Set the environment variables from the table above. The defaults are already conservative for a public instance.
4. Health check path: `/api/health`.

Every Render build runs `npm ci`, which downloads the latest yt-dlp release. If a deploy starts failing because YouTube changed something, redeploy and the new yt-dlp comes with it.

The free Render instance sleeps when idle and has limited bandwidth. YouTube and Instagram often block cloud-provider IP addresses, and Instagram may require a logged-in session. Running locally from a home connection is more reliable.

## Host it anywhere

Any machine or Node host can run it:

```bash
npm ci
npm run build
PORT=3000 npm start
```

There is no database, no persistent storage, and no container. The temp download folder is cleaned up after each request.

## Android app

The plan's Capacitor wrapper (M6) is not included in this release. It needs a deployed public URL to load and an Android signing key, neither of which belongs in the repository. The web app is mobile-friendly and works in a phone browser today.

## Legal

Tubegram is for content **you own or have permission to download**. Downloading from YouTube or Instagram violates their terms of service, and downloading copyrighted content without permission can be illegal. Tubegram hosts no videos and keeps no copies on the server. A public instance can be suspended or receive takedown notices.

## License

MIT — see [LICENSE](LICENSE).
