// Bay PD: interceptor cars chase and ram; foot cops spawn at 2+ stars and shoot.
import { createVehicleState, makeCarMesh } from './vehicles.js';
import { spawnCop } from './pedestrians.js';
import { dist2, clamp } from './config.js';

export function createPolice(scene) {
  return { scene, interceptors: [], cops: [], spawnT: 0, copSpawnT: 0, sirenT: 0 };
}

function spawnInterceptor(pol, x, z) {
  const v = createVehicleState('police', x, z, 0);
  v.mesh.position.set(x, 0, z);
  pol.scene.add(v.mesh);
  pol.interceptors.push(v);
  return v;
}

export function updatePolice(pol, dt, world) {
  const { player, wanted, audio, fx } = world;
  const px = player.x, pz = player.z;
  const now = world.time;
  pol.spawnT -= dt; pol.copSpawnT -= dt; pol.sirenT -= dt;

  // Spawn interceptors while wanted, up to stars count (max 3 cars).
  const want = wanted.stars > 0 ? Math.min(3, wanted.stars) : 0;
  if (want > pol.interceptors.length && pol.spawnT <= 0) {
    const a = Math.random() * Math.PI * 2;
    spawnInterceptor(pol, px + Math.sin(a) * 70, pz + Math.cos(a) * 70);
    pol.spawnT = 4;
  }
  // Foot cops at 2+ stars.
  if (wanted.stars >= 2 && pol.cops.filter((c) => c.alive).length < wanted.stars && pol.copSpawnT <= 0) {
    const a = Math.random() * Math.PI * 2;
    const cop = spawnCop(pol.scene, px + Math.sin(a) * 22, pz + Math.cos(a) * 22);
    pol.cops.push(cop);
    pol.copSpawnT = 3;
  }
  if (pol.sirenT <= 0 && pol.interceptors.length > 0) { audio.siren(); pol.sirenT = 2.2; }

  // Interceptors: steer toward player, ram, push the player's car.
  for (const v of pol.interceptors) {
    const dx = px - v.x, dz = pz - v.z;
    const d = Math.max(1, Math.hypot(dx, dz));
    const targetHeading = Math.atan2(dx / d, dz / d);
    let dh = targetHeading - v.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    v.heading += clamp(dh, -2.2 * dt, 2.2 * dt);
    const targetSpeed = d > 12 ? v.def.top : v.def.top * 0.7;
    v.speed += (targetSpeed - v.speed) * Math.min(1, dt * 1.2);
    v.x += Math.sin(v.heading) * v.speed * dt;
    v.z += Math.cos(v.heading) * v.speed * dt;
    world.city.collide(v, 1.6);
    v.mesh.position.set(v.x, 0, v.z);
    v.mesh.rotation.y = v.heading;
    // ram: if touching the player's car, shove it and damage the player a little
    if (d < 4.5) {
      const push = 9 * dt;
      player.x += (dx / d) * -push * 0.4; player.z += (dz / d) * -push * 0.4;
      if (player.car) { player.car.x += (dx / d) * -push; player.car.z += (dz / d) * -push; player.car.speed *= 0.85; }
      if (Math.random() < dt * 0.8) { player.damage(4, world); audio.crash(); fx.burst(px, 1, pz, 0xffcc33, 6, 5, 3); }
      v.speed *= 0.6;
    }
  }
  // Foot cops: walk toward player, shoot when in range.
  for (const c of pol.cops) {
    if (!c.alive) continue;
    const dx = px - c.x, dz = pz - c.z;
    const d = Math.max(0.5, Math.hypot(dx, dz));
    c.heading = Math.atan2(dx / d, dz / d);
    if (d > 14) {
      c.x += Math.sin(c.heading) * c.speed * dt;
      c.z += Math.cos(c.heading) * c.speed * dt;
    }
    c.mesh.position.set(c.x, 0, c.z);
    c.mesh.rotation.y = c.heading;
    c.walkPhase += dt * 6;
    c.mesh.userData.legL.rotation.x = Math.sin(c.walkPhase) * 0.4;
    c.mesh.userData.legR.rotation.x = -Math.sin(c.walkPhase) * 0.4;
    c.shootT -= dt;
    if (d < 26 && c.shootT <= 0) {
      c.shootT = 1.4 + Math.random() * 0.8;
      audio.shot();
      fx.burst(c.x, 1.5, c.z, 0xffe08a, 3, 3, 1);
      if (Math.random() < 0.3) player.damage(6, world);
    }
  }
  // Despawn interceptors when wanted is gone.
  if (wanted.stars === 0) {
    for (const v of pol.interceptors) pol.scene.remove(v.mesh);
    pol.interceptors.length = 0;
    for (const c of pol.cops) if (c.alive) { pol.scene.remove(c.mesh); c.alive = false; }
    pol.cops.length = 0;
  }
  // Remove dead cops' meshes.
  for (let i = pol.cops.length - 1; i >= 0; i--) {
    if (!pol.cops[i].alive) { pol.scene.remove(pol.cops[i].mesh); pol.cops.splice(i, 1); }
  }
}
