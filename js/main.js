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
  scriptText: document.getElementById('scriptText'),
  scriptFontIncrease: document.getElementById('scriptFontIncrease'),
  scriptFontDecrease: document.getElementById('scriptFontDecrease'),
  scriptClear: document.getElementById('scriptClear'),
  scriptSlideNum: document.getElementById('scriptSlideNum'),
  helpFooter: document.getElementById('helpFooter'),
  themeToggle: document.getElementById('themeToggle'),
  presentToggle: document.getElementById('presentToggle'),
  spotlightToggle: document.getElementById('spotlightToggle'),
  subtitlesDialog: document.getElementById('subtitlesDialog'),
  closeSubtitlesDialog: document.getElementById('closeSubtitlesDialog'),
  presentControls: document.getElementById('presentControls'),
  presentRecordBtn: document.getElementById('presentRecordBtn'),
  presentExitBtn: document.getElementById('presentExitBtn'),
};

// Debug check
if (!els.pdfInput || !els.prev || !els.next) {
  console.error('Critical elements missing from DOM');
  if (els.recordStatus) els.recordStatus.textContent = 'System Error: DOM elements missing. Reload page.';
} else {
  console.log('DOM elements found, initializing...');
  if (els.recordStatus) els.recordStatus.textContent = 'System Ready. Load a PDF to begin.';
}

initThemeToggle(els.themeToggle, settings);

// ============================================================================
// NOTES HISTORY - Undo/Redo functionality
// ============================================================================

class NotesHistory {
  constructor(maxSteps = 50) {
    this.stack = [];
    this.currentIndex = -1;
    this.maxSteps = maxSteps;
  }

  push(value) {
    this.stack = this.stack.slice(0, this.currentIndex + 1);
    this.stack.push(value);
    if (this.stack.length > this.maxSteps) {
      this.stack.shift();
    } else {
      this.currentIndex++;
    }
  }

  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.stack[this.currentIndex];
    }
    return null;
  }

  redo() {
    if (this.currentIndex < this.stack.length - 1) {
      this.currentIndex++;
      return this.stack[this.currentIndex];
    }
    return null;
  }
}

const notesHistory = new NotesHistory();
let notesDebounceTimer = null;

// Initialize notes history with current value
const initializeNotesHistory = () => {
  const currentNotes = els.notesText.value;
  if (currentNotes) {
    notesHistory.push(currentNotes);
  }
};

const slideViewer = new SlideViewer(els.canvas, (page, total) => {
  els.indicator.textContent = total ? `Page ${page} / ${total}` : '';
  settings.set('lastSlide', page);
  loadSlideScript(page);
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

// ============================================================================
// PRESENT MODE
// ============================================================================

const setPresentMode = (active) => {
  if (active) {
    studioEl?.classList.add('present');
    els.presentToggle.textContent = 'Exit Present';
    els.presentControls?.classList.remove('hidden');
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(e => console.log('Fullscreen denied:', e));
    }
  } else {
    studioEl?.classList.remove('present');
    els.presentToggle.textContent = 'Present';
    els.presentControls?.classList.add('hidden');
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

els.presentExitBtn?.addEventListener('click', () => {
  setPresentMode(false);
});

// Allow exiting Present mode with the Escape key
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
        : 'Subtitles active (Native).';
    } else {
      els.recordStatus.textContent = 'Subtitles failed: ' + (result.error || 'Unknown error');
      alert('Could not enable subtitles: ' + (result.error || 'Unknown error'));
      settings.set('subtitlesEnabled', false);
    }
  }
});

// Script/Teleprompter controls - Helper function to change font size
function changeScriptFontSize(delta) {
  let size = parseInt(getComputedStyle(els.scriptText).fontSize) || 14;
  size += delta;
  if (size < 10) size = 10;
  if (size > 32) size = 32;
  els.scriptText.style.fontSize = size + 'px';
  localStorage.setItem('slidestage:scriptFontSize', size);
}

