import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.mjs';
import { PDFDocument, StandardFonts, rgb } from 'https://cdn.jsdelivr.net/npm/pdf-lib@1.20.0/dist/pdf-lib.esm.min.js';

const slideFileRegex = /^ppt\/slides\/slide(\d+)\.xml$/;

const wrapText = (text, font, fontSize, maxWidth) => {
  if (!text) return [''];
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(attempt, fontSize);
    if (width <= maxWidth) {
      current = attempt;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

const extractSlideText = (xmlText) => {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');
  const nodes = Array.from(xml.getElementsByTagName('a:t'));
  if (!nodes.length) return null;
  return nodes
    .map((node) => node.textContent?.trim())
    .filter(Boolean)
    .join(' ');
};

export async function convertPptxToPdf(file) {
  if (!file.name.toLowerCase().endsWith('.pptx')) {
    throw new Error('Only .pptx files are supported by the converter');
  }

  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const slideEntries = Object.keys(zip.files)
    .map((name) => ({ name, match: name.match(slideFileRegex) }))
    .filter((entry) => entry.match)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));

  if (!slideEntries.length) {
    throw new Error('No slides found inside the PPTX file');
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const entry of slideEntries) {
    const xmlText = await zip.file(entry.name).async('text');
    const slideText = extractSlideText(xmlText) || `Slide ${entry.match[1]}`;
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();
    const fontSize = 18;
    const maxWidth = width - 72;
    const lines = wrapText(slideText, font, fontSize, maxWidth);
    let cursorY = height - 72;
    for (const line of lines) {
      page.drawText(line, {
        x: 36,
        y: cursorY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      cursorY -= fontSize + 6;
      if (cursorY < 48) break;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes], file.name.replace(/\.pptx$/i, '.pdf'), { type: 'application/pdf' });
}
