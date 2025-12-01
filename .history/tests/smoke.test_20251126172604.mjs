import assert from 'assert';
import { Settings } from '../js/settings.js';
import { initThemeToggle } from '../js/theme.js';
import { SlideViewer } from '../js/slides.js';

// Minimal DOM stubs using JSDOM-like lightweight mocks
class ElementMock {
  constructor(id) { this.id = id; this.classList = new Set(); this.style = {}; }
  getContext() { return { drawImage: () => {} }; }
}
const canvasMock = new ElementMock('canvas');
canvasMock.getContext = () => ({ fillRect: () => {}, drawImage: () => {} });

// Stub global pdfjsLib with predictable behavior
global.pdfjsLib = {
  getDocument: ({ data }) => ({
    promise: Promise.resolve({
      numPages: 3,
      getPage: async (num) => ({
        getViewport: ({ scale }) => ({ width: 100 * scale, height: 80 * scale }),
        render: () => ({ promise: Promise.resolve() })
      })
    })
  })
};

// LocalStorage stub
const store = new Map();
global.localStorage = {
  getItem: (k) => store.has(k) ? store.get(k) : null,
  setItem: (k,v) => store.set(k,v)
};

// Document/Element stubs for theme toggle
global.document = {
  documentElement: {
    classList: {
      _list: new Set(),
      add: function(c){ this._list.add(c); },
      remove: function(...cs){ cs.forEach(c=>this._list.delete(c)); }
    }
  }
};

// 1. Settings set/get
const settings = new Settings();
settings.set('foo', { bar: 42 });
assert.deepStrictEqual(settings.get('foo'), { bar: 42 }, 'Settings get should return stored object');
assert.strictEqual(settings.get('missing', 'fallback'), 'fallback', 'Missing key returns fallback');

// 2. Theme toggle
const btnMock = { addEventListener: (evt, cb) => { btnMock._cb = cb; } };
initThemeToggle(btnMock, settings);
const firstTheme = settings.get('theme');
assert.ok(['dark','light'].includes(firstTheme), 'Initial theme should be dark or light');
btnMock._cb(); // toggle once
const secondTheme = settings.get('theme');
assert.notStrictEqual(firstTheme, secondTheme, 'Theme should change after toggle');

// 3. SlideViewer rendering logic
let pageEvents = [];
const viewer = new SlideViewer(canvasMock, (page,total)=> pageEvents.push({page,total}));

const pdfData = new Uint8Array([1,2,3]);
await viewer.loadFile(new File([pdfData], 'test.pdf')); // uses stub
assert.strictEqual(pageEvents.length, 1, 'Should emit one page change after load');
assert.strictEqual(pageEvents[0].page, 1, 'First page should be 1');
assert.strictEqual(pageEvents[0].total, 3, 'Total pages stubbed to 3');

await viewer.next();
await viewer.next();
assert.strictEqual(viewer.pageNum, 3, 'Should advance to last page');
await viewer.next(); // should not exceed
assert.strictEqual(viewer.pageNum, 3, 'Should not exceed total pages');
await viewer.prev();
assert.strictEqual(viewer.pageNum, 2, 'Should decrement page');

console.log('All smoke tests passed.');
