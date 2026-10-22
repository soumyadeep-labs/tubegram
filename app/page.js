'use client';

import { useState } from 'react';

import VideoPreview from '../components/VideoPreview.jsx';
import { filenameFor } from '../lib/display.js';
import {
  saveToPickedFolder,
  supportsDirectoryPicker,
  triggerBrowserDownload,
} from '../lib/save-file.js';

async function readError(response) {
  const data = await response.json().catch(() => null);
  return new Error(
    data?.error || `Something went wrong (HTTP ${response.status}).`,
  );
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [info, setInfo] = useState(null);
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('best');
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const busy = phase !== 'idle';

  const handleUrlChange = (event) => {
    setUrl(event.target.value);
    if (info) setInfo(null);
    if (error) setError(null);
    if (notice) setNotice(null);
  };

  const handlePreview = async (event) => {
    event.preventDefault();
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError('Paste a video link first.');
      return;
    }

    setPhase('loading');
    setError(null);
    setNotice(null);
    setInfo(null);
    setProgress(null);

    try {
      const response = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      if (!response.ok) {
        throw await readError(response);
      }

      const data = await response.json();
      setInfo(data);
      setQuality('best');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPhase('idle');
    }
  };

  const handleDownload = async () => {
    if (!info || busy) return;

    const downloadUrl = `/api/download?${new URLSearchParams({
      url: info.sourceUrl,
      format,
      quality,
    })}`;
    const filename = filenameFor(info.title, format);

    setPhase('downloading');
    setProgress(0);
    setError(null);
    setNotice(null);

    try {
      if (supportsDirectoryPicker()) {
        const result = await saveToPickedFolder({
          url: downloadUrl,
          filename,
          onProgress: setProgress,
        });
        setNotice(
          result.directory
            ? `Saved “${result.filename}” to “${result.directory}”.`
            : `Saved “${result.filename}”.`,
        );
      } else {
        triggerBrowserDownload(downloadUrl);
        setNotice(
          'Download started. In Firefox or Safari, turn on “Ask where to save each file” in browser settings to choose a folder.',
        );
      }
    } catch (downloadError) {
      if (downloadError.name === 'AbortError') {
        setNotice('Save cancelled.');
      } else {
        setError(downloadError.message);
      }
    } finally {
      setPhase('idle');
      setProgress(null);
    }
  };

  return (
    <main className="shell">
      <header className="hero">
        <span className="eyebrow">Tubegram v2</span>
        <h1>
          Save the video.
          <br />
          <span>Skip the clutter.</span>
        </h1>
        <p>
          Paste a YouTube or Instagram link. Preview it, choose MP4 or MP3, then
          save it where you want.
        </p>
      </header>

      <section className="card">
        <form className="url-form" onSubmit={handlePreview}>
          <label className="sr-only" htmlFor="video-url">
            Video link
          </label>
          <input
            id="video-url"
            className="url-form__input"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://www.youtube.com/watch?v=…"
            value={url}
            onChange={handleUrlChange}
            disabled={busy}
            required
          />
          <button
            className="button button--primary"
            type="submit"
            disabled={busy}
          >
            {phase === 'loading' ? 'Checking…' : 'Preview'}
          </button>
        </form>

        <div className="feedback" aria-live="polite">
          {error ? (
            <p className="alert" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? <p className="notice">{notice}</p> : null}
        </div>

        {info ? (
          <VideoPreview
            info={info}
            format={format}
            quality={quality}
            onFormatChange={setFormat}
            onQualityChange={setQuality}
            onDownload={handleDownload}
            busy={busy}
            progress={progress}
          />
        ) : (
          <p className="empty-hint">
            Works with YouTube videos, Shorts, and Instagram posts. One link at a time.
          </p>
        )}
      </section>

      <footer className="footer">
        <p>
          Download only content you own or have permission to use. Tubegram does
          not host any videos, and the server keeps no copies.
        </p>
        <p className="footer__limits">
          {info?.limits
            ? `Limits: up to ${info.limits.maxDurationMinutes} minutes and ${info.limits.maxSizeMb} MB per video.`
            : 'Server limits apply to video length and file size.'}
        </p>
      </footer>
    </main>
  );
}
