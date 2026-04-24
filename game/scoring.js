export function scoreWinningHand({ hand, melds, flowers, context, lang, maps }) {
  return window.Scoring.evaluateWinningHand({
    concealedTiles: [...hand].sort(sortTiles),
    exposedMelds: melds || [],
    flowers: flowers || [],
    selfDraw: !!context.selfDraw,
    dealer: !!context.dealer,
    seatWind: context.seatWind,
    lang,
    maps,
  });
}

export function canWin(hand, melds) {
  return !!window.Scoring.decomposeHand([...hand].sort(sortTiles), melds || []);
}

function suitOrder(suit) {
  if (suit === 'bamboo') return 0;
  if (suit === 'circle') return 1;
  if (suit === 'character') return 2;
  if (suit === 'wind') return 3;
  if (suit === 'dragon') return 4;
  return 5;
}

function sortTiles(a, b) {
  if (suitOrder(a.suit) !== suitOrder(b.suit)) return suitOrder(a.suit) - suitOrder(b.suit);
  return String(a.value).localeCompare(String(b.value));
}
