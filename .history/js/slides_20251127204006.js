export class SlideViewer {
  constructor(canvas, onPageChange) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.onPageChange = onPageChange;
    this.pdf = null;
    this.pageNum = 1;
    this.total = 0;
    this.pdfDataUrl = null;
    this.useFallback = false;
  }

  async _ensurePdfLib() {
    // Use the global waiter if available
    if (window.ensurePdfJs) {
      const ok = await window.ensurePdfJs();
      if (!ok) throw new Error('pdf.js library failed to load from CDN');
    } else {
      throw new Error('pdf.js initialization not found');
    }
    
    // Ensure worker is configured
    if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.313/build/pdf.worker.min.js';
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
      
      // Try pdf.js first
      try {
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
        this.useFallback = false;
        await this.render();
      } catch (pdfErr) {
        // pdf.js failed, fall back to browser's native viewer
        console.warn('pdf.js failed, using browser PDF viewer:', pdfErr.message);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          this.pdfDataUrl = e.target.result;
          this.useFallback = true;
          this.total = 1; // Unknown page count
          this.pageNum = 1;
          this.renderFallback();
        };
        reader.onerror = () => {
          throw new Error('Failed to read file');
        };
        reader.readAsDataURL(file);
      }
    } catch (e) {
      console.error('PDF loading error:', e);
      alert('Unable to open PDF:\n' + e.message);
    }
  }

  renderFallback() {
    // Display PDF using browser's native viewer in an iframe without destroying canvas
    if (!this.pdfDataUrl || !this.canvas) return;
    const container = this.canvas.parentElement;
    if (!container) return;
    // Hide the canvas so future PDF loads can reuse it
    this.canvas.style.display = 'none';
    // Avoid duplicating iframes on repeated calls
    if (!container.querySelector('iframe[data-fallback-pdf]')) {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('data-fallback-pdf', 'true');
      iframe.title = 'PDF Viewer (Browser Native)';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.src = this.pdfDataUrl;
      container.appendChild(iframe);
    }
    this.onPageChange?.(1, 1);
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
    if (!this.pdf && !this.useFallback) return;
    if (this.useFallback) {
      alert('PDF viewer: Use browser controls to navigate');
      return;
    }
    if (this.pageNum < this.total) {
      this.pageNum += 1;
      await this.render();
    }
  }

  async prev() {
    if (!this.pdf && !this.useFallback) return;
    if (this.useFallback) {
      alert('PDF viewer: Use browser controls to navigate');
      return;
    }
    if (this.pageNum > 1) {
      this.pageNum -= 1;
      await this.render();
    }
  }
}
