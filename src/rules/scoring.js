(function (global) {
  const NUMBER_SUITS = new Set(['bamboo', 'circle', 'character']);

  function sortTiles(tiles) {
    const suitOrder = { bamboo: 0, circle: 1, character: 2, wind: 3, dragon: 4 };
    return [...tiles].sort((a, b) => {
      const sa = suitOrder[a.suit] ?? 9;
      const sb = suitOrder[b.suit] ?? 9;
      if (sa !== sb) return sa - sb;
      if (a.value === b.value) return 0;
      return String(a.value).localeCompare(String(b.value));
    });
  }

  function tileKey(tile) {
    return `${tile.suit}|${tile.value}`;
  }

  function parseKey(key) {
    const [suit, raw] = key.split('|');
    const parsed = Number(raw);
    const value = Number.isNaN(parsed) ? raw : parsed;
    return { suit, value };
  }

  function buildCounts(tiles) {
    const counts = new Map();
    tiles.forEach((t) => {
      const key = tileKey(t);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }

  function countOf(counts, tile) {
    return counts.get(tileKey(tile)) || 0;
  }

  function cloneCounts(counts) {
    return new Map(counts);
  }

  function consume(counts, tiles) {
    for (const tile of tiles) {
      const key = tileKey(tile);
      const next = (counts.get(key) || 0) - 1;
      if (next < 0) return false;
      if (next === 0) counts.delete(key);
      else counts.set(key, next);
    }
    return true;
  }

  function firstTileFromCounts(counts) {
    if (counts.size === 0) return null;
    const keys = [...counts.keys()].sort((a, b) => {
      const ta = parseKey(a);
      const tb = parseKey(b);
      return sortTiles([ta, tb])[0] === ta ? -1 : 1;
    });
    return parseKey(keys[0]);
  }

  function canonicalizeMeld(meld) {
    const tiles = sortTiles(meld.tiles);
    let type = meld.type;
    if (!type) {
      const same = tiles.every((t) => t.suit === tiles[0].suit && t.value === tiles[0].value);
      type = same ? (tiles.length === 4 ? 'kong' : 'pong') : 'chow';
    }
    return { type, tiles, exposed: !!meld.exposed, concealed: !meld.exposed };
  }

  function meldSignature(meld) {
    return `${meld.type}:${meld.tiles.map(tileKey).join(',')}:${meld.exposed ? 'E' : 'C'}`;
  }

  function buildMeldSets(counts, meldsNeeded, acc, out) {
    if (meldsNeeded === 0) {
      if (counts.size === 0) out.push(acc.map((m) => canonicalizeMeld(m)));
      return;
    }
    const first = firstTileFromCounts(counts);
    if (!first) return;

    if (countOf(counts, first) >= 3) {
      const nextCounts = cloneCounts(counts);
      const tiles = [first, first, first];
      if (consume(nextCounts, tiles)) {
        buildMeldSets(nextCounts, meldsNeeded - 1, [...acc, { type: 'pong', tiles, exposed: false }], out);
      }
    }

    if (NUMBER_SUITS.has(first.suit) && typeof first.value === 'number' && first.value <= 7) {
      const t2 = { suit: first.suit, value: first.value + 1 };
      const t3 = { suit: first.suit, value: first.value + 2 };
      if (countOf(counts, t2) >= 1 && countOf(counts, t3) >= 1) {
        const nextCounts = cloneCounts(counts);
        const tiles = [first, t2, t3];
        if (consume(nextCounts, tiles)) {
          buildMeldSets(nextCounts, meldsNeeded - 1, [...acc, { type: 'chow', tiles, exposed: false }], out);
        }
      }
    }
  }

  function decomposeHand(concealedTiles, exposedMelds) {
    const normalizedExposed = (exposedMelds || []).map((m) =>
      canonicalizeMeld({
        type: m.type,
        tiles: m.tiles,
        exposed: !m.concealed,
      })
    );

    const meldsNeeded = 4 - normalizedExposed.length;
    if (meldsNeeded < 0) return null;

    const sortedConcealed = sortTiles(concealedTiles || []);
    const counts = buildCounts(sortedConcealed);
    const keys = [...counts.keys()];
    const candidates = [];

    for (const key of keys) {
      if ((counts.get(key) || 0) < 2) continue;
      const pairTile = parseKey(key);
      const pair = [pairTile, pairTile];
      const next = cloneCounts(counts);
      if (!consume(next, pair)) continue;

      const meldSets = [];
      buildMeldSets(next, meldsNeeded, [], meldSets);
      for (const melds of meldSets) {
        const allMelds = [...normalizedExposed, ...melds]
          .map(canonicalizeMeld)
          .sort((a, b) => meldSignature(a).localeCompare(meldSignature(b)));
        const signature = `${allMelds.map(meldSignature).join(';')}|pair:${pair.map(tileKey).join(',')}`;
        candidates.push({ melds: allMelds, pair: sortTiles(pair), signature });
      }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.signature.localeCompare(b.signature));
    const best = candidates[0];
    return {
      melds: best.melds,
      pair: best.pair,
      concealedTiles: sortedConcealed,
      exposedMeldCount: normalizedExposed.length,
    };
  }

  function scoreDescription(entry, lang, maps) {
    if (entry.key === 'flower') return lang === 'zh' ? `花牌 (${entry.meta.value})` : `Flower (${entry.meta.value})`;
    if (entry.key === 'pure') return lang === 'zh' ? '清一色' : 'Pure Hand (One Suit)';
    if (entry.key === 'mixed') return lang === 'zh' ? '混一色' : 'Mixed Hand';
    if (entry.key === 'allPongs') return lang === 'zh' ? '碰碰胡' : 'All Pongs';
    if (entry.key === 'pingHu') return lang === 'zh' ? '平胡' : 'Ping Hu (All Chows)';
    if (entry.key === 'selfDraw') return lang === 'zh' ? '自摸' : 'Self Draw (Zimo)';
    if (entry.key === 'dragonPong') {
      const v = entry.meta.value;
      const dragon = maps?.dragonMap?.[v] || v;
      return lang === 'zh' ? `箭刻 (${dragon})` : `Dragon Pong (${v})`;
    }
    if (entry.key === 'seatWindPong') return lang === 'zh' ? '门风刻' : 'Seat Wind Pong';
    if (entry.key === 'dealerModifier') return lang === 'zh' ? '庄家加成（计分阶段）' : 'Dealer Modifier (points stage)';
    return entry.key;
  }

  function evaluateWinningHand(input) {
    const {
      concealedTiles,
      exposedMelds,
      flowers = [],
      selfDraw = false,
      dealer = false,
      seatWind,
      lang = 'en',
      maps,
    } = input;

    const decomposition = decomposeHand(concealedTiles, exposedMelds);
    if (!decomposition) {
      return { isWinning: false, faan: 0, breakdown: [], decomposition: null };
    }

    let faan = 0;
    const breakdown = [];
    const add = (key, points, meta) => {
      faan += points;
      breakdown.push({ key, faan: points, desc: scoreDescription({ key, meta }, lang, maps), meta });
    };

    flowers.forEach((f) => add('flower', 1, { value: f.value }));

    const allTiles = [
      ...decomposition.pair,
      ...decomposition.melds.flatMap((m) => m.tiles),
    ];
    const suits = new Set(allTiles.filter((t) => NUMBER_SUITS.has(t.suit)).map((t) => t.suit));
    const hasHonour = allTiles.some((t) => t.suit === 'wind' || t.suit === 'dragon');

    const allPongs = decomposition.melds.every((m) => m.type === 'pong' || m.type === 'kong');
    const allChows = decomposition.melds.every((m) => m.type === 'chow');

    if (suits.size === 1 && !hasHonour) add('pure', 7);
    else if (suits.size === 1 && hasHonour) add('mixed', 3);

    if (allPongs) add('allPongs', 3);
    if (allChows) add('pingHu', 1);

    decomposition.melds
      .filter((m) => (m.type === 'pong' || m.type === 'kong') && m.tiles[0].suit === 'dragon')
      .forEach((m) => add('dragonPong', 1, { value: m.tiles[0].value }));

    decomposition.melds
      .filter((m) => (m.type === 'pong' || m.type === 'kong') && m.tiles[0].suit === 'wind' && m.tiles[0].value === seatWind)
      .forEach(() => add('seatWindPong', 1, { value: seatWind }));

    if (selfDraw) add('selfDraw', 1);
    if (dealer) breakdown.push({ key: 'dealerModifier', faan: 0, desc: scoreDescription({ key: 'dealerModifier' }, lang, maps) });

    return { isWinning: true, faan, breakdown, decomposition };
  }

  global.Scoring = {
    sortTiles,
    decomposeHand,
    evaluateWinningHand,
  };
})(typeof window !== 'undefined' ? window : globalThis);
