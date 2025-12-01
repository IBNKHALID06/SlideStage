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
    
    // We try the official demo hosted version first as it's most likely to match the model and WASM
    const urls = [
      'https://ccoreilly.github.io/vosk-browser/vosk.js', 
      'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.9/dist/vosk.js',
      'https://unpkg.com/vosk-browser@0.0.9/dist/vosk.js'
    ];

    for (const url of urls) {
      try {
        await new Promise((resolve, reject) => {
          console.log('Attempting to load Vosk from:', url);
          const script = document.createElement('script');
          script.src = url;
          script.async = true;
          script.onload = () => {
            // Small delay to ensure global is registered
            setTimeout(() => {
              if (window.Vosk) resolve();
              else reject(new Error('Vosk loaded but symbol missing'));
            }, 100);
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
    throw new Error('Failed to load Vosk library. Please check your internet connection or ad blockers.');
  }

  async enable() {
    if (this.enabled) return true;

    try {
      this.overlayEl.classList.remove('hidden');
      this.overlayEl.textContent = 'Initializing audio...';

      // 1. Load Library
      await this._loadVoskLib();

      // 2. Setup Audio Context (must be after user gesture)
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.overlayEl.textContent = 'Loading speech model...';

      // 3. Load Model
      if (!this.model) {
        const modelUrl = 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.zip';
        
        // Set log level to silence debug info
        if (window.Vosk.setLogLevel) window.Vosk.setLogLevel(-1);
        
        this.model = await window.Vosk.createModel(modelUrl);
      }

      // 4. Create Recognizer
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

      // 5. Get Microphone Stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 16000
        }
      });

      this.source = this.audioCtx.createMediaStreamSource(this.mediaStream);
      
      // 6. Process Audio
      // Use ScriptProcessor for broad compatibility
      this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (event) => {
        if (!this.enabled || !this.recognizer) return;
        try {
          // Ensure we are passing the correct buffer format
          // Vosk browser expects AudioBuffer or Float32Array depending on implementation
          // The acceptWaveform method in vosk-browser handles AudioBuffer directly usually
          this.recognizer.acceptWaveform(event.inputBuffer);
        } catch (err) {
          console.error('Audio process error:', err);
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioCtx.destination);

      this.enabled = true;
      this.overlayEl.textContent = 'Listening (Vosk)...';
      return { success: true };

    } catch (e) {
      console.error('Vosk Error:', e);
      // Fallback to Web Speech API
      console.log('Falling back to Web Speech API...');
      return this._enableWebSpeech();
    }
  }

  async _enableWebSpeech() {
    if (!('webkitSpeechRecognition' in window)) {
      return { success: false, error: 'Vosk failed and Web Speech API not supported.' };
    }

    try {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        this.overlayEl.textContent = final || interim;
      };

      this.recognition.onerror = (event) => {
        console.error('Web Speech API error:', event.error);
        if (event.error === 'not-allowed') {
          this.overlayEl.textContent = 'Microphone permission denied.';
        }
      };

      this.recognition.start();
      this.enabled = true;
      this.overlayEl.classList.remove('hidden');
      this.overlayEl.textContent = 'Listening (Web Speech)...';
      return { success: true, mode: 'web-speech' };
    } catch (e) {
      return { success: false, error: 'All subtitle methods failed: ' + e.message };
    }
  }

  disable() {
    this.enabled = false;
    this.overlayEl.classList.add('hidden');
    this.overlayEl.textContent = '';
    
    // Stop Vosk
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
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }

    // Stop Web Speech
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
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
