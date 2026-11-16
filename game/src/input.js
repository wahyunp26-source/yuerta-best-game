// Lumen Tide — keyboard and mouse input. One job: turn raw DOM events into a
// clean, polled state the world update reads each tick.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    up: false,
    down: false,
    left: false,
    right: false,
    blast: false,
    blastEdge: false,
    confirm: false,
    pause: false,
    restart: false,
    mouseX: 640,
    mouseY: 360,
    mouseDown: false,
  };

  const MOVE_KEYS = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };

  function refresh() {
    state.up = keys.has('up');
    state.down = keys.has('down');
    state.left = keys.has('left');
    state.right = keys.has('right');
  }

  function onKeyDown(event) {
    if (MOVE_KEYS[event.code]) {
      keys.add(MOVE_KEYS[event.code]);
      refresh();
      event.preventDefault();
      return;
    }
    if (event.code === 'Space') {
      if (!event.repeat) state.blastEdge = true;
      state.blast = true;
      event.preventDefault();
      return;
    }
    if (event.code === 'Enter') { state.confirm = true; event.preventDefault(); }
    if (event.code === 'KeyP') { state.pause = true; }
    if (event.code === 'KeyR') { state.restart = true; }
    if (event.code === 'KeyM') { state.mute = !state.mute; }
  }

  function onKeyUp(event) {
    if (MOVE_KEYS[event.code]) {
      keys.delete(MOVE_KEYS[event.code]);
      refresh();
    }
    if (event.code === 'Space') state.blast = false;
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = ((event.clientX - rect.left) / rect.width) * 1280;
    state.mouseY = ((event.clientY - rect.top) / rect.height) * 720;
  }

  function onMouseDown(event) {
    onMouseMove(event);
    state.mouseDown = true;
    state.blastEdge = true;
  }

  function onMouseUp() { state.mouseDown = false; }

  function onBlur() {
    keys.clear();
    refresh();
    state.blast = false;
    state.mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  // Edge-triggered flags are consumed once per tick by the game loop.
  state.consumeEdges = function consumeEdges() {
    const edges = {
      blast: state.blastEdge,
      confirm: state.confirm,
      pause: state.pause,
      restart: state.restart,
    };
    state.blastEdge = false;
    state.confirm = false;
    state.pause = false;
    state.restart = false;
    return edges;
  };

  state.destroy = function destroy() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
  };

  return state;
}
