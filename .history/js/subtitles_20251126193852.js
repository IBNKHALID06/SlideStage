// Minimal Vosk-in-browser integration placeholder.
// This module wires microphone capture and displays recognized text.
// To keep MVP simple, we provide initialization and UI hooks,
// and allow selecting a model URL or loading local model files in future iterations.

// Simple audio level visualization for MVP.
// Vosk integration deferred; requires local model setup.

export class Subtitles {
  constructor(overlayEl, settings) {
    this.overlayEl = overlayEl;
    this.settings = settings;
    this.enabled = false;
    this.stream = null;
    this.audioCtx = null;
    this.analyser = null;
  }

  async enable() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);

      const data = new Uint8Array(this.analyser.fftSize);
      this.enabled = true;
      this.overlayEl.classList.remove('hidden');

      const loop = () => {
        if (!this.enabled) return;
        this.analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        this.overlayEl.textContent = rms > 0.02 ? '🎤 Listening…' : '';
        requestAnimationFrame(loop);
      };
      loop();
      return true;
    } catch (e) {
      alert('Subtitles unavailable: ' + e.message);
      return false;
    }
  }

  async disable() {
    this.enabled = false;
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch {}
      this.analyser = null;
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
