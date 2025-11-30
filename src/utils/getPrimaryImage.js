const API_BASE = (() => {
  const base = (process.env.REACT_APP_API_BASE || '').trim();
  return base.endsWith('/') ? base.slice(0, -1) : base;
})();

export const buildImageProxyUrl = (url) => {
  const base = API_BASE || '/api';
  return `${base}/image-proxy?url=${encodeURIComponent(url)}`;
};

export const normalizeValue = (value) => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return normalizeImageUrl(trimmed);
};

// Convert common Google Drive share/view URLs to a direct image URL usable in <img src>
export const normalizeImageUrl = (url) => {
  try {
    // drive file view: /file/d/FILEID/view
    const driveFile = url.match(/https?:\/\/(?:www\.)?drive\.google\.com\/file\/d\/([^\/\?]+)/i);
    if (driveFile && driveFile[1]) return `https://drive.google.com/uc?export=view&id=${driveFile[1]}`;
    // open?id=FILEID
    const openMatch = url.match(/https?:\/\/(?:www\.)?drive\.google\.com\/open\?id=([^&]+)/i);
    if (openMatch && openMatch[1]) return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
    // thumbnail?id=FILEID
    const thumbMatch = url.match(/https?:\/\/(?:www\.)?drive\.google\.com\/thumbnail\?id=([^&]+)/i);
    if (thumbMatch && thumbMatch[1]) return `https://drive.google.com/uc?export=view&id=${thumbMatch[1]}`;
    // already uc?id=FILEID
    const ucMatch = url.match(/https?:\/\/(?:www\.)?drive\.google\.com\/uc\?id=([^&]+)/i);
    if (ucMatch && ucMatch[1]) return `https://drive.google.com/uc?export=view&id=${ucMatch[1]}`;
    // match query-like fragments (id=FILEID or t=view&id=FILEID)
    const fragMatch = url.match(/(?:id=|[?&]id=)([A-Za-z0-9_-]{10,})/i);
    if (fragMatch && fragMatch[1]) return `https://drive.google.com/uc?export=view&id=${fragMatch[1]}`;
    // if user pasted only the file ID (common), detect plausible id length and build URL
    const bareIdMatch = url.match(/^([A-Za-z0-9_-]{20,})$/);
    if (bareIdMatch && bareIdMatch[1]) return `https://drive.google.com/uc?export=view&id=${bareIdMatch[1]}`;
  } catch (err) {
    // ignore and fall back to original
  }
  return url;
};

const listFromValue = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const pickFromObject = (source) => {
  if (!source || typeof source !== 'object') return '';
  const candidates = [
    source.imageUrl,
    source.image,
    source.mainImage,
    source.thumbnail,
    source.thumbnailUrl,
    source.secondaryImageUrl,
    source.photo
  ];
  for (const candidate of candidates) {
    const normalized = normalizeValue(candidate);
    if (normalized) return normalized;
  }
  const galleryCandidates = [...listFromValue(source.imageGallery), ...listFromValue(source.images)];
  for (const candidate of galleryCandidates) {
    const normalized = normalizeValue(candidate);
    if (normalized) return normalized;
  }
  return '';
};

const getPrimaryImage = (...sources) => {
  for (const src of sources) {
    if (!src) continue;
    if (typeof src === 'string') {
      const normalized = normalizeValue(src);
      if (normalized) {
        if (/drive\.google\.com|drive\.usercontent\.googleapis\.com|drive\.usercontent\.google\.com|drive\.usercontent|googleusercontent\.com/i.test(normalized)) {
          return buildImageProxyUrl(normalized);
        }
        return normalized;
      }
      continue;
    }
    const fromObject = pickFromObject(src);
    if (fromObject) {
      if (/drive\.google\.com|drive\.usercontent\.googleapis\.com|drive\.usercontent\.google\.com|drive\.usercontent|googleusercontent\.com/i.test(fromObject)) {
        return buildImageProxyUrl(fromObject);
      }
      return fromObject;
    }
    if (src.productDetails) {
      const nested = pickFromObject(src.productDetails);
      if (nested) return nested;
    }
  }
  return '';
};

export default getPrimaryImage;
