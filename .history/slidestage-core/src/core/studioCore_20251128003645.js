// StudioCore: orchestrates modules, no UI
import { SlidesCore } from './slidesCore.js';
import { WebcamCore } from './webcamCore.js';
import { MicCore } from './micCore.js';
import { VoskCore } from './voskCore.js';
import { RecorderCore } from './recorderCore.js';

export class StudioCore {
  constructor() {
    this.slides = new SlidesCore();
    this.webcam = new WebcamCore();
    this.mic = new MicCore();
    this.vosk = new VoskCore();
    this.rec = new RecorderCore();
  }
  async init() {
    await this.vosk.loadVoskModel().catch(() => {});
  }
  wire() {
    this.mic.startMic((chunk) => {
      // TODO: feed chunk to Vosk recognizer once implemented
      // For now, log chunk length as test
      console.log('Mic chunk', chunk.length);
    });
    this.vosk.onPartial((text) => console.log('Partial:', text));
    this.vosk.onFinal((text) => console.log('Final:', text));
    this.rec.onRecordingReady((blob) => console.log('Recording blob size:', blob.size));
  }
}