// Get/Set script for current slide
function getCurrentSlideScript() {
  const slideNum = slideViewer?.currentPage || 1;
  return localStorage.getItem(`slidestage:script:slide${slideNum}`) || '';
}

function saveCurrentSlideScript(content) {
  const slideNum = slideViewer?.currentPage || 1;
  localStorage.setItem(`slidestage:script:slide${slideNum}`, content);
}

// Load script for a specific slide
function loadSlideScript(slideNum) {
  if (!els.scriptText || !els.scriptSlideNum) return;
  const script = localStorage.getItem(`slidestage:script:slide${slideNum}`) || '';
  els.scriptText.value = script;
  els.scriptSlideNum.textContent = slideNum;
}

els.scriptFontIncrease?.addEventListener('click', () => changeScriptFontSize(2));
els.scriptFontDecrease?.addEventListener('click', () => changeScriptFontSize(-2));

els.scriptClear?.addEventListener('click', () => {
  if (els.scriptText?.value && confirm('Clear script for this slide?')) {
    els.scriptText.value = '';
    saveCurrentSlideScript('');
  }
});

// Save script when user types
els.scriptText?.addEventListener('input', () => {
  saveCurrentSlideScript(els.scriptText.value);
});

// Load persisted font size
const savedFontSize = localStorage.getItem('slidestage:scriptFontSize');
if (savedFontSize) {
  els.scriptText.style.fontSize = savedFontSize + 'px';
}

els.subtitlesDialog?.addEventListener('cancel', (event) => {
  event.preventDefault();
  els.subtitlesDialog.close();
});

let recorder = null;
let recordChunks = [];

const startRecording = async () => {
  try {
    const canvasEl = document.getElementById('pdfCanvas');
    if (!canvasEl) throw new Error('Canvas not found');

    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Use getDisplayMedia to capture the full "Studio" view (Slides + Webcam + Subtitles).
    // Canvas capture would miss the DOM overlays.
    els.recordStatus.textContent = 'Please select "This Tab" (SlideStage) in the dialog to record...';
    let videoStream = null;
    try {
      videoStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { 
          frameRate: { ideal: 60, max: 60 }, // 60fps for smoother video
          displaySurface: 'browser' 
        },
        audio: false, // We use the mic stream separately
        selfBrowserSurface: 'include',
        preferCurrentTab: true
      });
    } catch (err) {
      audioStream.getTracks().forEach(t => t.stop());
      throw new Error('Screen recording cancelled.');
    }

    // If user clicks "Stop Sharing" in the browser UI, stop the recorder
    videoStream.getVideoTracks()[0].onended = () => {
      if (recorder && recorder.state === 'recording') {
        stopRecording();
      }
    };

    const combined = new MediaStream();
    videoStream.getVideoTracks().forEach(track => combined.addTrack(track));
    
    if (audioStream.getAudioTracks().length > 0) {
      audioStream.getAudioTracks().forEach(track => combined.addTrack(track));
      console.log('Audio track added to recording stream');
    } else {
      console.warn('No audio tracks found in microphone stream');
      els.recordStatus.textContent = 'Warning: No microphone audio detected.';
    }

    // Priority: MP4 (AAC) -> MP4 (Generic) -> WebM (VP9/Opus) -> WebM (Default)
    // We restored explicit AAC check for MP4 to ensure audio compatibility.
    // We keep H.264 WebM disabled to avoid green screen issues.
    const mimeTypes = [
      'video/mp4;codecs="avc1.42E01E, mp4a.40.2"', // Standard MP4 (H.264 + AAC)
      'video/mp4',                                 // Generic MP4
      'video/webm;codecs=vp9,opus',                // WebM High Quality (VP9 + Opus)
      'video/webm;codecs=vp8,opus',                // WebM Standard (VP8 + Opus)
      'video/webm'                                 // Browser default
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

    // Balanced quality for presentations: 1080p 60fps @ 8-10 Mbps
    // This provides crisp slides + smooth animations without excessive file sizes
    // (Good balance between quality and shareability on YouTube/courses)
    recorder = new MediaRecorder(combined, { 
      mimeType,
      videoBitsPerSecond: 8000000,  // 8 Mbps - optimal for 1080p60 presentation quality
      audioBitsPerSecond: 128000    // 128 kbps audio
    });
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
      
      let msg = `Recording saved as ${ext.toUpperCase()} (${mimeType.split(';')[0]}).`;
      if (ext === 'webm') {
        msg += ' Use VLC to play. For better quality: Use FFmpeg or HandBrake to re-encode (e.g., libx264 or libx265).';
      } else if (ext === 'mp4') {
        msg += ' For maximum quality: Re-encode with HandBrake using H.265 codec.';
      }
      els.recordStatus.textContent = msg;
      
      els.recordStart.disabled = false;
      els.recordStop.disabled = true;
      if (els.helpFooter) {
        els.helpFooter.style.display = '';
        els.helpFooter.style.visibility = 'visible';
        els.helpFooter.style.height = 'auto';
        els.helpFooter.style.padding = 'var(--space-4)';
        els.helpFooter.style.margin = '';
        els.helpFooter.style.border = '1px solid var(--border)';
      }
      if (els.presentRecordBtn) {
        els.presentRecordBtn.textContent = 'Start Recording';
        els.presentRecordBtn.classList.remove('recording');
      }
    };
    recorder.start();
    els.recordStatus.textContent = 'Recording… (1080p60 @ 8Mbps - optimized for presentation quality). Use Stop to finish.';
    els.recordStart.disabled = true;
    els.recordStop.disabled = false;
    if (els.helpFooter) {
      els.helpFooter.style.setProperty('display', 'none', 'important');
      els.helpFooter.style.visibility = 'hidden';
      els.helpFooter.style.height = '0';
      els.helpFooter.style.padding = '0';
      els.helpFooter.style.margin = '0';
      els.helpFooter.style.border = 'none';
    }
    if (els.presentRecordBtn) {
      els.presentRecordBtn.textContent = 'Stop Recording';
      els.presentRecordBtn.classList.add('recording');
    }
  } catch (e) {
    els.recordStatus.textContent = 'Recording failed: ' + e.message;
  }
};

