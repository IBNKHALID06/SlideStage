import { SlideViewer } from './slides.js';
import { WebcamOverlay } from './webcam.js';
import { Subtitles } from './subtitles.js';
import { Settings } from './settings.js';
import { initThemeToggle } from './theme.js';

const settings = new Settings();
settings.mergeDefaults({
  theme: 'dark',
  subtitlesEnabled: false,
  lastSlide: 1,
  lastFileName: '',
  notes: ''
});
const els = {
  pdfInput: document.getElementById('pdfFileInput'),
  prev: document.getElementById('prevSlide'),
  closeSubtitlesDialog: document.getElementById('closeSubtitlesDialog'),
};

initThemeToggle(els.themeToggle, settings);
const slideViewer = new SlideViewer(els.canvas, (page, total) => {
  els.indicator.textContent = total ? `Page ${page} / ${total}` : '';
  settings.set('lastSlide', page);
const webcamOverlay = new WebcamOverlay(
  document.getElementById('webcamBox'),
  document.getElementById('webcamVideo'),
  settings
);

const subtitles = new Subtitles(
  document.getElementById('subtitlesOverlay'),
  settings
);
els.pdfInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  settings.set('lastFileName', file.name);
  settings.set('lastSlide', 1);
});
els.prev.addEventListener('click', () => slideViewer.prev());
els.next.addEventListener('click', () => slideViewer.next());
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') slideViewer.prev();
  if (e.key === 'ArrowRight') slideViewer.next();
});
const updateToggleText = (el, enabled, enabledText, disabledText) => {
  el.textContent = enabled ? enabledText : disabledText;
};
els.webcamToggle.addEventListener('click', async () => {
  if (webcamOverlay.enabled) {
    await webcamOverlay.disable();
    const ok = await webcamOverlay.enable();
    if (ok) updateToggleText(els.webcamToggle, true, 'Disable Webcam', 'Enable Webcam');
  }
});

els.subtitlesToggle.addEventListener('click', async () => {
  if (subtitles.enabled) {
    await subtitles.disable();
    updateToggleText(els.subtitlesToggle, false, 'Disable Subtitles', 'Enable Subtitles');
    const ok = await subtitles.enable();
    if (ok) {
      updateToggleText(els.subtitlesToggle, true, 'Disable Subtitles', 'Enable Subtitles');
      els.subtitlesDialog?.showModal?.();
      settings.set('subtitlesEnabled', false);
    }
  }
});

els.subtitlesDialog?.addEventListener('cancel', (event) => {
  event.preventDefault();
  els.subtitlesDialog.close();
});
let recorder = null;
let recordChunks = [];

els.recordStart.addEventListener('click', async () => {
  try {
    const slideContainer = document.getElementById('slideContainer');
    if (!slideContainer) throw new Error('Slide container not found');
  const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const canvasStream = slideContainer.captureStream(30);
  const combined = new MediaStream();
  canvasStream.getVideoTracks().forEach(track => combined.addTrack(track));
  audioStream.getAudioTracks().forEach(track => combined.addTrack(track));
    
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
  }
    
  recorder = new MediaRecorder(combined, { mimeType });
  recordChunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) recordChunks.push(e.data); };
  recorder.onstop = () => {
  const blob = new Blob(recordChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = `slidestage-${ts}.webm`;
  a.click();
  URL.revokeObjectURL(url);
  combined.getTracks().forEach(t => t.stop());
  audioStream.getTracks().forEach(t => t.stop());
  els.recordStatus.textContent = 'Recording saved.';
      els.recordStart.disabled = false;
      els.recordStop.disabled = true;
    };
  recorder.start();
  els.recordStatus.textContent = 'Recording… (slides + mic). Use Stop to finish.';
  els.recordStart.disabled = true;
    els.recordStop.disabled = false;
  } catch (e) {
    els.recordStatus.textContent = 'Recording failed: ' + e.message;
  }
});

