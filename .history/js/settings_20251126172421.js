export class Settings {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem('slidestage:' + key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  set(key, value) {
    try {
      localStorage.setItem('slidestage:' + key, JSON.stringify(value));
    } catch (e) {
      // ignore
    }
  }
}
