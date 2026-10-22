# Tubegram: project plan (v2 of the plan, single Next.js app)

## 1. Goal
Tubegram is an open-source web app. A user pastes an Instagram or YouTube URL and the video downloads to their device, into a folder they choose. One Next.js app holds both the pages and the server code. There is no self-hosting support: anyone who wants to run it on their own PC clones the repo and runs it locally.

## 2. Versions
- **v1:** Paste a URL, get the video as MP4 (best single-file quality). User chooses where to save it.
- **v1.5:** Preview card (thumbnail, title, duration) with quality choice (360p/720p/1080p) and format choice (MP4 or MP3).
- **v2:** Android APK (see section 6 for how it depends on the hosted site).

## 3. Stack

| Part | Choice | Why |
|---|---|---|
| App | Next.js (App Router), one project | Pages and API routes in one place. One `npm install`, one lockfile, no proxy. |
| Download engine | `yt-dlp` command-line tool, called from the server code | Already supports YouTube and Instagram. We do not write scrapers. |
| Merging / MP3 | `ffmpeg` (v1.5) | Combines video+audio streams and converts to MP3. |
| State | Plain React `useState` | No Redux, no extra state library. |
| Server storage | None | The server streams yt-dlp's output straight to the browser. No files kept. |

**How the server code works:** two API routes (`app/api/info/route.js` and `app/api/download/route.js`) that start yt-dlp with `child_process.spawn`, passing arguments as a list (never as one string built from user input). Both routes must declare `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'` so Next.js runs them as normal Node code.

**Save-folder behaviour**
- Desktop Chrome/Edge: folder picker (File System Access API).
- Firefox/Safari: normal download plus a tip to turn on "Ask where to save each file".
- Mobile web: browser default.
- APK (v2): Android native save dialog.

## 4. Running locally (the only "self-hosting")
Requirements: Node 20+, `yt-dlp` and `ffmpeg` installed on the machine.
```
git clone <repo>
cd tubegram
npm install
npm run dev
```
The README documents just this. No docker-compose, no self-hosting guide, no `.env` tutorial beyond a short `.env.example`.

## 5. Public deployment
**Vercel cannot run the download part.** Its serverless functions are short-lived, have no room for the yt-dlp and ffmpeg programs, and cap response size and time. A video download hits all of those limits. So the public instance goes on **Render as a single Web Service** built from **one Dockerfile** (Node + yt-dlp + ffmpeg). That Dockerfile exists only so Render can build the app; it is not advertised as a self-hosting method.

Public-instance safety (all values from environment variables, with low defaults):
- Domain allowlist (youtube.com, youtu.be, instagram.com).
- Rate limit per IP (default about 10 requests per minute).
- Max video length (default 30 minutes) and size (default 200 MB).
- No shell strings from user input, ever.

## 6. APK (v2)
Use Capacitor. Because the app has server code, the APK cannot be a fully offline bundle. It loads the hosted Render site inside the app and adds the native "save to folder" dialog. This means the APK depends on the public instance staying up.

## 7. Repo structure
```
/app            pages and API routes (Next.js)
/components     UI pieces
/lib            yt-dlp wrapper, URL validation, rate limiting
Dockerfile      for Render only
.env.example
README.md, LICENSE (MIT)
```

## 8. Milestones
**M0: Setup.** Create the Next.js app, GitHub repo `tubegram`, MIT license, README with legal disclaimer. *Done when:* `npm run dev` shows a page.

**M1: Server v1.** `/api/download` with URL allowlist, rate limiting, size/length caps, streaming MP4. *Done when:* a YouTube and an Instagram URL return a playable MP4.

**M2: UI v1.** URL input, Download button, loading and error states, folder picker with fallback. *Done when:* a pasted link ends with a file saved in the chosen folder.

**M3: Deploy v1.** One Dockerfile, Render Web Service, env vars set. *Done when:* the public URL works end to end.

**M4: v1.5.** `/api/info`, preview card, quality and format selectors, ffmpeg. *Done when:* picking 720p MP4 or MP3 gives the right file.

**M5: Hardening.** Update yt-dlp on every deploy, clear errors for private/deleted videos, basic tests.

**M6 (v2): APK.** Capacitor wrapper pointing at the hosted site, native save dialog, signed APK in GitHub Releases.

## 9. Risks
1. **Platforms block cloud server IPs.** YouTube and Instagram often reject requests from hosts like Render. Instagram especially may need a logged-in session. Expect the public instance to fail sometimes; running locally from a home connection works far more reliably.
2. **yt-dlp breaks regularly.** Update it on every deploy.
3. **Terms of service and copyright.** Downloading from these platforms violates their terms, and downloading copyrighted content without permission can be illegal. The README must say Tubegram is for content you own or have permission to download. A public instance can be suspended or receive takedown notices.
4. **Bandwidth and cost.** Streaming videos uses a lot of bandwidth; Render's free tier sleeps when idle and will not hold up under real traffic.
5. **Folder picker** works only in desktop Chrome/Edge, hence the fallback.

## 10. Out of scope
Accounts/login, history, playlists, batch downloads, other platforms, server-side file storage, self-hosting support.
