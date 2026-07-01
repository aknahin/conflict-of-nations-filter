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

test("parses representative game card markup from the sample file", async () => {
  const shared = await loadSharedHelpers();
  const html = await readFile(new URL("../html-page-sample.txt", import.meta.url), "utf8");
  const snippet = extractSnippetByTitle(html, "WORLD WAR 3 (4X SPEED)");
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
