#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scoringPath = path.resolve(__dirname, '..', 'src', 'rules', 'scoring.js');
const fixturePath = path.resolve(__dirname, '..', 'testdata', 'scoring_cases.json');

const src = fs.readFileSync(scoringPath, 'utf8');
const sandbox = { console, globalThis: {}, window: {} };
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'scoring.js' });
const Scoring = sandbox.window.Scoring || sandbox.globalThis.Scoring;

if (!Scoring) {
  throw new Error('Scoring module did not expose window.Scoring/globalThis.Scoring');
}

const cases = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
let failures = 0;

for (const c of cases) {
  const result = Scoring.evaluateWinningHand({
    concealedTiles: c.concealedTiles,
    exposedMelds: c.exposedMelds,
    flowers: c.flowers,
    ...c.context,
    maps: {
      dragonMap: { red: '中', green: '發', white: '白' },
      windMap: { east: '东', south: '南', west: '西', north: '北' },
    },
  });

  const dealerKey = result.breakdown.some((b) => b.key === 'dealerModifier');
  const dealerOk = c.expectDealerBreakdown === undefined ? true : dealerKey === c.expectDealerBreakdown;
  const pass = result.isWinning && result.faan === c.expectedFaan && dealerOk;

  if (!pass) {
    failures += 1;
    console.error(`FAIL ${c.name}: expected faan ${c.expectedFaan}, got ${result.faan}`);
    if (!dealerOk) {
      console.error(`  dealer breakdown mismatch; expected ${c.expectDealerBreakdown}, got ${dealerKey}`);
    }
  } else {
    console.log(`PASS ${c.name}: ${result.faan} faan`);
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(`All ${cases.length} scoring cases passed.`);
