// Minimal PDF.js shim - for MVP only
// This loads pdf.js from unpkg (alternative CDN)
// Falls back to pdfobject as last resort
window.ensurePdfJs = async () => {
  if (typeof pdfjsLib !== 'undefined') {
    return true;
  }

  // Try unpkg CDN (different provider)
  console.log('Attempting to load from unpkg...');
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/pdfjs-dist@3.11.313/build/pdf.min.js';
    script.onload = () => {
      console.log('pdf.js loaded from unpkg');
      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.313/build/pdf.worker.min.js';
        resolve(true);
      } else {
        resolve(false);
      }
    };
    script.onerror = () => {
      console.error('unpkg failed, trying fallback...');
      // If all else fails, try one more CDN
      const fallback = document.createElement('script');
      fallback.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.313/pdf.min.js';
      fallback.onload = () => {
        console.log('pdf.js loaded from Cloudflare fallback');
        if (typeof pdfjsLib !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.313/pdf.worker.min.js';
          resolve(true);
        } else {
          resolve(false);
        }
      };
      fallback.onerror = () => {
        console.error('All CDNs failed');
        resolve(false);
      };
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
  });
};

// Start loading immediately
window.ensurePdfJs().then(ok => {
  if (ok && typeof pdfjsLib !== 'undefined') {
    console.log('✓ pdf.js ready, version:', pdfjsLib.version);
  } else {
    console.warn('⚠ pdf.js not available - PDF upload will fail');
  }
});
