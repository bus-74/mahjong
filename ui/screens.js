const T = {
  en: {
    menuTitle: 'HUAT!', menuSub: '发！Singapore Mahjong',
    btnPlay: '🎮 Play Game', btnStats: '📊 Statistics', btnRules: '📖 Rules', btnLang: '🌐 Language',
    hintBtn: '💡 Hint', rulesTitle: 'Singapore/Malaysian Rules', rulesClose: 'Close',
  },
  zh: {
    menuTitle: '发！', menuSub: '新加坡麻将',
    btnPlay: '🎮 开始游戏', btnStats: '📊 统计', btnRules: '📖 规则', btnLang: '🌐 语言',
    hintBtn: '💡 提示', rulesTitle: '新加坡/马来西亚麻将规则', rulesClose: '关闭',
  },
};

let lang = 'en';

export function setLang(next) {
  lang = next;
  applyLang();
  showScreen('menu-screen');
}

export function getLang() { return lang; }
export function t(key) { return T[lang][key] || key; }

export function applyLang() {
  const L = T[lang];
  setText('menu-title', L.menuTitle);
  setText('menu-sub', L.menuSub);
  setText('btn-play', L.btnPlay);
  setText('btn-stats', L.btnStats);
  setText('btn-rules', L.btnRules);
  setText('btn-lang', L.btnLang);
  setText('hint-btn', L.hintBtn);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
}

export function showRulesOverlay() {
  document.getElementById('rules-title').textContent = t('rulesTitle');
  document.getElementById('rules-close').textContent = t('rulesClose');
  document.getElementById('rules-overlay').classList.remove('hidden');
}

export function hideRulesOverlay() {
  document.getElementById('rules-overlay').classList.add('hidden');
}
