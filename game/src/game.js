// Orchestrator: init, loop, game states, camera, collisions, run-overs.
import { CFG, dist2 } from './config.js';
import { makeRng } from './rng.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { buildCity } from './city.js';
import { createTraffic, createParkedCars, driveVehicle, updateTraffic, linkVehicle } from './vehicles.js';
import * as vehiclesApi from './vehicles.js';
import { createPedestrians, updatePedestrians } from './pedestrians.js';
import { createPlayer, updatePlayerOnFoot, tryEnterCar, shoot, reload, punch } from './player.js';
import { createMissions, startMission, updateMissions } from './missions.js';
import { createWanted, updateWanted, addWanted } from './wanted.js';
import { createPolice, updatePolice } from './police.js';
import { createEffects } from './effects.js';
import { createHud } from './hud.js';
import { loadSave, writeSave } from './save.js';
import { applyShot } from './shots.js';

export function createGame() {
  const canvas = document.getElementById('game-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1020);
  scene.fog = new THREE.Fog(0x0b1020, 120, 380);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, 40, 80);

  scene.add(new THREE.AmbientLight(0x8899bb, 0.75));
  const sun = new THREE.DirectionalLight(0xffe0b3, 1.4);
  sun.position.set(120, 180, 60); scene.add(sun);
  const moon = new THREE.DirectionalLight(0x8899ff, 0.35);
  moon.position.set(-80, 120, -100); scene.add(moon);

  const rng = makeRng(20261120);
  const city = buildCity(scene, rng);
  const traffic = createTraffic(scene, rng, 14);
  traffic.forEach(linkVehicle);
  const parked = createParkedCars(scene, rng);
  parked.forEach(linkVehicle);
  const peds = createPedestrians(scene, rng, 26);

  const saved = loadSave();
  const player = createPlayer(scene);
  if (saved) {
    player.money = saved.money;
    if (saved.missionsDone) { /* missions done count restored below */ }
  }

  const world = {
    scene, camera, renderer, city, rng,
    input: createInput(canvas),
    audio: createAudio(),
    fx: createEffects(scene),
    hud: null,
    player, traffic, parked, peds,
    missionRivals: [],
    missions: createMissions(),
    wanted: createWanted(),
    police: createPolice(scene),
    vehiclesApi,
    time: 0, gameTime: 8 * 60 + 15, // in-world clock starts 08:15
    state: 'title',
    saveData: { money: player.money, missionsDone: saved ? (saved.missionsDone || []) : [], debtPaid: false },
    save: {
      write() {
        world.saveData.money = world.player.money;
        writeSave(world.saveData);
      },
    },
    game: null, // set below
  };
  if (saved && saved.missionsDone) {
    world.missions.index = Math.min(saved.missionsDone.length, CFG.missions.length - 1);
    if (saved.missionsDone.length >= CFG.missions.length) world.missions.index = -1;
  }
  world.hud = createHud();
  world.save.write();

  const game = {
    world,
    setState(s) {
      world.state = s;
      document.getElementById('hud').style.display = s === 'playing' ? 'block' : 'none';
      document.querySelectorAll('.screen').forEach((el) => { el.style.display = 'none'; });
      const map = { title: 'screen-title', paused: 'screen-pause', busted: 'screen-busted', wasted: 'screen-wasted', win: 'screen-win' };
      if (map[s]) document.getElementById(map[s]).style.display = 'flex';
      if (s === 'busted' || s === 'wasted') {
        world.audio.crash();
        if (world.player.car) { world.player.car.speed = 0; world.player.car = null; world.player.mesh.visible = true; }
        world.wanted.stars = 0; world.wanted.heat = 0;
        world.player.health = CFG.startHealth;
        world.player.money = Math.max(0, world.player.money - 100);
        world.save.write();
      }
      if (s === 'win') world.audio.jingle();
    },
    start() {
      world.input.pressed.clear();
      world.audio.ensure(); world.audio.startMusic();
      game.setState('playing');
      world.hud.toast('Palmera Bay — press M to start your first mission for Mara Voss');
      if (!world.missions.active && world.missions.index >= 0) {
        world.hud.setMission('Press M to start: ' + CFG.missions[world.missions.index].name);
      }
    },
    update(dt) {
      world.time += dt;
      world.gameTime += dt * 0.6; // in-world clock runs faster
      // water + fountain animation
      world.city.water.position.y = 0.05 + Math.sin(world.time * 0.8) * 0.06;
      if (world.city.fountain) world.city.fountain.rotation.y += dt * 0.2;
      const input = world.input;
      if (world.state === 'title') {
        // slow orbit around the city
        const a = world.time * 0.05;
        camera.position.set(Math.sin(a) * 150, 70, Math.cos(a) * 150);
        camera.lookAt(0, 10, 0);
        updateTraffic(world.traffic, dt, world.city);
        world.fx.update(dt);
        return;
      }
      if (world.state !== 'playing') return;
      // global keys
      if (input.wasPressed('KeyP') || input.wasPressed('Escape')) { game.setState('paused'); return; }
      if (input.wasPressed('KeyM')) {
        if (!world.missions.active && world.missions.index >= 0) startMission(world);
      }
      if (input.wasPressed('KeyH')) world.hud.toggleHelp();
      if (input.wasPressed('KeyN')) { world.audio.toggleMute(); world.hud.toast(world.audio.muted ? 'Sound muted' : 'Sound on'); }
      if (input.wasPressed('KeyE')) tryEnterCar(world);
      if (input.wasPressed('KeyR')) reload(world);
      if (input.wasPressed('KeyF')) punch(world);
      if (input.consumeClick()) {
        world.audio.ensure(); world.audio.startMusic();
        if (!world.player.car) shoot(world);
      }
      // camera orbit
      const m = input.consumeMouse();
      world.player.camYaw -= m.dx * 0.004;
      world.player.camPitch = Math.max(0.08, Math.min(1.1, world.player.camPitch + m.dy * 0.003));

      const p = world.player;
      if (world.shotCruise) input.keys.add('KeyW');
      if (p.car) {
        const crashed = driveVehicle(p.car, input, dt, world.city, () => world.audio.crash());
        if (crashed) world.fx.burst(p.car.x, 1, p.car.z, 0xffcc33, 6, 4, 2);
        p.x = p.car.x; p.z = p.car.z;
        world.audio.setEngine(Math.abs(p.car.speed) / p.car.def.top, true);
        // running over pedestrians raises wanted
        for (const ped of world.peds) {
          if (ped.alive && dist2(ped.x, ped.z, p.x, p.z) < 2.4 * 2.4 && Math.abs(p.car.speed) > 6) {
            ped.alive = false; ped.mesh.visible = false;
            addWanted(world.wanted, 1, world.time);
            world.hud.toast('You ran someone over! Wanted +1');
            world.audio.crash();
            world.fx.burst(ped.x, 1, ped.z, 0xff4444, 8, 4, 2);
          }
        }
      } else {
        updatePlayerOnFoot(p, input, dt, world);
        world.audio.setEngine(0, false);
      }
      // rivals shoot back
      for (const r of world.missionRivals) {
        if (!r.alive) continue;
        const d = Math.hypot(r.x - p.x, r.z - p.z);
        r.heading = Math.atan2(p.x - r.x, p.z - r.z);
        r.mesh.rotation.y = r.heading;
        r.shootT -= dt;
        if (d < 30 && r.shootT <= 0) {
          r.shootT = 1.5 + Math.random();
          world.audio.shot();
          world.fx.burst(r.x, 1.5, r.z, 0xffe08a, 3, 3, 1);
          if (Math.random() < 0.25) p.damage(5, world);
        }
      }
      updateTraffic(world.traffic, dt, world.city);
      updatePedestrians(world.peds, dt, p, !!p.car || world.wanted.stars > 0, world.city);
      // police
      const copNear = world.police.interceptors.some((v) => dist2(v.x, v.z, p.x, p.z) < 60 * 60)
        || world.police.cops.some((c) => c.alive && dist2(c.x, c.z, p.x, p.z) < 40 * 40);
      updateWanted(world.wanted, dt, world.time, copNear);
      updatePolice(world.police, dt, world);
      updateMissions(world, dt);
      world.fx.update(dt);
      // busted: cop touches player on foot at 2+ stars
      if (!p.car && world.wanted.stars >= 2) {
        for (const c of world.police.cops) {
          if (c.alive && dist2(c.x, c.z, p.x, p.z) < 1.8 * 1.8) { game.setState('busted'); break; }
        }
      }
      // camera follow
      const dist = p.car ? 13 : 8.5;
      const cy = p.camYaw, cp = p.camPitch;
      const tx = p.x, tz = p.z;
      const cx = tx - Math.sin(cy) * Math.cos(cp) * dist;
      const cz = tz - Math.cos(cy) * Math.cos(cp) * dist;
      const cyy = 2.2 + Math.sin(cp) * dist;
      camera.position.set(cx, cyy, cz);
      camera.lookAt(tx, 3.0, tz); // look slightly up so the beacon beam reads
      world.hud.update(world, dt);
      input.endFrame();
    },
    render() { renderer.render(scene, camera); },
  };
  world.game = game;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ?shot= deterministic scenes
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) applyShot(world, shot, Number(params.get('seed') || 1));

  // Buttons
  document.getElementById('btn-start').addEventListener('click', () => game.start());
  document.getElementById('btn-continue').addEventListener('click', () => game.start());
  document.getElementById('btn-resume').addEventListener('click', () => game.setState('playing'));
  document.getElementById('btn-restart-title').addEventListener('click', () => game.setState('title'));
  document.getElementById('btn-retry').addEventListener('click', () => { world.player.health = CFG.startHealth; world.player.dead = false; game.start(); });
  document.getElementById('btn-retry2').addEventListener('click', () => { world.player.health = CFG.startHealth; world.player.dead = false; game.start(); });
  document.getElementById('btn-win-again').addEventListener('click', () => { world.missions.index = 0; world.missions.active = false; game.start(); });

  return game;
}
