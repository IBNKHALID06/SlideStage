// VoskCore: load WASM + model from public/models/vosk and process audio
// Placeholder structure with API; implement actual Vosk wiring after model placement.
export class VoskCore {
  constructor() {
    this.modelLoaded = false;
    this.onPartialCb = null;
    this.onFinalCb = null;
    this.recognizer = null; // to be wired to Vosk WASM
  }
  async loadVoskModel() {
    // TODO: load Vosk WASM and model files from /models/vosk/
    // Keep API compatible; mark loaded flag.
    this.modelLoaded = true;
    return true;
  }
  async startVoskRecognition(stream) {
    if (!this.modelLoaded) throw new Error('Model not loaded');
    // TODO: connect audio chunks to Vosk recognizer
    return true;
  }
  onPartial(cb) { this.onPartialCb = cb; }
  onFinal(cb) { this.onFinalCb = cb; }
}
