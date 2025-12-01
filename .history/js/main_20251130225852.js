import { SlideViewer } from './slides.js';
import { WebcamOverlay } from './webcam.js';
import { Subtitles } from './subtitles.js';
import { Settings } from './settings.js';
import { initThemeToggle } from './theme.js';
import { convertPptxToPdf } from './pptx.js';

const settings = new Settings();
settings.mergeDefaults({
  theme: 'dark',
  subtitlesEnabled: false,
  presentMode: false,
  webcam: { position: { left: 16, top: 16 }, size: { w: 280, h: 180 } },
  lastSlide: 1,
  lastFileName: '',
  notes: ''
});

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

initThemeToggle(els.themeToggle, settings);

const slideViewer = new SlideViewer(els.canvas, (page, total) => {
  els.indicator.textContent = total ? `Page ${page} / ${total}` : '';
  settings.set('lastSlide', page);
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

const studioEl = document.querySelector('.studio');
const setPresentMode = (active) => {
  if (active) {
    studioEl?.classList.add('present');
    els.presentToggle.textContent = 'Exit Present';
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(e => console.log('Fullscreen denied:', e));
    }
  } else {
    studioEl?.classList.remove('present');
    els.presentToggle.textContent = 'Present';
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(e => console.log('Exit fullscreen failed:', e));
    }
  }
  settings.set('presentMode', active);
};

if (settings.get('presentMode')) {
  setPresentMode(true);
}

els.presentToggle.addEventListener('click', () => {
  setPresentMode(!studioEl?.classList.contains('present'));
});

// Allow exiting Present mode with the Escape key so the hidden topbar isn't required
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && studioEl?.classList.contains('present')) {
    setPresentMode(false);
  }
});

els.pdfInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  let fileToLoad = file;
  if (file.name.toLowerCase().endsWith('.pptx')) {
    els.recordStatus.textContent = 'Converting PPTX to PDF…';
    try {
      fileToLoad = await convertPptxToPdf(file);
      els.recordStatus.textContent = 'PPTX converted to PDF.';
    } catch (error) {
      els.recordStatus.textContent = 'PPTX conversion failed: ' + error.message;
      alert('Unable to convert PPTX: ' + error.message);
      return;
    }
  }
  await slideViewer.loadFile(fileToLoad);
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
    updateToggleText(els.webcamToggle, false, 'Disable Webcam', 'Enable Webcam');
  } else {
    const ok = await webcamOverlay.enable();
    if (ok) updateToggleText(els.webcamToggle, true, 'Disable Webcam', 'Enable Webcam');
  }
});

els.subtitlesToggle.addEventListener('click', async () => {
  if (subtitles.enabled) {
    await subtitles.disable();
    updateToggleText(els.subtitlesToggle, false, 'Disable Subtitles', 'Enable Subtitles');
    settings.set('subtitlesEnabled', false);
  } else {
    const result = await subtitles.enable();
    if (result.success) {
      updateToggleText(els.subtitlesToggle, true, 'Disable Subtitles', 'Enable Subtitles');
      settings.set('subtitlesEnabled', true);
      els.recordStatus.textContent = result.mode === 'web-speech' 
        ? 'Subtitles active (Web Speech API fallback).' 
        : 'Subtitles active (Vosk).';
    } else {
      els.recordStatus.textContent = 'Subtitles failed: ' + (result.error || 'Unknown error');
      alert('Could not enable subtitles: ' + (result.error || 'Unknown error'));
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
    const canvasEl = document.getElementById('pdfCanvas');
    if (!canvasEl) throw new Error('Canvas not found');

    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    let videoStream = null;

    // Prefer canvas capture; fallback to tab capture if unavailable
    if (canvasEl.captureStream) {
      videoStream = canvasEl.captureStream(30);
    } else {
      els.recordStatus.textContent = 'Canvas capture unsupported; requesting tab capture…';
      try {
        videoStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 } });
      } catch (err) {
        throw new Error('Unable to capture tab: ' + err.message);
      }
    }

    const combined = new MediaStream();
    videoStream.getVideoTracks().forEach(track => combined.addTrack(track));
    audioStream.getAudioTracks().forEach(track => combined.addTrack(track));

    // Priority: MP4 (H.264 + AAC) -> MP4 (Generic) -> WebM (H.264) -> WebM (Generic)
    const mimeTypes = [
      'video/mp4;codecs="avc1.42E01E, mp4a.40.2"', // Standard MP4
      'video/mp4',                                 // Generic MP4
      'video/webm;codecs=h264',                    // WebM with H.264 video
      'video/webm;codecs=vp9,opus',                // WebM High Quality
      'video/webm'                                 // WebM Default
    ];

    let mimeType = '';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }

    if (!mimeType) {
      mimeType = 'video/webm'; // Last resort
    }

    console.log('Selected MIME type for recording:', mimeType);

    recorder = new MediaRecorder(combined, { mimeType });
    recordChunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) recordChunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(recordChunks, { type: mimeType.split(';')[0] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Determine extension based on actual mimeType used
      let ext = 'webm';
      if (mimeType.includes('mp4')) {
        ext = 'mp4';
      }
      
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `slidestage-${ts}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      combined.getTracks().forEach(t => t.stop());
      audioStream.getTracks().forEach(t => t.stop());
      
      let msg = `Recording saved as ${ext.toUpperCase()}.`;
      if (ext === 'webm') {
        msg += ' (Note: Use VLC Player if Windows Media Player fails)';
      }
      els.recordStatus.textContent = msg;
      
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
