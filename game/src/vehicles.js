// Car meshes, arcade driving physics, traffic AI (turns at intersections).
import { CFG, clamp } from './config.js';
import { rngPick, rngRange } from './rng.js';

export function makeCarMesh(type) {
  const def = CFG.vehicles.find((v) => v.id === type) || CFG.vehicles[0];
  const g = new THREE.Group();
  g.userData.hitRef = null; // set by caller to the vehicle state
  const bodyMat = new THREE.MeshLambertMaterial({ color: def.color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, def.len), bodyMat);
  body.position.y = 0.65; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, def.len * 0.5), glassMat);
  cabin.position.set(0, 1.3, -def.len * 0.06); g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, def.len * 0.32], [0.95, def.len * 0.32], [-0.95, -def.len * 0.32], [0.95, -def.len * 0.32]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.38, wz); g.add(w); wheels.push(w);
  }
  // headlights + taillights
  const hl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff6c9 }));
  hl.position.set(0, 0.7, def.len / 2 + 0.02); g.add(hl);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  tl.position.set(0, 0.7, -def.len / 2 - 0.02); g.add(tl);
  if (type === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar.position.set(0, 1.75, 0); g.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    bar2.position.set(0.7, 1.75, 0); g.add(bar2);
    g.userData.lightBar = bar; g.userData.lightBar2 = bar2;
  }
  g.userData.wheels = wheels;
  g.userData.def = def;
  return g;
}

export function createVehicleState(type, x, z, heading) {
  const def = CFG.vehicles.find((v) => v.id === type) || CFG.vehicles[0];
  return {
    type, def, x, z, heading: heading || 0, speed: 0,
    mesh: makeCarMesh(type), stolen: false, parked: false,
    // traffic AI
    axis: 'z', dir: 1, lane: 2.5, targetSpeed: rngRange(Math.random, 8, 12),
    turnCooldown: 0,
  };
}

// Link a vehicle state's mesh back to the state (raycast hits).
export function linkVehicle(v) { v.mesh.userData.hitRef = v; return v; }

// Arcade driving: accel / brake / steering scaled by speed, drag, collision.
export function driveVehicle(v, input, dt, city, onCrash) {
  const fwd = input.keys.has('KeyW') || input.keys.has('ArrowUp');
  const back = input.keys.has('KeyS') || input.keys.has('ArrowDown');
  const left = input.keys.has('KeyA') || input.keys.has('ArrowLeft');
  const right = input.keys.has('KeyD') || input.keys.has('ArrowRight');
  if (fwd) v.speed += v.def.accel * dt;
  else if (back) v.speed -= v.def.accel * 0.8 * dt;
  else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 6 * dt);
  v.speed = clamp(v.speed, -v.def.top * 0.45, v.def.top);
  const steer = (left ? 1 : 0) - (right ? 1 : 0);
  if (Math.abs(v.speed) > 0.3) v.heading += steer * v.def.grip * 0.55 * dt * Math.sign(v.speed) * Math.min(1, Math.abs(v.speed) / 8);
  const nx = v.x + Math.sin(v.heading) * v.speed * dt;
  const nz = v.z + Math.cos(v.heading) * v.speed * dt;
  const before = { x: v.x, z: v.z };
  v.x = nx; v.z = nz;
  const hit = city.collide(v, 1.6);
  if (hit) {
    if (Math.abs(v.speed) > 8 && onCrash) onCrash();
    v.speed *= 0.4;
  }
  if (!city.inBounds(v.x, v.z)) { v.x = before.x; v.z = before.z; v.speed *= 0.3; }
  v.mesh.position.set(v.x, 0, v.z);
  v.mesh.rotation.y = v.heading;
  return hit;
}

export function createTraffic(scene, rng, count) {
  const list = [];
  const types = ['sedan', 'taxi', 'van', 'pickup', 'sedan', 'taxi'];
  for (let i = 0; i < count; i++) {
    const axis = rng() < 0.5 ? 'x' : 'z';
    const road = rngPick(rng, CFG.roads);
    const along = rngRange(rng, -180, 180);
    const dir = rng() < 0.5 ? 1 : -1;
    const lane = dir > 0 ? 2.5 : -2.5;
    const v = createVehicleState(rngPick(rng, types), 0, 0, 0);
    v.axis = axis; v.dir = dir; v.lane = lane;
    v.targetSpeed = rngRange(rng, 7, 12);
    v.speed = v.targetSpeed;
    if (axis === 'x') { v.x = along; v.z = road + lane; v.heading = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { v.x = road + lane; v.z = along; v.heading = dir > 0 ? 0 : Math.PI; }
    v.mesh.position.set(v.x, 0, v.z);
    v.mesh.rotation.y = v.heading;
    scene.add(v.mesh);
    list.push(v);
  }
  return list;
}

function nearestRoad(v) {
  let best = CFG.roads[0], bd = 1e9;
  for (const r of CFG.roads) { const d = Math.abs(v - r); if (d < bd) { bd = d; best = r; } }
  return best;
}

// Traffic: drive along a road; at intersections sometimes turn onto a cross road.
export function updateTraffic(list, dt, city) {
  for (const v of list) {
    v.turnCooldown -= dt;
    const along = v.axis === 'x' ? v.x : v.z;
    const cross = v.axis === 'x' ? v.z : v.x;
    const road = nearestRoad(cross);
    if (v.turnCooldown <= 0 && Math.abs(cross - road) < 3 && Math.abs(along % 45) < 2.2 && Math.random() < 0.35) {
      // turn onto the cross road
      const newRoad = nearestRoad(along);
      const newDir = Math.random() < 0.5 ? 1 : -1;
      const lane = newDir > 0 ? 2.5 : -2.5;
      if (v.axis === 'x') {
        v.axis = 'z'; v.dir = newDir; v.z = along; v.x = newRoad + lane;
        v.heading = newDir > 0 ? 0 : Math.PI;
      } else {
        v.axis = 'x'; v.dir = newDir; v.x = along; v.z = newRoad + lane;
        v.heading = newDir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      v.turnCooldown = 4;
    }
    v.speed += (v.targetSpeed - v.speed) * Math.min(1, dt);
    const step = v.speed * v.dir * dt;
    if (v.axis === 'x') v.x += step; else v.z += step;
    if (v.x > 195) v.x = -195; if (v.x < -195) v.x = 195;
    if (v.z > 195) v.z = -195; if (v.z < -195) v.z = 195;
    v.mesh.position.set(v.x, 0, v.z);
    v.mesh.rotation.y = v.heading;
  }
}

// Parked cars the player can steal.
export function createParkedCars(scene, rng) {
  const spots = [
    { type: 'sedan', x: -45, z: 20, h: 0 }, { type: 'taxi', x: 45, z: -70, h: Math.PI / 2 },
    { type: 'pickup', x: -135, z: 100, h: 0 }, { type: 'van', x: 90, z: 45, h: -Math.PI / 2 },
    { type: 'sedan', x: 20, z: 135, h: Math.PI }, { type: 'sunset', x: 165, z: -135, h: Math.PI / 2 },
    { type: 'pickup', x: -20, z: -135, h: 0 }, { type: 'sedan', x: 135, z: -20, h: Math.PI / 2 },
  ];
  const list = [];
  for (const s of spots) {
    const v = createVehicleState(s.type, s.x, s.z, s.h);
    v.parked = true;
    v.mesh.position.set(s.x, 0, s.z); v.mesh.rotation.y = s.h;
    scene.add(v.mesh);
    list.push(v);
  }
  return list;
}
