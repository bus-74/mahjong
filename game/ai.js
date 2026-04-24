import { tileKey, tilesEqual } from './state.js';

export function chooseDiscard(difficulty, state, player) {
  if (difficulty === 'easy') return Math.floor(Math.random() * state.hands[player].length);
  if (difficulty === 'hard') return hardDiscard(state, player);
  return mediumDiscard(state, player);
}

export function mediumDiscard(state, player) {
  const hand = state.hands[player];
  let best = 0;
  let bestScore = Infinity;
  hand.forEach((tile, i) => {
    let score = 0;
    const same = hand.filter((t) => tilesEqual(t, tile)).length;
    const suited = ['bamboo', 'circle', 'character'].includes(tile.suit);
    const linked = suited && hand.some((t) => t.suit === tile.suit && Math.abs(t.value - tile.value) <= 2 && t !== tile);
    if (same >= 2) score -= 10;
    if (linked) score -= 5;
    if (tile.suit === 'wind' || tile.suit === 'dragon') score += 3;
    if (score < bestScore) { bestScore = score; best = i; }
  });
  return best;
}

function hardDiscard(state, player) {
  const hand = state.hands[player];
  let best = 0;
  let bestScore = -Infinity;
  hand.forEach((tile, i) => {
    const seen = state.visibleCounts[tileKey(tile)] || 0;
    const same = hand.filter((t) => tilesEqual(t, tile)).length;
    const pressure = seen * 2;
    const synergy = same * 3;
    const score = pressure - synergy;
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return best;
}
