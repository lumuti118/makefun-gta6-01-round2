// Deterministic ?shot= scenes (title / drive / chase / mission), seeded.
import { CFG } from './config.js';
import { makeRng } from './rng.js';
import { startMission } from './missions.js';
import { addWanted } from './wanted.js';
import { linkVehicle, createVehicleState } from './vehicles.js';

export function applyShot(world, name, seed) {
  const rng = makeRng(seed || 1);
  const p = world.player;
  const g = world.game;
  if (name === 'title') {
    world.state = 'title';
    return;
  }
  // all other shots start playing
  g.setState('playing');
  world.audio.ensure = () => false; // no audio in headless shots
  if (name === 'drive') {
    const car = world.parked[0];
    p.car = car; p.mesh.visible = false;
    car.stolen = true;
    car.x = -90; car.z = 2.5; car.heading = Math.PI / 2; car.speed = 16;
    p.x = car.x; p.z = car.z;
    p.camYaw = Math.PI / 2; // camera behind the car heading +x
    p.camPitch = 0.42;
    world.shotCruise = true; // keep the car cruising for the screenshot
    world.hud.toast('Sunset cruise down Ocean Drive');
    world.hud.setMission('Free roam — press M to start a mission');
  } else if (name === 'chase') {
    const car = world.parked[1];
    p.car = car; p.mesh.visible = false;
    car.stolen = true;
    car.x = 0; car.z = -40; car.heading = 0; car.speed = 20;
    p.x = car.x; p.z = car.z;
    p.camYaw = 0; // camera behind the car heading -z... heading 0 = +z, camera behind
    p.camPitch = 0.3;
    addWanted(world.wanted, 3, world.time);
    // two interceptors right behind
    const { police } = world;
    for (let i = 0; i < 2; i++) {
      const v = linkVehicle(createVehicleState('police', -8 - i * 6, -55 - i * 8, 0));
      v.speed = 22;
      v.mesh.position.set(v.x, 0, v.z);
      world.scene.add(v.mesh);
      police.interceptors.push(v);
    }
    world.hud.toast('Bay PD is on your tail!');
    world.hud.setMission('Lose the heat — outrun the interceptors');
  } else if (name === 'mission') {
    // Leo on the road west of the club, facing it so the pink beacon is in frame.
    p.x = -135; p.z = -45; p.heading = 2.81;
    p.mesh.position.set(p.x, 0, p.z);
    p.camYaw = 2.81; // camera behind Leo as he faces the Coral Club
    p.camPitch = 0.35;
    world.missions.index = 0;
    startMission(world);
    world.hud.toast('Mission 1: First Errand — get to the Coral Club');
  }
  // settle traffic positions deterministically
  for (const v of world.traffic) {
    v.x += rng() * 4 - 2; v.z += rng() * 4 - 2;
  }
}
