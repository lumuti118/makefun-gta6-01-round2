// Particles, muzzle flashes, explosions — small pooled meshes.
export function createEffects(scene) {
  const fx = { scene, pool: [], bursts: [] };
  const geo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  for (let i = 0; i < 160; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    m.visible = false; scene.add(m); fx.pool.push(m);
  }
  fx.burst = (x, y, z, color, n, speed, up) => {
    let made = 0;
    for (const m of fx.pool) {
      if (made >= n) break;
      if (m.visible) continue;
      m.visible = true; m.material.color.setHex(color); m.material.opacity = 1;
      m.position.set(x, y, z);
      const a = Math.random() * Math.PI * 2, s = (speed || 6) * (0.4 + Math.random() * 0.8);
      m.userData = { vx: Math.cos(a) * s, vy: (up || 3) * Math.random(), vz: Math.sin(a) * s, life: 0.7 + Math.random() * 0.4 };
      made++;
    }
  };
  fx.explosion = (x, y, z) => {
    fx.burst(x, y + 0.5, z, 0xff7722, 26, 10, 7);
    fx.burst(x, y + 0.5, z, 0xffcc33, 18, 7, 6);
    fx.burst(x, y + 0.5, z, 0x555555, 12, 4, 5);
  };
  fx.update = (dt) => {
    for (const m of fx.pool) {
      if (!m.visible) continue;
      const u = m.userData;
      u.life -= dt;
      if (u.life <= 0) { m.visible = false; continue; }
      u.vy -= 12 * dt;
      m.position.x += u.vx * dt; m.position.y += u.vy * dt; m.position.z += u.vz * dt;
      if (m.position.y < 0.1) { m.position.y = 0.1; u.vy = Math.abs(u.vy) * 0.3; }
      m.material.opacity = Math.min(1, u.life * 2);
    }
  };
  return fx;
}
