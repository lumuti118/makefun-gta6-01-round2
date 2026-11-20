// Wanted level 0-5 stars + heat that decays when no cop sees you.
export function createWanted() {
  return {
    stars: 0, heat: 0, lastCrimeT: -99, seenByCop: false,
  };
}
export function addWanted(w, n, now) {
  w.stars = Math.min(5, w.stars + n);
  w.heat = Math.min(100, w.heat + n * 25);
  w.lastCrimeT = now;
}
export function updateWanted(w, dt, now, copNear) {
  w.seenByCop = copNear;
  if (!copNear && now - w.lastCrimeT > 6) {
    w.heat -= dt * 6;
    if (w.heat <= 0) { w.heat = 0; if (w.stars > 0) w.stars--; w.heat = w.stars > 0 ? 60 : 0; w.lastCrimeT = now; }
  }
  if (w.stars === 0) w.heat = 0;
}
export function wantedLabel(w) { return '★'.repeat(w.stars) + '☆'.repeat(5 - w.stars); }
