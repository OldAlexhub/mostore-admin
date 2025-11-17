const CSV_MIME = 'text/csv;charset=utf-8;';
const UTF8_BOM = '\uFEFF'; // BOM ensures Excel detects UTF-8 and keeps Arabic text readable.

const triggerDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadCsvFromText = (text, filename) => {
  const normalized = text == null ? '' : String(text);
  const blob = new Blob([UTF8_BOM, normalized], { type: CSV_MIME });
  triggerDownload(blob, filename);
};

export const downloadCsvFromBlob = async (blob, filename) => {
  if (!blob) return;
  const text = typeof blob === 'string' ? blob : await blob.text();
  downloadCsvFromText(text, filename);
};
