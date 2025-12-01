// SlidesCore: PDF loading and navigation, no UI
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export class SlidesCore {
  constructor() {
    this.pdf = null;
    this.pageNum = 1;
    this.total = 0;
  }
  async loadPDF(file) {
    const data = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data });
    this.pdf = await loadingTask.promise;
    this.total = this.pdf.numPages;
    this.pageNum = 1;
    return this.total;
  }
  async getPage(num) {
    if (!this.pdf) throw new Error('PDF not loaded');
    if (num < 1 || num > this.total) throw new Error('Page out of range');
    this.pageNum = num;
    return await this.pdf.getPage(num);
  }
  async nextPage() {
    if (!this.pdf) throw new Error('PDF not loaded');
    if (this.pageNum < this.total) this.pageNum += 1;
    return await this.getPage(this.pageNum);
  }
  async prevPage() {
    if (!this.pdf) throw new Error('PDF not loaded');
    if (this.pageNum > 1) this.pageNum -= 1;
    return await this.getPage(this.pageNum);
  }
}
