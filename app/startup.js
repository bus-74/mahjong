import { createDispatcher, PLAYER, WINDS_ORDER } from '../game/state.js';
import { canChow, canHu, canKong, canPong, chowSequence } from '../game/rules.js';
import { scoreWinningHand } from '../game/scoring.js';
import { chooseDiscard, mediumDiscard } from '../game/ai.js';
import { applyLang, getLang, hideRulesOverlay, setLang, showRulesOverlay, showScreen } from '../ui/screens.js';
import { createCanvasRenderer } from '../ui/canvasRenderer.js';

const WIND_MAP = { East: '東', South: '南', West: '西', North: '北' };
const DRAGON_MAP = { Red: '中', Green: '發', White: '白' };

const renderer = createCanvasRenderer({ onTileTap: handlePlayerTap });
const store = createDispatcher((state) => renderer.render(state));
let difficulty = 'medium';

function bindUI() {
  document.getElementById('lang-en').addEventListener('click', () => setLang('en'));
  document.getElementById('lang-zh').addEventListener('click', () => setLang('zh'));
  document.getElementById('btn-play').addEventListener('click', () => showScreen('diff-screen'));
  document.getElementById('btn-lang').addEventListener('click', () => showScreen('lang-screen'));
  document.getElementById('btn-rules').addEventListener('click', showRulesOverlay);
  document.getElementById('rules-close').addEventListener('click', hideRulesOverlay);
  document.querySelectorAll('[data-diff]').forEach((el) => {
    el.addEventListener('click', () => startGame(el.dataset.diff));
  });
  document.querySelectorAll('[data-action="back-menu"]').forEach((el) => {
    el.addEventListener('click', () => showScreen('menu-screen'));
  });
  document.getElementById('hint-btn').addEventListener('click', doHint);
}

function startGame(diff) {
  difficulty = diff;
  showScreen('game-screen');
  renderer.clearSelection();
  store.dispatch({ type: 'INIT_GAME', diff });
  processFlowersAll(() => {
    store.dispatch({ type: 'DRAW_TILE', player: 0 });
    maybeBotTurn();
  });
}

function processFlowersAll(done) {
  const state = store.getState();
  for (let p = 0; p < 4; p++) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = state.hands[p].length - 1; i >= 0; i--) {
        const tile = state.hands[p][i];
        if (tile.suit === 'flower' || tile.suit === 'season') {
          state.hands[p].splice(i, 1);
          state.flowers[p].push(tile);
          store.markVisible(tile);
          store.dispatch({ type: 'DRAW_TILE', player: p });
          changed = true;
          break;
        }
      }
    }
  }
  done();
}

function handlePlayerTap(index) {
  const state = store.getState();
  if (!state || state.turn !== PLAYER || state.phase !== 'discard') return;
  store.dispatch({ type: 'DISCARD', player: PLAYER, index });
  renderer.clearSelection();
  resolveClaims(PLAYER, state.lastDiscard);
}

function resolveClaims(fromPlayer, tile) {
  const state = store.getState();
  const checks = [];
  for (let p = 0; p < 4; p++) {
    if (p === fromPlayer) continue;
    const left = (fromPlayer + 1) % 4 === p;
    if (canHu(state.hands[p], state.melds[p], tile)) checks.push({ p, action: 'hu', priority: 4 });
    else if (canKong(state.hands[p], tile)) checks.push({ p, action: 'kong', priority: 3 });
    else if (canPong(state.hands[p], tile)) checks.push({ p, action: 'pong', priority: 2 });
    else if (left && canChow(state.hands[p], tile, fromPlayer)) checks.push({ p, action: 'chow', priority: 1 });
  }
  if (checks.length === 0) return advanceTurn();
  checks.sort((a, b) => b.priority - a.priority);
  const top = checks[0];
  if (top.p === PLAYER) return;
  runBotClaim(top, tile, fromPlayer);
}

function runBotClaim(top, tile, fromPlayer) {
  if (top.action === 'hu') {
    const state = store.getState();
    const result = scoreWinningHand({
      hand: [...state.hands[top.p], tile],
      melds: state.melds[top.p],
      flowers: state.flowers[top.p],
      context: { selfDraw: false, dealer: state.dealer === top.p, seatWind: WINDS_ORDER[top.p] },
      lang: getLang(),
      maps: { windMap: WIND_MAP, dragonMap: DRAGON_MAP },
    });
    if (result.faan >= 3) {
      state.phase = 'score';
      document.getElementById('score-overlay').classList.remove('hidden');
      document.getElementById('score-title').textContent = 'Hand Complete';
      document.getElementById('score-sub').textContent = `Winner: P${top.p + 1} (${result.faan} faan)`;
      return;
    }
  }
  if (top.action === 'pong') store.dispatch({ type: 'CLAIM_PONG', player: top.p, tile, fromPlayer });
  if (top.action === 'kong') {
    store.dispatch({ type: 'CLAIM_KONG', player: top.p, tile, fromPlayer });
    store.dispatch({ type: 'DRAW_TILE', player: top.p });
  }
  if (top.action === 'chow') {
    const seq = chowSequence(store.getState().hands[top.p], tile);
    if (seq) store.dispatch({ type: 'CLAIM_CHOW', player: top.p, tile, fromPlayer, sequence: seq });
  }
  maybeBotTurn();
}

function advanceTurn() {
  store.dispatch({ type: 'NEXT_TURN' });
  const state = store.getState();
  store.dispatch({ type: 'DRAW_TILE', player: state.turn });
  maybeBotTurn();
}

function maybeBotTurn() {
  const state = store.getState();
  if (!state || state.phase === 'score' || state.turn === PLAYER) {
    if (state?.turn !== PLAYER) renderer.clearSelection();
    return;
  }
  const idx = chooseDiscard(difficulty, state, state.turn);
  setTimeout(() => {
    store.dispatch({ type: 'DISCARD', player: state.turn, index: idx });
    resolveClaims(state.turn, store.getState().lastDiscard);
  }, 300);
}

function doHint() {
  const state = store.getState();
  if (!state || state.turn !== PLAYER || state.phase !== 'discard') return;
  const idx = mediumDiscard(state, PLAYER);
  const tile = state.hands[PLAYER][idx];
  const text = `Hint: discard ${tile.value} ${tile.suit}`;
  const el = document.getElementById('message-toast');
  el.textContent = text;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 1400);
}

window.addEventListener('load', () => {
  renderer.init();
  bindUI();
  applyLang();
  showScreen('lang-screen');
});
