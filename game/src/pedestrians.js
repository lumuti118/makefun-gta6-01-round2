// Civilians who walk and flee, Harbor Kings rivals who shoot, foot cops.
import { CFG, dist2 } from './config.js';
import { rngRange, rngPick } from './rng.js';

const SHIRTS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xecf0f1, 0xe67e22, 0x1abc9c];
const PANTS = [0x2c3e50, 0x34495e, 0x7f8c8d, 0x5d4037];

export function makePedMesh(shirt, pants, isRival, isCop) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4),
    new THREE.MeshLambertMaterial({ color: isCop ? 0x1c2a44 : shirt }));
  body.position.y = 1.05; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
  head.position.y = 1.75; g.add(head);
  if (isCop) {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.14, 10),
      new THREE.MeshLambertMaterial({ color: 0x101828 }));
    hat.position.y = 1.98; g.add(hat);
  } else if (isRival) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.58),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    band.position.y = 1.82; g.add(band);
  }
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.7, 0.3), new THREE.MeshLambertMaterial({ color: pants }));
  legL.position.set(-0.18, 0.35, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.18; g.add(legR);
  g.userData.legL = legL; g.userData.legR = legR;
  return g;
}

export function createPedestrians(scene, rng, count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const road = rngPick(rng, CFG.roads);
    const along = rngRange(rng, -185, 185);
    const axis = rng() < 0.5 ? 'x' : 'z';
    const x = axis === 'x' ? along : road + (rng() < 0.5 ? 7 : -7);
    const z = axis === 'x' ? road + (rng() < 0.5 ? 7 : -7) : along;
    const mesh = makePedMesh(rngPick(rng, SHIRTS), rngPick(rng, PANTS), false, false);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const ped = {
      kind: 'civ', x, z, heading: rngRange(rng, 0, Math.PI * 2),
      speed: rngRange(rng, 1.2, 2.2), mesh, fleeing: false, fleeT: 0,
      walkPhase: rngRange(rng, 0, 6), hp: 100, alive: true,
    };
    mesh.userData.hitRef = ped;
    list.push(ped);
  }
  return list;
}

export function updatePedestrians(list, dt, playerPos, danger, city) {
  for (const p of list) {
    if (!p.alive) continue;
    // flee if player is close in a car or shooting
    const d2 = dist2(p.x, p.z, playerPos.x, playerPos.z);
    if (danger && d2 < 30 * 30) { p.fleeing = true; p.fleeT = 3; }
    if (p.fleeT > 0) p.fleeT -= dt; else p.fleeing = false;
    const sp = p.fleeing ? 5.5 : p.speed;
    if (p.fleeing) {
      const dx = p.x - playerPos.x, dz = p.z - playerPos.z;
      const d = Math.max(0.1, Math.hypot(dx, dz));
      p.heading = Math.atan2(dx / d, dz / d);
    } else if (Math.random() < dt * 0.05) {
      p.heading += rngRange(Math.random, -1, 1);
    }
    p.x += Math.sin(p.heading) * sp * dt;
    p.z += Math.cos(p.heading) * sp * dt;
    if (p.x > 195) p.x = 195; if (p.x < -195) p.x = -195;
    if (p.z > 195) p.z = 195; if (p.z < -195) p.z = -195;
    city.collide(p, 0.5);
    p.walkPhase += dt * sp * 2.4;
    const swing = Math.sin(p.walkPhase) * 0.5;
    p.mesh.userData.legL.rotation.x = swing;
    p.mesh.userData.legR.rotation.x = -swing;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
  }
}

// Rivals: hostile Harbor Kings who stand their ground and shoot.
export function spawnRivals(scene, x, z, count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const mesh = makePedMesh(0x8a1a1a, 0x222222, true, false);
    const px = x + (i - count / 2) * 4 + (Math.random() - 0.5) * 2;
    const pz = z + (Math.random() - 0.5) * 8;
    mesh.position.set(px, 0, pz);
    scene.add(mesh);
    const rival = { kind: 'rival', x: px, z: pz, heading: 0, speed: 0, mesh, hp: 60, alive: true, shootT: 1 + i * 0.7, walkPhase: 0 };
    mesh.userData.hitRef = rival;
    list.push(rival);
  }
  return list;
}

export function spawnCop(scene, x, z) {
  const mesh = makePedMesh(0x1c2a44, 0x1c2a44, false, true);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const cop = { kind: 'cop', x, z, heading: 0, speed: 4.2, mesh, hp: 50, alive: true, shootT: 1.2, walkPhase: 0 };
  mesh.userData.hitRef = cop;
  return cop;
}
