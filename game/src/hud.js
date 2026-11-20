// DOM HUD + live canvas minimap.
import { CFG, districtAt } from './config.js';
import { wantedLabel } from './wanted.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const hud = {
    el: {
      money: $('hud-money'), debt: $('hud-debt'), health: $('hud-health'),
      ammo: $('hud-ammo'), stars: $('hud-stars'), clock: $('hud-clock'),
      mission: $('hud-mission'), speed: $('hud-speed'), car: $('hud-car'),
      toast: $('toast'), crosshair: $('crosshair'), help: $('help'),
      damage: $('damage-flash'), minimap: $('minimap'),
    },
    toastT: 0,
  };
  hud.toast = (msg) => {
    hud.el.toast.textContent = msg;
    hud.el.toast.style.opacity = '1';
    hud.toastT = 3.5;
  };
  hud.setMission = (msg) => { hud.el.mission.textContent = msg; };
  hud.flashDamage = () => {
    hud.el.damage.style.opacity = '0.45';
    setTimeout(() => { hud.el.damage.style.opacity = '0'; }, 180);
  };
  hud.toggleHelp = () => {
    const h = hud.el.help;
    h.style.display = h.style.display === 'none' ? 'block' : 'none';
  };
  hud.update = (world, dt) => {
    const p = world.player;
    if (hud.toastT > 0) { hud.toastT -= dt; if (hud.toastT <= 0) hud.el.toast.style.opacity = '0'; }
    hud.el.money.textContent = '$' + p.money.toLocaleString('en-US');
    hud.el.debt.textContent = 'Debt $' + Math.max(0, CFG.debt - p.money).toLocaleString('en-US');
    hud.el.health.textContent = '♥ ' + Math.max(0, Math.round(p.health));
    hud.el.health.style.color = p.health < 30 ? '#ff5555' : '#fff';
    hud.el.ammo.textContent = 'Ammo ' + p.ammo + ' / ' + p.reserve;
    hud.el.stars.textContent = wantedLabel(world.wanted);
    const t = world.gameTime;
    const hh = String(Math.floor(t / 60) % 24).padStart(2, '0');
    const mm = String(Math.floor(t) % 60).padStart(2, '0');
    hud.el.clock.textContent = hh + ':' + mm + ' · ' + districtAt(p.x, p.z).name;
    if (p.car) {
      hud.el.speed.textContent = Math.round(Math.abs(p.car.speed) * 3.6) + ' km/h';
      hud.el.car.textContent = p.car.def.name;
    } else {
      hud.el.speed.textContent = '';
      hud.el.car.textContent = 'On foot';
    }
    hud.el.crosshair.style.display = p.car ? 'none' : 'block';
    drawMinimap(world);
  };
  function drawMinimap(world) {
    const cv = hud.el.minimap;
    const g = cv.getContext('2d');
    const S = cv.width; // 180
    const scale = S / 420;
    const toX = (x) => (x + 210) * scale;
    const toY = (z) => (z + 210) * scale;
    g.clearRect(0, 0, S, S);
    g.fillStyle = '#10141c'; g.fillRect(0, 0, S, S);
    // districts
    for (const d of CFG.districts) {
      g.fillStyle = d.color + '55';
      g.fillRect(toX(d.x0), toY(d.z0), (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
    }
    // beach + water
    g.fillStyle = '#d9c28a'; g.fillRect(toX(185), 0, (200 - 185) * scale, S);
    g.fillStyle = '#1c6f9e'; g.fillRect(toX(200), 0, S - toX(200), S);
    // roads
    g.strokeStyle = '#5a6068'; g.lineWidth = 2;
    for (const r of CFG.roads) {
      g.beginPath(); g.moveTo(toX(r), 0); g.lineTo(toX(r), S); g.stroke();
      g.beginPath(); g.moveTo(0, toY(r)); g.lineTo(S, toY(r)); g.stroke();
    }
    const dot = (x, z, color, r) => {
      g.fillStyle = color; g.beginPath(); g.arc(toX(x), toY(z), r, 0, Math.PI * 2); g.fill();
    };
    // traffic + parked
    for (const v of world.traffic) dot(v.x, v.z, '#c8d2dc', 2);
    for (const v of world.parked) dot(v.x, v.z, '#8fa3b8', 2);
    // mission marker
    const t = world.missions.active ? missionTarget(world.missions) : null;
    if (t) {
      const pulse = 4 + Math.sin(world.time * 4) * 1.5;
      g.fillStyle = '#ff2e88';
      g.beginPath(); g.arc(toX(t.x), toY(t.z), pulse, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(toX(t.x), toY(t.z), pulse + 3, 0, Math.PI * 2); g.stroke();
    }
    // police
    for (const v of world.police.interceptors) dot(v.x, v.z, '#3a6cff', 3);
    for (const c of world.police.cops) if (c.alive) dot(c.x, c.z, '#3a6cff', 2.5);
    // rivals
    for (const r of world.missionRivals) if (r.alive) dot(r.x, r.z, '#ff2222', 2.5);
    // player arrow
    const p = world.player;
    const heading = p.car ? p.car.heading : p.heading;
    g.save();
    g.translate(toX(p.x), toY(p.z));
    g.rotate(Math.atan2(Math.sin(heading), Math.cos(heading)));
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(0, -6); g.lineTo(4.5, 5); g.lineTo(-4.5, 5); g.closePath(); g.fill();
    g.restore();
  }
  return hud;
}

import { missionTarget } from './missions.js';
