// Lightweight, dynamic PPTX -> PDF text extraction converter.
// Avoids static ESM imports so failure to fetch libraries doesn't break other features.
// Strategy: On demand load UMD builds of JSZip and pdf-lib; extract slide text and render to simple PDF pages.

const JSZIP_URL = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const PDFLIB_URL = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.20.0/dist/pdf-lib.min.js';
const slideFileRegex = /^ppt\/slides\/slide(\d+)\.xml$/;

function injectScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

async function ensureLibs() {
  if (!window.JSZip) await injectScript(JSZIP_URL);
  if (!window.PDFLib) await injectScript(PDFLIB_URL);
  if (!window.JSZip || !window.PDFLib) throw new Error('Libraries unavailable');
  return { JSZip: window.JSZip, PDFLib: window.PDFLib };
}

function extractSlideText(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');
  const nodes = Array.from(xml.getElementsByTagName('a:t'));
  return nodes.map(n => n.textContent?.trim()).filter(Boolean).join(' ');
}

function wrapText(text, font, fontSize, maxWidth) {
  if (!text) return [''];
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const w of words) {
    const attempt = current ? current + ' ' + w : w;
    const width = font.widthOfTextAtSize(attempt, fontSize);
    if (width <= maxWidth) current = attempt; else { if (current) lines.push(current); current = w; }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

export async function convertPptxToPdf(file) {
  if (!file.name.toLowerCase().endsWith('.pptx')) throw new Error('Not a PPTX file');
  const { JSZip, PDFLib } = await ensureLibs();
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const slideEntries = Object.keys(zip.files)
    .map(name => ({ name, match: name.match(slideFileRegex) }))
    .filter(e => e.match)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));
  if (!slideEntries.length) throw new Error('No slides found');

  const pdfDoc = await PDFLib.PDFDocument.create();
  const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

  for (const entry of slideEntries) {
    const xmlText = await zip.file(entry.name).async('text');
    const slideText = extractSlideText(xmlText) || `Slide ${entry.match[1]}`;
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();
    const fontSize = 18;
    const maxWidth = width - 72;
    const lines = wrapText(slideText, font, fontSize, maxWidth);
    let y = height - 72;
    for (const line of lines) {
      page.drawText(line, { x: 36, y, size: fontSize, font, color: PDFLib.rgb(0,0,0) });
      y -= fontSize + 6;
      if (y < 48) break;
    }
  }
  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes], file.name.replace(/\.pptx$/i, '.pdf'), { type: 'application/pdf' });
}
