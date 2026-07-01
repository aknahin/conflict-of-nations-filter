import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

async function loadSharedHelpers() {
  const source = await readFile(new URL("../shared/shared.js", import.meta.url), "utf8");
  const sandbox = {
    console,
    globalThis: null,
    window: null,
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: "shared.js" });
  return sandbox.CononFilter;
}

function extractSnippetByTitle(html, title) {
  const titleIndex = html.indexOf(title);
  assert.ok(titleIndex >= 0, `expected title ${title} in sample html`);

  const start = html.lastIndexOf('<div class="v-popover uber_game_tile', titleIndex);
  assert.ok(start >= 0, "expected card start");

  const end = html.indexOf('<div class="v-popover uber_game_tile', titleIndex + title.length);
  return html.slice(start, end > 0 ? end : html.length);
}

const sampleHtml = `
<div class="v-popover uber_game_tile button_click uber_game_tile--new_game">
  <div class="trigger" style="display: inline-block;">
    <div class="uber_game_tile__inner">
      <div class="uber_game_tile__top top">
        <h1 class="uber_game_tile__title">WORLD WAR 3 (4X SPEED)</h1>
        <div class="uber_my_game_tile__info game_info">
          <span class="game_info__day"><svg></svg>4</span>
          <span class="game_info__day"><svg></svg>1</span>
          <span class="game_info__players"><svg></svg>40/64</span>
          <span class="game_info__id"><svg></svg>10840192</span>
        </div>
      </div>
    </div>
  </div>
</div>
`;

test("parses representative game card markup", async () => {
  const shared = await loadSharedHelpers();
  const snippet = extractSnippetByTitle(sampleHtml, "WORLD WAR 3 (4X SPEED)");
  const data = shared.extractCardDataFromMarkup(snippet);

  assert.deepEqual({ ...data }, {
    speed: 4,
    daysRunning: 1,
    playerFill: 62.5,
  });
});

test("matches minimum speed, minimum days, and maximum fill", async () => {
  const shared = await loadSharedHelpers();

  assert.equal(shared.matchesFilters({ speed: 4, daysRunning: 5, playerFill: 40 }, {
    speedMin: 4,
    daysRunningMin: 2,
    playerFillMax: 50,
  }), true);

  assert.equal(shared.matchesFilters({ speed: 2, daysRunning: 5, playerFill: 40 }, {
    speedMin: 4,
    daysRunningMin: 2,
    playerFillMax: 50,
  }), false);

  assert.equal(shared.matchesFilters({ speed: 4, daysRunning: 1, playerFill: 40 }, {
    speedMin: 4,
    daysRunningMin: 2,
    playerFillMax: 50,
  }), false);

  assert.equal(shared.matchesFilters({ speed: 4, daysRunning: 5, playerFill: 60 }, {
    speedMin: 4,
    daysRunningMin: 2,
    playerFillMax: 50,
  }), false);
});

test("hides cards missing fields when the relevant filter is active", async () => {
  const shared = await loadSharedHelpers();

  assert.equal(shared.matchesFilters({ speed: null, daysRunning: 5, playerFill: 20 }, {
    speedMin: 1,
  }), false);

  assert.equal(shared.matchesFilters({ speed: 2, daysRunning: null, playerFill: 20 }, {
    daysRunningMin: 1,
  }), false);

  assert.equal(shared.matchesFilters({ speed: 2, daysRunning: 3, playerFill: null }, {
    playerFillMax: 40,
  }), false);
});

test("normalizes nullish input values", async () => {
  const shared = await loadSharedHelpers();
  const normalized = { ...shared.normalizeInputFilters({
    speedMin: "",
    daysRunningMin: "3",
    playerFillMax: 40,
  }) };

  assert.deepEqual(normalized, {
    speedMin: null,
    daysRunningMin: 3,
    playerFillMax: 40,
  });
});
