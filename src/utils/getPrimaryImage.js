const normalizeValue = (value) => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed || '';
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
      if (normalized) return normalized;
      continue;
    }
    const fromObject = pickFromObject(src);
    if (fromObject) return fromObject;
    if (src.productDetails) {
      const nested = pickFromObject(src.productDetails);
      if (nested) return nested;
    }
  }
  return '';
};

export default getPrimaryImage;
