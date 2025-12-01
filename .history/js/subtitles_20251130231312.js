export class Subtitles {
  constructor(overlayEl, settings) {
    this.overlayEl = overlayEl;
    this.settings = settings;
    this.enabled = false;
    this.recognition = null;
  }

  async enable() {
    if (this.enabled) return { success: true };

    // Use the native Web Speech API (Chrome/Edge/Safari)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return { success: false, error: 'Browser does not support Web Speech API. Please use Chrome, Edge, or Safari.' };
    }

    try {
      this.recognition = new SpeechRecognition();
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
        // Display the text
        this.overlayEl.textContent = final || interim;
      };

      this.recognition.onerror = (event) => {
        console.warn('Subtitle error:', event.error);
        if (event.error === 'not-allowed') {
           this.overlayEl.textContent = 'Microphone access denied.';
        } else if (event.error === 'network') {
           this.overlayEl.textContent = 'Network error (Web Speech requires internet).';
        }
      };
      
      this.recognition.onend = () => {
          // Auto-restart if it stops unexpectedly while enabled
          if (this.enabled) {
              try { this.recognition.start(); } catch(e) { console.log('Restart ignored', e); }
          }
      };

      this.recognition.start();
      this.enabled = true;
      this.overlayEl.classList.remove('hidden');
      this.overlayEl.textContent = 'Listening...';
      return { success: true, mode: 'native' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  disable() {
    this.enabled = false;
    this.overlayEl.classList.add('hidden');
    this.overlayEl.textContent = '';
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }
}
