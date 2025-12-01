import { SlideViewer } from './slides.js';
import { WebcamOverlay } from './webcam.js';
import { Subtitles } from './subtitles.js';
import { Settings } from './settings.js';
import { initThemeToggle } from './theme.js';

const els = {
  pdfInput: document.getElementById('pdfFileInput'),
  prev: document.getElementById('prevSlide'),
  next: document.getElementById('nextSlide'),
  indicator: document.getElementById('pageIndicator'),
  canvas: document.getElementById('pdfCanvas'),
  webcamToggle: document.getElementById('webcamToggle'),
  subtitlesToggle: document.getElementById('subtitlesToggle'),
  recordHelp: document.getElementById('recordingHelp'),
  recordDialog: document.getElementById('recordDialog'),
  closeRecordDialog: document.getElementById('closeRecordDialog'),
  notesText: document.getElementById('notesText'),
  themeToggle: document.getElementById('themeToggle'),
  presentToggle: document.getElementById('presentToggle'),
  subtitlesDialog: document.getElementById('subtitlesDialog'),
  closeSubtitlesDialog: document.getElementById('closeSubtitlesDialog'),
};

const settings = new Settings();
initThemeToggle(els.themeToggle, settings);

const slideViewer = new SlideViewer(els.canvas, (page, total) => {
  els.indicator.textContent = total ? `Page ${page} / ${total}` : '';
});

const webcamOverlay = new WebcamOverlay(
  document.getElementById('webcamBox'),
  document.getElementById('webcamVideo'),
  settings
);

const subtitles = new Subtitles(
  document.getElementById('subtitlesOverlay'),
  settings
);

// PDF load
els.pdfInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  await slideViewer.loadFile(file);
});

// Slide controls
els.prev.addEventListener('click', () => slideViewer.prev());
els.next.addEventListener('click', () => slideViewer.next());
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') slideViewer.prev();
  if (e.key === 'ArrowRight') slideViewer.next();
});

// Webcam toggle
els.webcamToggle.addEventListener('click', async () => {
  if (webcamOverlay.enabled) {
    await webcamOverlay.disable();
    els.webcamToggle.textContent = 'Enable Webcam';
  } else {
    const ok = await webcamOverlay.enable();
    if (ok) els.webcamToggle.textContent = 'Disable Webcam';
  }
});

// Subtitles toggle
els.subtitlesToggle.addEventListener('click', async () => {
  if (subtitles.enabled) {
    await subtitles.disable();
    els.subtitlesToggle.textContent = 'Enable Subtitles';
  } else {
    const ok = await subtitles.enable();
    if (ok) els.subtitlesToggle.textContent = 'Disable Subtitles';
    else {
      // Show instructions if not available
      els.subtitlesDialog?.showModal?.();
    }
  }
});

// Recording help dialog
els.recordHelp.addEventListener('click', () => {
  els.recordDialog.showModal();
});
els.closeRecordDialog.addEventListener('click', () => {
  els.recordDialog.close();
});
els.closeSubtitlesDialog?.addEventListener('click', () => {
  els.subtitlesDialog.close();
});

// Persist notes
els.notesText.value = settings.get('notes', '');
els.notesText.addEventListener('input', () => {
  settings.set('notes', els.notesText.value);
});

// Present mode
els.presentToggle.addEventListener('click', () => {
  document.querySelector('.studio')?.classList.toggle('present');
  const active = document.querySelector('.studio')?.classList.contains('present');
  els.presentToggle.textContent = active ? 'Exit Present' : 'Present';
});