const stopRecording = () => {
  try {
    if (recorder) recorder.stop();
  } catch (e) {
    els.recordStatus.textContent = 'Stop failed: ' + e.message;
  }
};

els.recordStart.addEventListener('click', startRecording);
els.recordStop.addEventListener('click', stopRecording);

els.presentRecordBtn?.addEventListener('click', () => {
  if (recorder && recorder.state === 'recording') {
    stopRecording();
  } else {
    startRecording();
  }
});

els.closeSubtitlesDialog?.addEventListener('click', () => {
  els.subtitlesDialog.close();
});

// ============================================================================
// NOTES WITH UNDO/REDO
// ============================================================================

if (els.notesText) {
  els.notesText.value = settings.get('notes', '');
  initializeNotesHistory();

  els.notesText.addEventListener('input', () => {
    clearTimeout(notesDebounceTimer);
    notesDebounceTimer = setTimeout(() => {
      notesHistory.push(els.notesText.value);
      settings.set('notes', els.notesText.value);
    }, 300);
  });

  // Keyboard shortcuts for Undo/Redo
  window.addEventListener('keydown', (e) => {
    if (els.notesText === document.activeElement) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (isCtrlOrCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const undoValue = notesHistory.undo();
        if (undoValue !== null) {
          els.notesText.value = undoValue;
          settings.set('notes', undoValue);
        }
      }

      if ((isCtrlOrCmd && e.shiftKey && e.key === 'z') || (isCtrlOrCmd && e.key === 'y')) {
        e.preventDefault();
        const redoValue = notesHistory.redo();
        if (redoValue !== null) {
          els.notesText.value = redoValue;
          settings.set('notes', redoValue);
        }
      }
    }
  });
}
