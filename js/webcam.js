export class WebcamOverlay {
  constructor(boxEl, videoEl, settings) {
    this.boxEl = boxEl;
    this.videoEl = videoEl;
    this.settings = settings;
    this.stream = null;
    this.enabled = false;

    // Restore position/size
    const webcamState = this.settings.get('webcam', {});
    const pos = webcamState.position;
    if (pos) {
      this.boxEl.style.left = pos.left + 'px';
      this.boxEl.style.top = pos.top + 'px';
      this.boxEl.style.right = 'auto';
      this.boxEl.style.bottom = 'auto';
    }
    const size = webcamState.size;
    if (size) {
      this.boxEl.style.width = size.w + 'px';
      this.boxEl.style.height = size.h + 'px';
    }

    this._bindDrag();
    this._bindResize();
  }

  async enable() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      this.videoEl.srcObject = this.stream;
      this.boxEl.classList.remove('hidden');
      this.enabled = true;
      return true;
    } catch (e) {
      alert('Unable to access webcam: ' + e.message);
      return false;
    }
  }

  async disable() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.boxEl.classList.add('hidden');
    this.enabled = false;
  }

  _bindDrag() {
    let dragging = false;
    let startX = 0, startY = 0;
    let origLeft = 0, origTop = 0;

    const onMouseDown = (e) => {
      if (e.target.classList.contains('resize-handle')) return; // skip when resizing
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = this.boxEl.getBoundingClientRect();
      origLeft = rect.left; origTop = rect.top;
      document.body.style.userSelect = 'none';
    };
    const onMouseMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const left = origLeft + dx;
      const top = origTop + dy;
      this.boxEl.style.left = left + 'px';
      this.boxEl.style.top = top + 'px';
      this.boxEl.style.right = 'auto';
      this.boxEl.style.bottom = 'auto';
    };
    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
      const rect = this.boxEl.getBoundingClientRect();
      this._saveState({ position: { left: rect.left, top: rect.top } });
    };

    this.boxEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  _bindResize() {
    let resizing = false;
    let startX = 0, startY = 0;
    let origW = 0, origH = 0;

    const handle = this.boxEl.querySelector('.resize-handle');
    const onMouseDown = (e) => {
      resizing = true;
      startX = e.clientX; startY = e.clientY;
      const rect = this.boxEl.getBoundingClientRect();
      origW = rect.width; origH = rect.height;
      e.stopPropagation();
    };
    const onMouseMove = (e) => {
      if (!resizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const w = Math.max(160, origW + dx);
      const h = Math.max(120, origH + dy);
      this.boxEl.style.width = w + 'px';
      this.boxEl.style.height = h + 'px';
    };
    const onMouseUp = () => {
      if (!resizing) return;
      resizing = false;
      const rect = this.boxEl.getBoundingClientRect();
      this._saveState({ size: { w: rect.width, h: rect.height } });
    };

    handle.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  _saveState(partial) {
    const current = this.settings.get('webcam', { position: null, size: null });
    this.settings.set('webcam', { ...current, ...partial });
  }
}
