export class Subtitles {
  constructor(overlayEl, settings) {
    this.overlayEl = overlayEl;
    this.settings = settings;
    this.enabled = false;
    this.model = null;
    this.recognizer = null;
    this.audioCtx = null;
    this.mediaStream = null;
    this.source = null;
    this.processor = null;
  }

  async _loadVoskLib() {
    if (window.Vosk) return true;
    
    const urls = [
      'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.9/dist/vosk.js',
      'https://unpkg.com/vosk-browser@0.0.9/dist/vosk.js'
    ];

    for (const url of urls) {
      try {
        await new Promise((resolve, reject) => {
          console.log('Attempting to load Vosk from:', url);
          const script = document.createElement('script');
          script.src = url;
          script.onload = () => {
            if (window.Vosk) resolve();
            else reject(new Error('Vosk loaded but symbol missing'));
          };
          script.onerror = () => reject(new Error('Network error'));
          document.head.appendChild(script);
        });
        console.log('Vosk loaded successfully from:', url);
        return true;
      } catch (e) {
        console.warn('Failed to load Vosk from', url, e);
      }
    }
    throw new Error('Failed to load Vosk library from all CDNs');
  }

  async enable() {
    if (this.enabled) return true;

    try {
      this.overlayEl.classList.remove('hidden');
      this.overlayEl.textContent = 'Loading Vosk library...';

      // Ensure library is loaded
      await this._loadVoskLib();

      this.overlayEl.textContent = 'Loading Vosk model...';

      if (!this.model) {
        // Attempt to load a lightweight English model from a public URL for immediate utility
        const modelUrl = 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.zip';
        
        if (!window.Vosk) {
          throw new Error('Vosk library not loaded.');
        }

        // Set the log level to silence debug info
        window.Vosk.setLogLevel(-1);
        
        this.model = await window.Vosk.createModel(modelUrl);
      }

      this.recognizer = new this.model.KaldiRecognizer(16000);
      
      this.recognizer.on("result", (message) => {
        const result = message.result;
        if (result && result.text) {
          this.overlayEl.textContent = result.text;
        }
      });

      this.recognizer.on("partialresult", (message) => {
        const partial = message.result;
        if (partial && partial.partial) {
          this.overlayEl.textContent = partial.partial;
        }
      });

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 16000
        }
      });

      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      this.source = this.audioCtx.createMediaStreamSource(this.mediaStream);
      
      // Use a ScriptProcessorNode for simplicity
      this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (event) => {
        if (!this.enabled || !this.recognizer) return;
        this.recognizer.acceptWaveform(event.inputBuffer);
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioCtx.destination);

      this.enabled = true;
      this.overlayEl.textContent = 'Listening...';
      return true;

    } catch (e) {
      console.error('Vosk Error:', e);
      this.overlayEl.textContent = 'Error loading subtitles. Check console.';
      alert('Failed to initialize subtitles: ' + e.message);
      this.disable();
      return false;
    }
  }

  async disable() {
    this.enabled = false;
    this.overlayEl.classList.add('hidden');
    this.overlayEl.textContent = '';
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.audioCtx) {
      try { await this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }
  }
}