els.recordStop.addEventListener('click', () => {
  try {
    if (recorder) recorder.stop();
  } catch (e) {
    els.recordStatus.textContent = 'Stop failed: ' + e.message;
  }
});
els.closeSubtitlesDialog?.addEventListener('click', () => {
  els.subtitlesDialog.close();
});

els.notesText.value = settings.get('notes', '');
els.notesText.addEventListener('input', () => {
  settings.set('notes', els.notesText.value);
});
els.presentToggle.addEventListener('click', () => {
  document.querySelector('.studio')?.classList.toggle('present');
  const active = document.querySelector('.studio')?.classList.contains('present');
  els.presentToggle.textContent = active ? 'Exit Present' : 'Present';
});
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
  recordStart: document.getElementById('recordStart'),
  recordStop: document.getElementById('recordStop'),
  recordStatus: document.getElementById('recordStatus'),
  notesText: document.getElementById('notesText'),
  themeToggle: document.getElementById('themeToggle'),
  presentToggle: document.getElementById('presentToggle'),
  subtitlesDialog: document.getElementById('subtitlesDialog'),
  closeSubtitlesDialog: document.getElementById('closeSubtitlesDialog'),
};

const settings = new Settings();
settings.mergeDefaults({
  theme: 'dark',
  subtitlesEnabled: false,
  presentMode: false,
  webcam: { position: { left: 16, top: 16 }, size: { w: 280, h: 180 } },
  lastSlide: 1,
  lastFileName: ''
});
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
import { Settings } from './settings.js';

const settings = new Settings();
els.pdfInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  await slideViewer.loadFile(file);
  settings.set('lastFileName', file.name);
  settings.set('lastSlide', 1);
});

// Slide controls
els.prev.addEventListener('click', () => slideViewer.prev());
els.next.addEventListener('click', () => slideViewer.next());
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') slideViewer.prev();
  if (e.key === 'ArrowRight') slideViewer.next();
const slideViewer = new SlideViewer(els.canvas, (page, total) => {
  els.indicator.textContent = total ? `Page ${page} / ${total}` : '';
  settings.set('lastSlide', page);
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

// Built-in recording: capture presentation (slides container) + mic audio
let recorder = null;
let recordChunks = [];
els.recordStart.addEventListener('click', async () => {
  try {
    // Get the slide container to record
    const slideContainer = document.getElementById('slideContainer');
    if (!slideContainer) throw new Error('Slide container not found');
    
    // Capture mic audio
    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Capture canvas/screen
    const canvasStream = slideContainer.captureStream(30);
    
    // Combine streams: video from canvas, audio from mic
    const combined = new MediaStream();
    canvasStream.getVideoTracks().forEach(track => combined.addTrack(track));
    audioStream.getAudioTracks().forEach(track => combined.addTrack(track));
    
    // Create recorder; try vp9 first, fall back to vp8
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
    
    recorder = new MediaRecorder(combined, { mimeType });
    recordChunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) recordChunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(recordChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g,'-');
      a.download = `slidestage-${ts}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      // Stop all tracks
      combined.getTracks().forEach(t => t.stop());
      audioStream.getTracks().forEach(t => t.stop());
      els.recordStatus.textContent = 'Recording saved.';
      els.recordStart.disabled = false;
      els.recordStop.disabled = true;
    };
    recorder.start();
    els.recordStatus.textContent = 'Recording… (includes slides, webcam, subtitles, mic). Use Stop to finish.';
    els.recordStart.disabled = true;
    els.recordStop.disabled = false;
  } catch (e) {
    els.recordStatus.textContent = 'Recording failed: ' + e.message;
  }
});

els.recordStop.addEventListener('click', () => {
  try {
    if (recorder) recorder.stop();
  } catch (e) {
    els.recordStatus.textContent = 'Stop failed: ' + e.message;
  }
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
