export class SlideViewer {
  constructor(canvas, onPageChange) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.onPageChange = onPageChange;
    this.pdf = null;
    this.pageNum = 1;
    this.total = 0;
  }

  async _ensurePdfLib() {
    // Wait for pdf.js to load (it's loaded via CDN script tag)
    let maxRetries = 100;
    while (!window.pdfjsLib && maxRetries > 0) {
      await new Promise(r => setTimeout(r, 50));
      maxRetries--;
    }
    if (!window.pdfjsLib) {
      throw new Error('pdf.js library failed to load from CDN. Check network or console errors.');
    }
    // Ensure worker is configured
    if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.313/pdf.worker.min.js';
    }
    return window.pdfjsLib;
  }

  async loadFile(file) {
    if (!file) {
      alert('No file selected');
      return;
    }
    
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      alert('File must be a PDF. You selected: ' + file.name);
      return;
    }

    try {
      console.log('Loading PDF:', file.name, 'Size:', file.size);
      const arrayBuffer = await file.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('File is empty');
      }
      
      const pdfjsLib = await this._ensurePdfLib();
      console.log('pdf.js lib loaded, version:', pdfjsLib.version);
      
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      this.pdf = await loadingTask.promise;
      this.total = this.pdf.numPages;
      this.pageNum = 1;
      
      console.log('PDF loaded successfully. Pages:', this.total);
      await this.render();
    } catch (e) {
      console.error('PDF loading error:', e);
      alert('Unable to open PDF:\n' + e.message);
    }
  }

  async render() {
    if (!this.pdf || !this.canvas) {
      console.warn('PDF or canvas not ready');
      return;
    }
    
    try {
      const page = await this.pdf.getPage(this.pageNum);
      if (!page) throw new Error('Page ' + this.pageNum + ' not found');
      
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = this.canvas;
      const ctx = this.ctx;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
      this.onPageChange?.(this.pageNum, this.total);
    } catch (e) {
      console.error('Render error:', e);
      this.onPageChange?.(this.pageNum, this.total);
    }
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
