export function supportsDirectoryPicker() {
  return (
    typeof window !== 'undefined' &&
    typeof window.showDirectoryPicker === 'function'
  );
}

async function responseError(response) {
  const data = await response.json().catch(() => null);
  return new Error(
    data?.error || `The server could not prepare the download (HTTP ${response.status}).`,
  );
}

/**
 * Streams a download into a folder the user picks with the File System Access
 * API. Supported in desktop Chrome and Edge.
 */
export async function saveToPickedFolder({ url, filename, onProgress }) {
  const directory = await window.showDirectoryPicker({ mode: 'readwrite' });

  let existed = true;
  try {
    await directory.getFileHandle(filename);
  } catch {
    existed = false;
  }

  const fileHandle = await directory.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();

  try {
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      throw await responseError(response);
    }

    const total = Number(response.headers.get('content-length')) || 0;

    if (!response.body) {
      const blob = await response.blob();
      await writable.write(blob);
    } else {
      const reader = response.body.getReader();
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        await writable.write(value);
        received += value.byteLength;

        if (total > 0) {
          onProgress?.(Math.min(100, Math.round((received / total) * 100)));
        }
      }
    }

    await writable.close();
    onProgress?.(100);
    return { filename, directory: directory.name };
  } catch (error) {
    await writable.abort().catch(() => {});

    if (!existed) {
      await directory.removeEntry(filename).catch(() => {});
    }

    throw error;
  }
}

/** Fallback for browsers without the File System Access API. */
export function triggerBrowserDownload(url) {
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
