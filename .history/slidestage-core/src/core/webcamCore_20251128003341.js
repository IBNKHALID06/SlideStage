// WebcamCore: start/stop webcam and return stream
export class WebcamCore {
  constructor() {
    this.stream = null;
  }
  async startWebcam() {
    this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    return this.stream;
  }
  stopWebcam() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
  getWebcamStream() {
    return this.stream;
  }
}
