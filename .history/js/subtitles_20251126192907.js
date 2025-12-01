// Minimal Vosk-in-browser integration placeholder.
// This module wires microphone capture and displays recognized text.
// To keep MVP simple, we provide initialization and UI hooks,
// and allow selecting a model URL or loading local model files in future iterations.

// Uses vosk-browser via CDN to run offline WASM STT.
// Model files must be present in assets/models/en/ (unzipped).
// We default to English small model layout: model.json at that path.

export class Subtitles {
  constructor(overlayEl, settings) {
    this.overlayEl = overlayEl;
    this.settings = settings;
    this.enabled = false;
    this.stream = null;
    this.audioCtx = null;
    this.processor = null;
    this.recognizer = null; // Vosk recognizer instance (to be initialized)
    this.vosk = null; // vosk-browser module
    this.model = null; // loaded model
    this.sampleRate = 16000; // typical Vosk SR
  }

  async enable() {
    // Lazy initialize mic and WASM recognizer.
    try {
      // Mic capture
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: this.sampleRate });
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      // Create processor that delivers PCM frames to recognizer
      this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
      source.connect(this.processor);
      this.processor.connect(this.audioCtx.destination);

      // Load vosk-browser from CDN and initialize model
      if (!this.vosk) {
        try {
          this.vosk = await import('https://unpkg.com/vosk-browser@0.0.17/dist/vosk-browser.mjs');
        } catch (e) {
          console.warn('Failed to load vosk-browser from CDN', e);
          throw new Error('Vosk library not available');
        }
      }

      if (!this.model) {
        // Expect assets/models/en containing model.json and required files
        const modelPath = this.settings.get('vosk.modelPath', 'assets/models/en');
        // Initialize Vosk worker
        await this.vosk.init({ wasmPrefix: 'https://unpkg.com/vosk-browser@0.0.17/dist/' });
        try {
          this.model = await this.vosk.createModel(modelPath);
        } catch (e) {
          console.warn('Failed to load Vosk model from', modelPath, e);
          throw new Error('Vosk model not found at ' + modelPath);
        }
        await this.model.initialize();
      }

      this.recognizer = await this.model.createRecognizer(this.sampleRate);
      this.recognizer.setWords(true);

      // Audio processing loop: forward PCM to recognizer
      this.processor.onaudioprocess = async (ev) => {
        if (!this.enabled || !this.recognizer) return;
        const input = ev.inputBuffer.getChannelData(0);
        // Convert float [-1,1] to 16-bit PCM
        const pcm16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          let s = Math.max(-1, Math.min(1, input[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const res = await this.recognizer.acceptWaveform(pcm16);
        if (res) {
          const { text } = await this.recognizer.result();
          this.overlayEl.textContent = text || '';
        } else {
          const { partial } = await this.recognizer.partialResult();
          this.overlayEl.textContent = partial || 'Listening…';
        }
      };

      this.enabled = true;
      this.overlayEl.classList.remove('hidden');
      return true;
    } catch (e) {
      alert('Subtitles unavailable: ' + e.message);
      return false;
    }
  }

  async disable() {
    this.enabled = false;
    if (this.processor) {
      try { this.processor.disconnect(); } catch {}
      this.processor = null;
    }
    if (this.audioCtx) {
      try { await this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.recognizer) {
      try { await this.recognizer.free(); } catch {}
      this.recognizer = null;
    }
    this.overlayEl.classList.add('hidden');
    this.overlayEl.textContent = '';
  }
}
