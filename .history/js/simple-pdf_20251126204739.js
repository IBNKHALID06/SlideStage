// Minimal PDF text/image extraction without external dependencies
// For MVP: converts PDF to images by rendering with canvas
// Note: This is a fallback when pdf.js is not available

export class SimplePdfViewer {
  constructor() {
    this.pages = [];
    this.currentPage = 0;
  }

  async loadFromFile(file) {
    // Read file as data URL for embedding
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // For MVP: we'll use an iframe to display PDF
          // This works on all browsers without external JS
          this.pdfDataUrl = e.target.result;
          this.fileName = file.name;
          resolve(true);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // Display PDF in an iframe (browser's native PDF viewer)
  displayInIframe(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
      <iframe 
        src="${this.pdfDataUrl}" 
        style="width: 100%; height: 100%; border: none;"
        title="PDF Viewer"
      ></iframe>
    `;
  }
}
