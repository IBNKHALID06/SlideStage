// MicCore: start mic, provide raw audio chunks via callback
export class MicCore {
  constructor() {
    this.stream = null;
    this.ctx = null;
    this.processor = null;
    this.onChunk = null;
  }
  async startMic(onChunk) {
    this.onChunk = onChunk;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = this.ctx.createMediaStreamSource(this.stream);
    // Use ScriptProcessorNode for broad compatibility
    const bufferSize = 4096;
    this.processor = this.ctx.createScriptProcessor(bufferSize, 1, 1);
    this.processor.onaudioprocess = (e) => {
      if (!this.onChunk) return;
      const input = e.inputBuffer.getChannelData(0);
      // Copy to avoid re-use issues
      const copy = new Float32Array(input.length);
      copy.set(input);
      this.onChunk(copy);
    };
    source.connect(this.processor);
    this.processor.connect(this.ctx.destination);
    return true;
  }
  async stopMic() {
    if (this.processor) try { this.processor.disconnect(); } catch {}
    this.processor = null;
    if (this.ctx) try { await this.ctx.close(); } catch {}
    this.ctx = null;
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
}
