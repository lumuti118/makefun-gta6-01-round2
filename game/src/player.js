// Leo Marlin on foot / in a car / shooting.
import { CFG, clamp, dist2 } from './config.js';
import { addWanted } from './wanted.js';
import { onRivalDown } from './missions.js';

export function createPlayer(scene) {
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.45),
    new THREE.MeshLambertMaterial({ color: 0x2a9d8f }));
  body.position.y = 1.05; mesh.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
  head.position.y = 1.78; mesh.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.12, 10),
    new THREE.MeshLambertMaterial({ color: 0xff5a3c }));
  cap.position.y = 2.0; mesh.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.7, 0.32), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
  legL.position.set(-0.19, 0.35, 0); mesh.add(legL);
  const legR = legL.clone(); legR.position.x = 0.19; mesh.add(legR);
  mesh.userData.legL = legL; mesh.userData.legR = legR;
  scene.add(mesh);
  return {
    x: -150, z: -150, heading: 0, health: CFG.startHealth,
    money: CFG.startMoney, car: null, mesh,
    ammo: CFG.pistolMag, reserve: CFG.pistolReserve,
    walkPhase: 0, camYaw: 0.6, camPitch: 0.32, dead: false,
    damage(amount, world) {
      this.health -= amount;
      world.hud.flashDamage();
      if (this.health <= 0 && !this.dead) { this.dead = true; world.game.setState('wasted'); }
    },
  };
}

export function updatePlayerOnFoot(p, input, dt, world) {
  const sprint = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
  const speed = sprint ? 9 : 5;
  let mx = 0, mz = 0;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) mz += 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) mz -= 1;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) mx -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) mx += 1;
  const moving = mx !== 0 || mz !== 0;
  if (moving) {
    const len = Math.hypot(mx, mz); mx /= len; mz /= len;
    // move relative to camera yaw
    const cy = p.camYaw;
    const wx = (Math.sin(cy) * mz + Math.cos(cy) * mx);
    const wz = (Math.cos(cy) * mz - Math.sin(cy) * mx);
    p.x += wx * speed * dt; p.z += wz * speed * dt;
    p.heading = Math.atan2(wx, wz);
    p.walkPhase += dt * speed * 1.8;
    world.city.collide(p, 0.5);
    if (!world.city.inBounds(p.x, p.z)) { p.x = clamp(p.x, -197, 207); p.z = clamp(p.z, -197, 197); }
    const swing = Math.sin(p.walkPhase) * 0.55;
    p.mesh.userData.legL.rotation.x = swing;
    p.mesh.userData.legR.rotation.x = -swing;
  }
  p.mesh.position.set(p.x, 0, p.z);
  p.mesh.rotation.y = p.heading;
}

// Find nearest car (parked, traffic or police) within range.
export function nearestCar(world, range) {
  const all = [...world.parked, ...world.traffic, ...world.police.interceptors];
  let best = null, bd = range * range;
  for (const v of all) {
    const d2 = dist2(v.x, v.z, world.player.x, world.player.z);
    if (d2 < bd) { bd = d2; best = v; }
  }
  return best;
}

export function tryEnterCar(world) {
  const p = world.player;
  if (p.car) { // exit
    const v = p.car;
    p.car = null;
    p.x = v.x + Math.sin(v.heading + Math.PI / 2) * 2.5;
    p.z = v.z + Math.cos(v.heading + Math.PI / 2) * 2.5;
    p.mesh.visible = true;
    world.hud.toast('You got out of the ' + v.def.name);
    return;
  }
  const v = nearestCar(world, 4.5);
  if (!v) { world.hud.toast('No car nearby — get closer and press E'); return; }
  p.car = v;
  p.mesh.visible = false;
  v.parked = false;
  if (!v.stolen) {
    v.stolen = true;
    const isPolice = v.type === 'police';
    addWanted(world.wanted, isPolice ? 2 : 1, world.time);
    world.hud.toast(isPolice ? 'You stole a Bay PD interceptor! Wanted +2' : 'Car stolen! Wanted +1');
    world.audio.pickup();
  } else {
    world.hud.toast('In the ' + v.def.name);
  }
}

// Pistol: raycast from camera through the crosshair with a small cone.
export function shoot(world) {
  const p = world.player;
  if (p.ammo <= 0) { world.hud.toast('Out of ammo — press R to reload'); world.audio.tone(120, 0.08, 'square', 0.15); return; }
  p.ammo--;
  world.audio.shot();
  const cam = world.camera;
  const origin = cam.position.clone();
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  // small cone spread
  dir.x += (Math.random() - 0.5) * 0.04; dir.y += (Math.random() - 0.5) * 0.04; dir.z += (Math.random() - 0.5) * 0.04;
  dir.normalize();
  const ray = new THREE.Raycaster(origin, dir, 0.1, 120);
  const targets = [];
  for (const ped of [...world.peds, ...world.missionRivals, ...world.police.cops]) {
    if (ped.alive) targets.push(ped.mesh);
  }
  for (const v of world.traffic) targets.push(v.mesh);
  const hits = ray.intersectObjects(targets, true);
  let hitObj = null;
  if (hits.length) {
    let o = hits[0].object;
    while (o && !o.userData.hitRef) o = o.parent;
    hitObj = o;
  }
  const muzzle = origin.clone().add(dir.clone().multiplyScalar(2));
  world.fx.burst(muzzle.x, muzzle.y, muzzle.z, 0xffe08a, 4, 2, 1);
  if (!hitObj) return;
  const ref = hitObj.userData.hitRef;
  if (ref && ref.kind) {
    ref.hp -= 34;
    world.fx.burst(ref.x, 1.4, ref.z, 0xff4444, 8, 4, 2);
    if (ref.hp <= 0 && ref.alive) {
      ref.alive = false;
      ref.mesh.visible = false;
      if (ref.kind === 'civ') {
        addWanted(world.wanted, 1, world.time);
        world.hud.toast('You hit a civilian! Wanted +1');
      } else if (ref.kind === 'rival') {
        world.hud.toast('Harbor King down!');
        onRivalDown(world);
      } else if (ref.kind === 'cop') {
        addWanted(world.wanted, 1, world.time);
        world.hud.toast('You shot a cop! Wanted +1');
      }
    }
  }
}

export function reload(world) {
  const p = world.player;
  if (p.ammo >= CFG.pistolMag || p.reserve <= 0) return;
  const need = CFG.pistolMag - p.ammo;
  const take = Math.min(need, p.reserve);
  p.ammo += take; p.reserve -= take;
  world.audio.pickup();
  world.hud.toast('Reloaded — ' + p.ammo + '/' + p.reserve);
}

export function punch(world) {
  const p = world.player;
  world.audio.noise(0.08, 0.2, 900);
  for (const ped of [...world.peds, ...world.missionRivals, ...world.police.cops]) {
    if (!ped.alive) continue;
    if (dist2(ped.x, ped.z, p.x, p.z) < 2.2 * 2.2) {
      ped.hp -= 20;
      world.fx.burst(ped.x, 1.4, ped.z, 0xffcc66, 5, 3, 2);
      if (ped.hp <= 0) {
        ped.alive = false; ped.mesh.visible = false;
        if (ped.kind === 'rival') onRivalDown(world);
        else addWanted(world.wanted, 1, world.time);
      }
    }
  }
}
