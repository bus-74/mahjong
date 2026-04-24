import { PLAYER } from '../game/state.js';

const WIND_LABELS = ['YOU', 'BOT 1', 'BOT 2', 'BOT 3'];

export function createCanvasRenderer({ onTileTap }) {
  let canvas;
  let ctx;
  let metrics = null;
  let dpr = 1;
  let selectedIndex = -1;

  const init = () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', resize);
    canvas.addEventListener('click', handleTap);
    canvas.addEventListener('touchend', handleTouch, { passive: false });
    resize();
  };

  const resize = () => {
    const vw = Math.max(320, window.innerWidth);
    const vh = Math.max(520, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const render = (state) => {
    if (!ctx || !state) return;
    const boardW = canvas.width / dpr;
    const boardH = canvas.height / dpr;

    drawTable(boardW, boardH);
    drawSeatInfo(state, boardW, boardH);
    drawWallInfo(state, boardW, boardH);

    const hand = state.hands[PLAYER] || [];
    const maxTileWidth = 54;
    const minTileWidth = 34;
    const gap = 6;
    const usableW = boardW - 20;
    const w = Math.max(minTileWidth, Math.min(maxTileWidth, Math.floor((usableW - gap * (hand.length - 1)) / hand.length)));
    const h = Math.round(w * 1.42);
    const total = hand.length * (w + gap) - gap;
    const startX = Math.round((boardW - total) / 2);
    const y = Math.round(boardH - h - 18 - Math.max(0, Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')) || 0));

    metrics = {
      startX,
      y,
      w,
      h,
      gap,
      len: hand.length,
      hitPad: 10,
    };

    hand.forEach((tile, i) => {
      const x = startX + i * (w + gap);
      const isSelected = i === selectedIndex;
      drawTile({ x, y: isSelected ? y - 12 : y, w, h, tile, selected: isSelected });
    });
  };

  const drawTable = (w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, h * 0.75);
    grad.addColorStop(0, '#24603d');
    grad.addColorStop(1, '#0f2a1b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(210,170,90,0.22)';
    ctx.lineWidth = 2;
    roundedRect(14, 12, w - 28, h - 24, 14, false, true);
  };

  const drawSeatInfo = (state, w, h) => {
    const seats = [
      { i: 2, x: w / 2, y: 42, align: 'center' },
      { i: 1, x: w - 28, y: h / 2, align: 'right' },
      { i: 0, x: w / 2, y: h - 110, align: 'center' },
      { i: 3, x: 28, y: h / 2, align: 'left' },
    ];

    seats.forEach(({ i, x, y, align }) => {
      const isTurn = state.turn === i;
      ctx.font = isTurn ? '700 15px Noto Sans SC, sans-serif' : '600 13px Noto Sans SC, sans-serif';
      ctx.fillStyle = isTurn ? '#f4d888' : '#98c6a3';
      ctx.textAlign = align;
      const txt = `${WIND_LABELS[i]} · ${state.hands[i].length} tiles`;
      ctx.fillText(txt, x, y);
    });
  };

  const drawWallInfo = (state, w, h) => {
    const wallLeft = state.wall?.length ?? 0;
    ctx.fillStyle = 'rgba(6, 18, 10, 0.78)';
    roundedRect((w / 2) - 92, (h / 2) - 26, 184, 52, 14, true, false);
    ctx.strokeStyle = 'rgba(235,195,100,0.45)';
    ctx.lineWidth = 1;
    roundedRect((w / 2) - 92, (h / 2) - 26, 184, 52, 14, false, true);
    ctx.fillStyle = '#f0d080';
    ctx.font = '700 13px Noto Sans SC, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Wall: ${wallLeft}`, w / 2, h / 2 - 3);
    ctx.fillStyle = '#84c39b';
    ctx.font = '500 12px Noto Sans SC, sans-serif';
    ctx.fillText(`Last discard: ${formatTile(state.lastDiscard)}`, w / 2, h / 2 + 16);
  };

  const drawTile = ({ x, y, w, h, tile, selected }) => {
    ctx.save();
    ctx.shadowColor = selected ? 'rgba(255,214,102,0.65)' : 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = selected ? 14 : 6;
    ctx.shadowOffsetY = selected ? 7 : 4;

    const bg = ctx.createLinearGradient(x, y, x + w, y + h);
    bg.addColorStop(0, '#fff8e8');
    bg.addColorStop(1, '#e9ddc5');
    ctx.fillStyle = bg;
    roundedRect(x, y, w, h, 6, true, false);

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = selected ? '#f0c040' : '#ba9b60';
    ctx.lineWidth = selected ? 2.2 : 1.4;
    roundedRect(x, y, w, h, 6, false, true);

    const display = tileFace(tile);
    ctx.fillStyle = display.color;
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.round(w * 0.39)}px 'Noto Serif SC', serif`;
    ctx.fillText(display.main, x + w / 2, y + h * 0.56);

    ctx.fillStyle = '#3b372f';
    ctx.font = `600 ${Math.round(w * 0.19)}px 'Noto Sans SC', sans-serif`;
    ctx.fillText(display.sub, x + w / 2, y + h * 0.85);
    ctx.restore();
  };

  const tileFace = (tile) => {
    if (!tile) return { main: '?', sub: '', color: '#333' };
    if (tile.suit === 'bamboo') return { main: String(tile.value), sub: 'Bamboo', color: '#1f7d3d' };
    if (tile.suit === 'circle') return { main: String(tile.value), sub: 'Dots', color: '#2f4fa8' };
    if (tile.suit === 'character') return { main: String(tile.value), sub: 'Character', color: '#7f241d' };
    if (tile.suit === 'wind') return { main: tile.value.slice(0, 1), sub: 'Wind', color: '#2f3742' };
    if (tile.suit === 'dragon') {
      const map = { Red: '#a61f22', Green: '#1f7d3d', White: '#646464' };
      return { main: tile.value.slice(0, 1), sub: 'Dragon', color: map[tile.value] || '#444' };
    }
    return { main: '✿', sub: tile.suit, color: '#8b6f2d' };
  };

  const formatTile = (tile) => {
    if (!tile) return '—';
    if (typeof tile.value === 'number') return `${tile.value} ${tile.suit}`;
    return `${tile.value}`;
  };

  const roundedRect = (x, y, w, h, r, fill = true, stroke = false) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  };

  const getCoords = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const pickTileIndex = (x, y) => {
    if (!metrics) return -1;
    for (let i = 0; i < metrics.len; i++) {
      const tx = metrics.startX + i * (metrics.w + metrics.gap);
      const ty = i === selectedIndex ? metrics.y - 12 : metrics.y;
      if (
        x >= tx - metrics.hitPad &&
        x <= tx + metrics.w + metrics.hitPad &&
        y >= ty - metrics.hitPad &&
        y <= ty + metrics.h + metrics.hitPad
      ) return i;
    }
    return -1;
  };

  const triggerTile = (idx) => {
    if (idx < 0) return;
    if (selectedIndex === idx) {
      selectedIndex = -1;
      onTileTap(idx);
      return;
    }
    selectedIndex = idx;
  };

  const handleTap = (e) => {
    const { x, y } = getCoords(e.clientX, e.clientY);
    const idx = pickTileIndex(x, y);
    triggerTile(idx);
  };

  const handleTouch = (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const { x, y } = getCoords(t.clientX, t.clientY);
    const idx = pickTileIndex(x, y);
    triggerTile(idx);
  };

  const clearSelection = () => {
    selectedIndex = -1;
  };

  return { init, render, clearSelection };
}
