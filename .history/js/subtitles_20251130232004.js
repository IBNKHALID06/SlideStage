export class Subtitles {
  constructor(overlayEl, settings) {
    this.overlayEl = overlayEl;
    this.settings = settings;
    this.enabled = false;
    this.recognition = null;
    this.finalText = '';
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
      this.finalText = '';

      this.recognition.onresult = (event) => {
        let interim = '';
        let newFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newFinal += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (newFinal) {
          // Keep only the last ~100 characters of final text to avoid screen clutter
          this.finalText = (this.finalText + ' ' + newFinal).trim();
          if (this.finalText.length > 100) {
             // rough approximation: keep last 2 sentences
             const parts = this.finalText.split('. ');
             if (parts.length > 2) {
               this.finalText = parts.slice(-2).join('. ');
             }
          }
        }

        // Display with visual distinction
        // Final text is slightly dimmed, Interim (active) text is bright/highlighted
        this.overlayEl.innerHTML = `
          <span style="opacity: 0.8;">${this.finalText}</span>
          <span style="opacity: 1.0; font-weight: 600; color: #fff; text-shadow: 0 0 10px rgba(79, 140, 255, 0.6);">${interim}</span>
        `;
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
