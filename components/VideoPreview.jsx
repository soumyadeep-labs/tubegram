'use client';

import { useState } from 'react';

import { formatDuration } from '../lib/display.js';

export default function VideoPreview({
  info,
  format,
  quality,
  onFormatChange,
  onQualityChange,
  onDownload,
  busy,
  progress,
}) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const qualities = info.qualities?.length
    ? info.qualities
    : [{ value: 'best', label: 'Best available' }];

  const buttonLabel =
    progress !== null && progress > 0
      ? `Saving… ${progress}%`
      : busy
        ? 'Preparing download…'
        : `Download ${format.toUpperCase()}`;

  return (
    <section className="preview" aria-label="Video preview">
      <div className="preview__media">
        {info.thumbnail && !thumbnailFailed ? (
          <img
            src={info.thumbnail}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          <div className="preview__placeholder" aria-hidden="true">
            {format === 'mp3' ? '♪' : '▶'}
          </div>
        )}
      </div>

      <div className="preview__body">
        <h2 className="preview__title">{info.title}</h2>

        <p className="preview__meta">
          <span>{formatDuration(info.durationSeconds)}</span>
          {info.uploader ? <span>{info.uploader}</span> : null}
        </p>

        <div className="field">
          <span className="field__label">Format</span>
          <div className="segmented" role="group" aria-label="Output format">
            {['mp4', 'mp3'].map((value) => (
              <button
                key={value}
                type="button"
                className={format === value ? 'segmented__button is-active' : 'segmented__button'}
                aria-pressed={format === value}
                disabled={busy}
                onClick={() => onFormatChange(value)}
              >
                {value === 'mp4' ? 'MP4 video' : 'MP3 audio'}
              </button>
            ))}
          </div>
        </div>

        {format === 'mp4' ? (
          <label className="field">
            <span className="field__label">Quality</span>
            <select
              className="field__select"
              value={quality}
              disabled={busy}
              onChange={(event) => onQualityChange(event.target.value)}
            >
              {qualities.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="preview__note">Audio is converted to MP3 at the best available quality.</p>
        )}

        {progress !== null ? (
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Download progress"
          >
            <div className="progress__bar" style={{ width: `${progress}%` }} />
          </div>
        ) : null}

        <button
          type="button"
          className="button button--primary button--wide"
          onClick={onDownload}
          disabled={busy}
        >
          {buttonLabel}
        </button>

        <p className="preview__note">
          On Chrome or Edge you can pick the folder. Other browsers use your normal
          download location.
        </p>
      </div>
    </section>
  );
}
