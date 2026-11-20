// Keyboard + mouse state. Drag orbits the camera; click shoots.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseDX: 0, mouseDY: 0,
    dragging: false,
    clicked: false,
    clickX: 0, clickY: 0,
    pressed: new Set(), // edge-triggered keys, consumed by game loop
  };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    input.keys.add(e.code);
    input.pressed.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => { input.keys.clear(); input.dragging = false; });
  canvas.addEventListener('mousedown', (e) => {
    input.dragging = true;
    input.clicked = true;
    input.clickX = e.clientX; input.clickY = e.clientY;
  });
  window.addEventListener('mouseup', () => { input.dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!input.dragging) return;
    input.mouseDX += e.movementX || 0;
    input.mouseDY += e.movementY || 0;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  input.consumeMouse = () => { const dx = input.mouseDX, dy = input.mouseDY; input.mouseDX = 0; input.mouseDY = 0; return { dx, dy }; };
  input.consumeClick = () => { const c = input.clicked; input.clicked = false; return c; };
  input.wasPressed = (code) => { if (input.pressed.has(code)) { input.pressed.delete(code); return true; } return false; };
  input.endFrame = () => { input.pressed.clear(); };
  return input;
}
