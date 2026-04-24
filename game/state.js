export const PLAYER = 0;
export const BOT1 = 1;
export const BOT2 = 2;
export const BOT3 = 3;
export const WINDS_ORDER = ['East', 'South', 'West', 'North'];

const SUITS = ['bamboo', 'circle', 'character'];
const WINDS = ['East', 'South', 'West', 'North'];
const DRAGONS = ['Red', 'Green', 'White'];
const FLOWERS = ['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo'];
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

function makeTile(suit, value, id) { return { suit, value, id }; }
function buildDeck() {
  const deck = [];
  let id = 0;
  SUITS.forEach((s) => { for (let v = 1; v <= 9; v++) for (let c = 0; c < 4; c++) deck.push(makeTile(s, v, id++)); });
  WINDS.forEach((w) => { for (let c = 0; c < 4; c++) deck.push(makeTile('wind', w, id++)); });
  DRAGONS.forEach((d) => { for (let c = 0; c < 4; c++) deck.push(makeTile('dragon', d, id++)); });
  FLOWERS.forEach((f) => deck.push(makeTile('flower', f, id++)));
  SEASONS.forEach((s) => deck.push(makeTile('season', s, id++)));
  return deck;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function isBonus(tile) { return tile && (tile.suit === 'flower' || tile.suit === 'season'); }
export function tileKey(tile) { return `${tile?.suit}:${tile?.value}`; }
export function tilesEqual(a, b) { return !!a && !!b && a.suit === b.suit && a.value === b.value; }

export function createInitialState(diff = 'medium') {
  const deck = shuffle(buildDeck());
  const hands = [[], [], [], []];
  let pos = 0;
  for (let i = 0; i < 13; i++) for (let p = 0; p < 4; p++) hands[p].push(deck[pos++]);
  return {
    wall: deck.slice(pos),
    hands,
    discards: [[], [], [], []],
    melds: [[], [], [], []],
    flowers: [[], [], [], []],
    turn: 0,
    dealer: 0,
    handNumber: 1,
    scores: [0, 0, 0, 0],
    phase: 'flower',
    lastDiscard: null,
    lastDiscardBy: -1,
    visibleCounts: {},
    drawn: false,
    gameOver: false,
    paused: false,
    diff,
  };
}

export function createDispatcher(onStateChange) {
  let state = null;

  const emit = () => onStateChange?.(state);
  const setState = (next) => {
    state = next;
    emit();
    return state;
  };

  const drawFromWall = () => {
    if (!state || state.wall.length === 0) return null;
    return state.wall.shift();
  };

  const markVisible = (tile, copies = 1) => {
    if (!tile || copies <= 0) return;
    const key = tileKey(tile);
    const current = state.visibleCounts[key] || 0;
    state.visibleCounts[key] = Math.min(4, current + copies);
  };

  const dispatch = (action) => {
    if (!state && action.type !== 'INIT_GAME') return state;

    switch (action.type) {
      case 'INIT_GAME':
        return setState(createInitialState(action.diff));

      case 'DRAW_TILE': {
        const tile = drawFromWall();
        if (!tile) {
          state.phase = 'score';
          return setState(state);
        }
        const player = action.player;
        if (isBonus(tile)) {
          state.flowers[player].push(tile);
          markVisible(tile);
          return dispatch({ type: 'DRAW_TILE', player });
        }
        state.hands[player].push(tile);
        state.drawn = true;
        state.phase = 'discard';
        return setState(state);
      }

      case 'DISCARD': {
        const { player, index } = action;
        if (index < 0 || index >= state.hands[player].length) return state;
        const tile = state.hands[player].splice(index, 1)[0];
        state.discards[player].push(tile);
        state.lastDiscard = tile;
        state.lastDiscardBy = player;
        state.phase = 'action';
        markVisible(tile);
        return setState(state);
      }

      case 'CLAIM_PONG': {
        const { player, tile, fromPlayer } = action;
        const idxs = [];
        for (let i = 0; i < state.hands[player].length; i++) {
          if (tilesEqual(state.hands[player][i], tile) && idxs.length < 2) idxs.push(i);
        }
        idxs.sort((a, b) => b - a).forEach((i) => state.hands[player].splice(i, 1));
        state.melds[player].push({ type: 'pong', tiles: [tile, tile, tile] });
        state.discards[fromPlayer].pop();
        state.turn = player;
        state.phase = 'discard';
        markVisible(tile, 2);
        return setState(state);
      }

      case 'CLAIM_KONG': {
        const { player, tile, fromPlayer } = action;
        const idxs = [];
        for (let i = 0; i < state.hands[player].length; i++) {
          if (tilesEqual(state.hands[player][i], tile) && idxs.length < 3) idxs.push(i);
        }
        idxs.sort((a, b) => b - a).forEach((i) => state.hands[player].splice(i, 1));
        state.melds[player].push({ type: 'kong', tiles: [tile, tile, tile, tile] });
        state.discards[fromPlayer].pop();
        state.turn = player;
        state.phase = 'discard';
        markVisible(tile, 3);
        return setState(state);
      }

      case 'CLAIM_CHOW': {
        const { player, tile, fromPlayer, sequence } = action;
        sequence.filter((v) => v !== tile.value).forEach((v) => {
          const idx = state.hands[player].findIndex((t) => t.suit === tile.suit && t.value === v);
          if (idx !== -1) {
            const exposed = state.hands[player].splice(idx, 1)[0];
            markVisible(exposed);
          }
        });
        state.melds[player].push({ type: 'chow', tiles: sequence.map((v) => ({ suit: tile.suit, value: v })) });
        state.discards[fromPlayer].pop();
        state.turn = player;
        state.phase = 'discard';
        return setState(state);
      }

      case 'NEXT_TURN':
        state.turn = (state.turn + 1) % 4;
        return setState(state);

      default:
        return state;
    }
  };

  const getState = () => state;
  return { dispatch, getState, markVisible };
}
