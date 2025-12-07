export class Subtitles {
  constructor(overlayEl, settings) {
    this.overlayEl = overlayEl;
    this.settings = settings;
    this.enabled = false;
    this.recognition = null;
    this.finalText = '';
    this.clearTimer = null;
    this.fullTranscript = ''; // Full transcript for export
    this.transcriptWindow = null; // Reference to floating window
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
          this.finalText = (this.finalText + ' ' + newFinal).trim();
          // Add to full transcript for export
          this.fullTranscript += (this.fullTranscript ? ' ' : '') + newFinal;
          // Update floating transcript window if open
          this.updateTranscriptWindow();
          // Rolling window: keep only the last 12 words to prevent piling up
          const words = this.finalText.split(' ');
          if (words.length > 12) {
            this.finalText = '...' + words.slice(-12).join(' ');
          }
        }

        // Display with visual distinction
        this.overlayEl.innerHTML = `
          <span style="opacity: 0.7;">${this.finalText}</span>
          <span style="opacity: 1.0; font-weight: 600; color: #fff; text-shadow: 0 0 10px rgba(79, 140, 255, 0.6);">${interim}</span>
        `;

        // Auto-clear text after 3 seconds of silence
        if (this.clearTimer) clearTimeout(this.clearTimer);
        this.clearTimer = setTimeout(() => {
          this.finalText = '';
          this.overlayEl.innerHTML = '';
        }, 3000);
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

  openTranscriptWindow() {
    if (this.transcriptWindow && !this.transcriptWindow.closed) {
      this.transcriptWindow.focus();
      return;
    }

    const width = 400;
    const height = 600;
    const left = window.screenX + window.outerWidth - width - 20;
    const top = window.screenY + 80;

    this.transcriptWindow = window.open(
      '',
      'SlideStageTranscript',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (this.transcriptWindow) {
      this.transcriptWindow.document.title = 'SlideStage Transcript';
      this.transcriptWindow.document.body.style.cssText = `
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0f1115;
        color: #ffffffde;
        padding: 16px;
        margin: 0;
        font-size: 14px;
        line-height: 1.6;
      `;
      
      const header = this.transcriptWindow.document.createElement('div');
      header.style.cssText = 'margin-bottom: 12px; border-bottom: 1px solid #424245; padding-bottom: 12px;';
      header.innerHTML = `
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #0a84ff;">Live Transcript</h3>
        <button id="copyBtn" style="padding: 4px 12px; background: #0a84ff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; margin-right: 8px;">Copy</button>
        <button id="clearBtn" style="padding: 4px 12px; background: #424245; color: #ffffffde; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">Clear</button>
      `;
      this.transcriptWindow.document.body.appendChild(header);

      const textDiv = this.transcriptWindow.document.createElement('div');
      textDiv.id = 'transcriptText';
      textDiv.style.cssText = 'white-space: pre-wrap; word-wrap: break-word; max-height: 500px; overflow-y: auto;';
      textDiv.textContent = this.fullTranscript || '(Waiting for speech...)';
      this.transcriptWindow.document.body.appendChild(textDiv);

      // Copy button handler
      this.transcriptWindow.document.getElementById('copyBtn').onclick = () => {
        navigator.clipboard.writeText(this.fullTranscript);
        const btn = this.transcriptWindow.document.getElementById('copyBtn');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      };

      // Clear button handler
      this.transcriptWindow.document.getElementById('clearBtn').onclick = () => {
        this.fullTranscript = '';
        this.updateTranscriptWindow();
      };
    }
  }

  updateTranscriptWindow() {
    if (this.transcriptWindow && !this.transcriptWindow.closed) {
      const textDiv = this.transcriptWindow.document.getElementById('transcriptText');
      if (textDiv) {
        textDiv.textContent = this.fullTranscript || '(Waiting for speech...)';
        textDiv.scrollTop = textDiv.scrollHeight; // Auto-scroll to bottom
      }
    }
  }

  exportTranscript() {
    if (!this.fullTranscript) {
      alert('No transcript to export.');
      return;
    }
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.fullTranscript));
    element.setAttribute('download', `SlideStage-Transcript-${new Date().toISOString().split('T')[0]}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
}
