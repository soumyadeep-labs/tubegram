# Changelog

All notable changes to Tubegram are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-10-22

### Changed

- Rebuilt Tubegram as a single Next.js app. The old React/Vite frontend, Express backend, and docker-compose setup are gone.
- API routes now run yt-dlp directly with `child_process.spawn` and an argument array, never a shell string.
- Downloads are written to a per-request temporary directory, streamed to the browser, and deleted when the response closes.

### Added

- `/api/info` preview card with thumbnail, title, duration, uploader, and real available qualities.
- `/api/download` quality selection (best, 360p, 720p, 1080p, and other available heights) plus MP4/MP3 conversion via ffmpeg.
- Save-folder picker for desktop Chrome/Edge, with a normal browser download fallback.
- Per-IP sliding-window rate limiting, domain allowlist, duration cap, size cap, and download timeout.
- Clear errors for private, deleted, age-restricted, geo-blocked, login-gated, oversized, and rate-limited videos.
- Dockerfile for the Render public instance and `render.yaml` blueprint.
- Node test suite covering URL validation, rate limiting, filename handling, yt-dlp argument construction, error mapping, and API route validation.

### Security

- No user input is interpolated into a shell command.
- Remote thumbnail URLs are restricted to http(s).
- API responses are `no-store` and files are removed after streaming.
