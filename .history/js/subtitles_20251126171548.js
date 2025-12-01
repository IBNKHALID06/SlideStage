// Minimal Vosk-in-browser integration placeholder.
// This module wires microphone capture and displays recognized text.
// To keep MVP simple, we provide initialization and UI hooks,
// and allow selecting a model URL or loading local model files in future iterations.

export class Subtitles {
  constructor(overlayEl, settings) {
    this.overlayEl = overlayEl;
    this.settings = settings;
    this.enabled = false;
    this.stream = null;
    this.audioCtx = null;
    this.processor = null;
    this.recognizer = null; // Vosk recognizer instance (to be initialized)
  }

  async enable() {
    // Lazy initialize mic and WASM recognizer.
    try {
      // Mic capture
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      // Use ScriptProcessor as a simple bridge for MVP (deprecated, but widely available)
      this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
      source.connect(this.processor);
      this.processor.connect(this.audioCtx.destination);

      // Placeholder recognizer pipeline: no-op transcription
      // In a follow-up step, we will load Vosk WASM and a small model.
      // For now, display a simple live level indicator to validate audio path.
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      const loop = () => {
        if (!this.enabled) return;
        analyser.getByteTimeDomainData(data);
        // Compute rough RMS
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        this.overlayEl.textContent = rms > 0.02 ? 'Listening…' : '';
        requestAnimationFrame(loop);
      };
      this.enabled = true;
      this.overlayEl.classList.remove('hidden');
      loop();
      return true;
    } catch (e) {
      alert('Unable to access microphone: ' + e.message);
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
    this.overlayEl.classList.add('hidden');
    this.overlayEl.textContent = '';
  }
}
