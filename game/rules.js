import { canWin } from './scoring.js';
import { tilesEqual } from './state.js';

export function canPong(hand, tile) {
  return hand.filter((t) => tilesEqual(t, tile)).length >= 2;
}

export function canKong(hand, tile) {
  return hand.filter((t) => tilesEqual(t, tile)).length >= 3;
}

export function canChow(hand, tile, fromPlayer) {
  if (fromPlayer === -1) return false;
  if (!['bamboo', 'circle', 'character'].includes(tile.suit)) return false;
  const v = tile.value;
  const has = (val) => hand.some((t) => t.suit === tile.suit && t.value === val);
  return (has(v - 2) && has(v - 1)) || (has(v - 1) && has(v + 1)) || (has(v + 1) && has(v + 2));
}

export function chowSequence(hand, tile) {
  const v = tile.value;
  const s = tile.suit;
  if (hand.some((t) => t.suit === s && t.value === v - 2) && hand.some((t) => t.suit === s && t.value === v - 1)) return [v - 2, v - 1, v];
  if (hand.some((t) => t.suit === s && t.value === v - 1) && hand.some((t) => t.suit === s && t.value === v + 1)) return [v - 1, v, v + 1];
  if (hand.some((t) => t.suit === s && t.value === v + 1) && hand.some((t) => t.suit === s && t.value === v + 2)) return [v, v + 1, v + 2];
  return null;
}

export function canHu(hand, melds, tile = null) {
  const test = tile ? [...hand, tile] : [...hand];
  return canWin(test, melds);
}
