const STORAGE_KEY = 'slidestage_settings';

export class Settings {
  constructor() {
    this.state = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Unable to parse settings', e);
      return {};
    }
  }

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Unable to persist settings', e);
    }
  }

  get(key, fallback = null) {
    if (!key) return this.state;
    return this.state[key] ?? fallback;
  }

  set(key, value) {
    this.state[key] = value;
    this._persist();
  }

  mergeDefaults(defaults = {}) {
    this.state = { ...defaults, ...this.state };
    this._persist();
  }
}
