// Boot + main loop + debug hooks for scripted play tests.
import { createGame } from './game.js';
import { CFG } from './config.js';
import { tryEnterCar, shoot, nearestCar } from './player.js';
import { startMission } from './missions.js';

const game = createGame();
const world = game.world;

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  try { game.update(dt); } catch (e) { console.error('update error', e); }
  try { game.render(); } catch (e) { console.error('render error', e); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Debug hooks used by scripted tests (and handy in the console).
window.__palmera = {
  world, game,
  state: () => ({
    screen: world.state,
    money: world.player.money,
    health: world.player.health,
    wanted: world.wanted.stars,
    ammo: world.player.ammo,
    inCar: !!world.player.car,
    car: world.player.car ? world.player.car.def.name : null,
    speed: world.player.car ? world.player.car.speed : 0,
    x: world.player.x, z: world.player.z,
    mission: world.missions.index, missionActive: world.missions.active,
    missionsDone: world.saveData.missionsDone.slice(),
    traffic: world.traffic.length, peds: world.peds.filter((p) => p.alive).length,
    police: world.police.interceptors.length,
    save: localStorage.getItem('palmera-save-v1'),
  }),
  start: () => game.start(),
  keys: (codes, ms) => {
    for (const c of codes) world.input.keys.add(c);
    setTimeout(() => { for (const c of codes) world.input.keys.delete(c); }, ms || 600);
  },
  enterCar: () => tryEnterCar(world),
  shoot: () => shoot(world),
  startMission: () => { if (!world.missions.active && world.missions.index >= 0) startMission(world); },
  teleport: (x, z) => {
    world.player.x = x; world.player.z = z;
    if (world.player.car) { world.player.car.x = x; world.player.car.z = z; }
  },
  setMoney: (n) => { world.player.money = n; world.save.write(); },
};
