// localStorage save: money, missions done, debt paid.
const KEY = 'palmera-save-v1';
export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d.money !== 'number' || !Array.isArray(d.missionsDone)) return null;
    return d;
  } catch { return null; }
}
export function writeSave(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
  catch { return false; }
}
export function clearSave() { try { localStorage.removeItem(KEY); } catch {} }
