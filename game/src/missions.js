// Six story missions for Mara Voss — state machine with beacon + rewards.
import { CFG, dist2 } from './config.js';
import { spawnRivals } from './pedestrians.js';
import { addWanted } from './wanted.js';

export function createMissions() {
  return {
    index: 0, // 0-based into CFG.missions; -1 = all done
    active: false,
    step: 0, // sub-step (drops)
    target: null, // {x,z,label}
    rivalsLeft: 0,
    heistVan: null,
    cashGrabbed: false,
  };
}

export function currentMission(m) {
  if (m.index < 0 || m.index >= CFG.missions.length) return null;
  return CFG.missions[m.index];
}

export function missionTarget(m) {
  const def = currentMission(m);
  if (!def || !m.active) return null;
  if (def.kind === 'drops') return def.drops[m.step];
  if (def.kind === 'steal' && m.step === 1) return def.deliver;
  if (def.kind === 'heist' && m.step === 1) return def.deliver;
  return def.target;
}

export function startMission(world) {
  const m = world.missions;
  const def = currentMission(m);
  if (!def) return;
  m.active = true; m.step = 0; m.cashGrabbed = false;
  world.hud.toast('Mission: ' + def.name + ' — ' + def.brief);
  world.hud.setMission(def.name + ': ' + def.brief);
  world.audio.jingle();
  if (def.kind === 'shootout') {
    world.missionRivals = spawnRivals(world.scene, def.target.x, def.target.z, 4);
    m.rivalsLeft = 4;
  }
  if (def.kind === 'evade') {
    addWanted(world.wanted, 3, world.time);
    world.hud.toast('Bay PD is on you — lose the heat!');
  }
  if (def.kind === 'heist') {
    // bank van parked by the bank
    const { createVehicleState, linkVehicle } = world.vehiclesApi;
    const van = linkVehicle(createVehicleState('van', -20, -45, Math.PI));
    van.mesh.position.set(-20, 0, -45);
    world.scene.add(van.mesh);
    m.heistVan = van;
    world.parked.push(van);
  }
  updateBeacon(world);
}

export function updateBeacon(world) {
  const t = missionTarget(world.missions);
  const b = world.city.beacon;
  if (!t) { b.visible = false; return; }
  b.visible = true;
  b.position.set(t.x, 0, t.z);
}

export function completeMission(world) {
  const m = world.missions;
  const def = currentMission(m);
  if (!def) return;
  world.player.money += def.reward;
  world.hud.toast('Mission complete: ' + def.name + ' +$' + def.reward);
  world.audio.cash();
  world.saveData.missionsDone.push(def.id);
  world.saveData.money = world.player.money;
  world.saveData.debtPaid = world.player.money >= CFG.debt;
  world.save.write();
  m.active = false; m.index++;
  if (m.index >= CFG.missions.length) {
    m.index = -1;
    world.game.setState('win');
    return;
  }
  world.hud.setMission('Next: ' + CFG.missions[m.index].name + ' — press M to start');
  updateBeacon(world);
}

export function onRivalDown(world) {
  const m = world.missions;
  if (!m.active) return;
  m.rivalsLeft--;
  if (m.rivalsLeft <= 0 && currentMission(m).kind === 'shootout') completeMission(world);
}

export function updateMissions(world, dt) {
  const m = world.missions;
  if (!m.active) return;
  const def = currentMission(m);
  if (!def) return;
  const p = world.player;
  const t = missionTarget(m);
  if (!t) return;
  const near = dist2(p.x, p.z, t.x, t.z) < 7 * 7;
  if (def.kind === 'goto' && near) { completeMission(world); return; }
  if (def.kind === 'steal') {
    if (m.step === 0) {
      // player must be in the Sunset GT (the parked one at the marina)
      const sunset = world.parked.find((v) => v.type === 'sunset');
      if (p.car && p.car.type === 'sunset' && sunset && p.car === sunset) {
        m.step = 1;
        world.hud.toast('Got the Sunset GT — deliver it to the garage!');
        updateBeacon(world);
      }
    } else if (near && p.car && p.car.type === 'sunset') { completeMission(world); return; }
  }
  if (def.kind === 'drops' && near) {
    world.player.money += 100;
    world.audio.cash();
    world.hud.toast('Drop ' + (m.step + 1) + ' done +$100');
    m.step++;
    if (m.step >= def.drops.length) { completeMission(world); return; }
    updateBeacon(world);
  }
  if (def.kind === 'evade') {
    if (world.wanted.stars === 0) {
      // heat lost: go to safehouse
      m.step = 1;
      world.hud.toast('Heat is off — get to the safehouse');
      updateBeacon(world);
      if (near) completeMission(world);
    }
  }
  if (def.kind === 'heist') {
    if (m.step === 0) {
      const van = m.heistVan;
      if (van && p.car === van) {
        m.step = 1;
        world.hud.toast('Cash grabbed! Get to the yacht — now!');
        addWanted(world.wanted, 2, world.time);
        updateBeacon(world);
      }
    } else if (near) { completeMission(world); return; }
  }
  // beacon pulse
  const b = world.city.beacon;
  if (b.visible) b.children[1].scale.setScalar(1 + Math.sin(world.time * 3) * 0.15);
}
