'use strict';
/* Google Drive listing with full nextPageToken pagination.
   Credentials stay server-side; the browser only ever sees /api/drive/file. */

const FIELDS = 'nextPageToken,files(id,name,mimeType,size,thumbnailLink,imageMediaMetadata/width,imageMediaMetadata/height,videoMediaMetadata/width,modifiedTime)';

function apiKey(settings) {
  return process.env.GOOGLE_DRIVE_API_KEY || (settings && settings.driveApiKey) || '';
}

function configured(settings) { return !!apiKey(settings); }

/**
 * List every image/video in a folder, following nextPageToken until exhausted.
 * @returns {Promise<{ok:boolean, files:Array, pages:number, error?:string, partial?:boolean}>}
 */
async function listFolder(folderId, settings, opts) {
  const key = apiKey(settings);
  if (!key) return { ok: false, files: [], pages: 0, error: 'Google Drive API key is not configured.' };
  if (!folderId) return { ok: false, files: [], pages: 0, error: 'No Drive folder ID set for this event.' };

  const maxPages = (opts && opts.maxPages) || 200; // 200 * 1000 = 200k files ceiling
  const seen = new Set();
  const files = [];
  let pageToken = null, pages = 0, error = null;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed=false`,
      key,
      fields: FIELDS,
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
      orderBy: 'name_natural'
    });
    if (pageToken) params.set('pageToken', pageToken);

    let r, j;
    try {
      r = await fetch('https://www.googleapis.com/drive/v3/files?' + params.toString());
      j = await r.json();
    } catch (e) {
      error = 'Network error contacting Google Drive: ' + e.message;
      break;
    }
    if (!r.ok) {
      error = (j && j.error && j.error.message) || ('Drive API error ' + r.status);
      break;
    }
    for (const f of (j.files || [])) {
      if (seen.has(f.id)) continue;   // de-duplicate defensively
      seen.add(f.id);
      files.push(f);
    }
    pageToken = j.nextPageToken || null;
    pages++;
  } while (pageToken && pages < maxPages);

  // partial = we got some files but hit an error mid-pagination
  return { ok: !error, files, pages, error: error || undefined, partial: !!error && files.length > 0 };
}

/** Map a Drive file record into the app's media shape. */
function toMedia(f, eventId) {
  const isVideo = String(f.mimeType || '').startsWith('video/');
  const base = {
    id: (isVideo ? 'dv' : 'd') + f.id.slice(0, 10),
    driveId: f.id,
    src: `/api/drive/file?id=${encodeURIComponent(f.id)}&ev=${encodeURIComponent(eventId)}`,
    thumb: `/api/drive/file?id=${encodeURIComponent(f.id)}&ev=${encodeURIComponent(eventId)}&thumb=1`,
    type: isVideo ? 'video' : 'image',
    alt: f.name || '',
    mimeType: f.mimeType,
    size: Number(f.size) || 0,
    modifiedTime: f.modifiedTime || ''
  };
  if (f.imageMediaMetadata) { base.w = f.imageMediaMetadata.width || 0; base.h = f.imageMediaMetadata.height || 0; }
  return base;
}

module.exports = { listFolder, toMedia, configured, apiKey };
