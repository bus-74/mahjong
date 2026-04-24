import { PLAYER } from '../game/state.js';

export function createCanvasRenderer({ onTileTap }) {
  let canvas;
  let ctx;
  let metrics = null;

  const init = () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', resize);
    canvas.addEventListener('click', handleTap);
    canvas.addEventListener('touchend', handleTouch, { passive: false });
    resize();
  };

  const resize = () => {
    canvas.width = 900;
    canvas.height = 640;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  };

  const render = (state) => {
    if (!ctx || !state) return;
    ctx.fillStyle = '#1a4a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const hand = state.hands[PLAYER];
    const w = 46;
    const h = 66;
    const gap = 4;
    const total = hand.length * (w + gap) - gap;
    const startX = (canvas.width - total) / 2;
    const y = canvas.height - 110;
    metrics = { startX, y, w, h, gap, len: hand.length };

    hand.forEach((tile, i) => {
      const x = startX + i * (w + gap);
      ctx.fillStyle = '#fdf6e3';
      ctx.strokeStyle = '#b79a68';
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#333';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${tile.value}`, x + 10, y + 24);
      ctx.fillText(tile.suit[0].toUpperCase(), x + 10, y + 44);
    });
  };

  const getCoords = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const pickTileIndex = (x, y) => {
    if (!metrics) return -1;
    for (let i = 0; i < metrics.len; i++) {
      const tx = metrics.startX + i * (metrics.w + metrics.gap);
      if (x >= tx && x <= tx + metrics.w && y >= metrics.y && y <= metrics.y + metrics.h) return i;
    }
    return -1;
  };

  const handleTap = (e) => {
    const { x, y } = getCoords(e.clientX, e.clientY);
    const idx = pickTileIndex(x, y);
    if (idx >= 0) onTileTap(idx);
  };

  const handleTouch = (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const { x, y } = getCoords(t.clientX, t.clientY);
    const idx = pickTileIndex(x, y);
    if (idx >= 0) onTileTap(idx);
  };

  return { init, render };
}
