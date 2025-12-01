// Minimal PDF.js shim - for MVP only
// This loads pdf.js from cdnjs (usually more reliable)
window.ensurePdfJs = async () => {
  if (typeof pdfjsLib !== 'undefined') {
    return true;
  }

  console.log('Attempting to load pdf.js from cdnjs...');
  return new Promise((resolve) => {
    const script = document.createElement('script');
    // Use a specific, stable version
    const version = '3.11.174'; 
    script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.min.js`;
    
    script.onload = () => {
      console.log('pdf.js loaded from cdnjs');
      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
        resolve(true);
      } else {
        console.error('pdfjsLib undefined after load');
        resolve(false);
      }
    };
    
    script.onerror = () => {
      console.error('cdnjs failed, trying unpkg fallback...');
      const fallback = document.createElement('script');
      fallback.src = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js';
      fallback.onload = () => {
        console.log('pdf.js loaded from unpkg fallback');
        if (typeof pdfjsLib !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
          resolve(true);
        } else {
          resolve(false);
        }
      };
      fallback.onerror = () => {
        console.error('All CDNs failed to load pdf.js');
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
