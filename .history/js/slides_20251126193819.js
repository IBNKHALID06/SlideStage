export class SlideViewer {
  constructor(canvas, onPageChange) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onPageChange = onPageChange;
    this.pdf = null;
    this.pageNum = 1;
    this.total = 0;
  }

  async _ensurePdfLib() {
    // Wait for pdf.js to load (it's loaded via CDN script tag)
    let maxRetries = 50;
    while (!window.pdfjsLib && maxRetries > 0) {
      await new Promise(r => setTimeout(r, 100));
      maxRetries--;
    }
    if (!window.pdfjsLib) throw new Error('pdf.js library failed to load');
    return window.pdfjsLib;
  }

  async loadFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    try {
      const pdfjsLib = await this._ensurePdfLib();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      this.pdf = await loadingTask.promise;
      this.total = this.pdf.numPages;
      this.pageNum = 1;
      await this.render();
    } catch (e) {
      alert('Unable to open PDF: ' + e.message);
    }
  }

  async render() {
    if (!this.pdf) return;
    const page = await this.pdf.getPage(this.pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = this.canvas;
    const ctx = this.ctx;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    this.onPageChange?.(this.pageNum, this.total);
  }

  async next() {
    if (!this.pdf) return;
    if (this.pageNum < this.total) {
      this.pageNum += 1;
      await this.render();
    }
  }

  async prev() {
    if (!this.pdf) return;
    if (this.pageNum > 1) {
      this.pageNum -= 1;
      await this.render();
    }
  }
}
