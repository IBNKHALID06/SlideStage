// RecorderCore: start/stop recording, produce webm blob
export class RecorderCore {
  constructor() {
    this.recorder = null;
    this.chunks = [];
    this.onReady = null;
  }
  async startRecording(stream = null) {
    let capture = stream;
    if (!capture) {
      capture = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    }
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
    this.chunks = [];
    this.recorder = new MediaRecorder(capture, { mimeType });
    this.recorder.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: 'video/webm' });
      if (this.onReady) this.onReady(blob);
    };
    this.recorder.start();
    return true;
  }
  stopRecording() {
    if (this.recorder) this.recorder.stop();
  }
  onRecordingReady(cb) { this.onReady = cb; }
}
