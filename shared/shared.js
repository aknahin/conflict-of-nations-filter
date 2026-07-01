(function (root) {
  const STORAGE_KEY = "cononGameFilters";

  function getApi() {
    return root.browser || root.chrome || null;
  }

  function getStorageArea(name) {
    const api = getApi();
    return api && api.storage && api.storage[name] ? api.storage[name] : null;
  }

  function storageGet(area, keys) {
    if (!area || typeof area.get !== "function") {
      return Promise.resolve({});
    }

    try {
      const result = area.get(keys);
      if (result && typeof result.then === "function") {
        return result;
      }
    } catch (error) {
      return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
      area.get(keys, (value) => {
        const api = getApi();
        const lastError = api && api.runtime ? api.runtime.lastError : null;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve(value || {});
      });
    });
  }

  function storageSet(area, values) {
    if (!area || typeof area.set !== "function") {
      return Promise.resolve();
    }

    try {
      const result = area.set(values);
      if (result && typeof result.then === "function") {
        return result;
      }
    } catch (error) {
      return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
      area.set(values, () => {
        const api = getApi();
        const lastError = api && api.runtime ? api.runtime.lastError : null;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  function mergeFilterRecords(records) {
    const merged = {};
    for (const record of records) {
      if (record && typeof record === "object") {
        Object.assign(merged, record);
      }
    }
    return normalizeFilters(merged);
  }

  function toNullableNumber(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function parseIntegerFromText(text) {
    if (!text) {
      return null;
    }
    const match = String(text).match(/-?\d+(?:\.\d+)?/);
    if (!match) {
      return null;
    }
    const number = Number(match[0]);
    return Number.isFinite(number) ? number : null;
  }

  function stripTags(html) {
    return String(html || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parsePlayerFill(text) {
    const match = String(text || "").match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) {
      return null;
    }
    const occupied = Number(match[1]);
    const total = Number(match[2]);
    if (!Number.isFinite(occupied) || !Number.isFinite(total) || total <= 0) {
      return null;
    }
    return (occupied / total) * 100;
  }

  function normalizeFilters(filters) {
    return {
      speedMin: toNullableNumber(filters && filters.speedMin),
      daysRunningMin: toNullableNumber(filters && filters.daysRunningMin),
      playerFillMax: toNullableNumber(filters && filters.playerFillMax),
    };
  }

  function normalizeInputFilters(filters) {
    return {
      speedMin: toNullableNumber(filters && filters.speedMin),
      daysRunningMin: toNullableNumber(filters && filters.daysRunningMin),
      playerFillMax: toNullableNumber(filters && filters.playerFillMax),
    };
  }

  function extractCardDataFromElement(card) {
    if (!card || typeof card.querySelectorAll !== "function") {
      return null;
    }

    const dayNodes = Array.from(card.querySelectorAll(".game_info__day"));
    const speed = parseIntegerFromText(dayNodes[0] ? dayNodes[0].textContent : "");
    const daysRunning = parseIntegerFromText(dayNodes[1] ? dayNodes[1].textContent : "");
    const playersNode = card.querySelector(".game_info__players");
    const playerFill = parsePlayerFill(playersNode ? playersNode.textContent : "");

    return {
      daysRunning,
      playerFill,
      speed,
    };
  }

  function extractCardDataFromMarkup(markup) {
    const source = String(markup || "");
    const dayMatches = Array.from(source.matchAll(/<span class="game_info__day">([\s\S]*?)<\/span>/g));
    const playersMatch = source.match(/<span class="game_info__players">([\s\S]*?)<\/span>/);

    return {
      speed: parseIntegerFromText(stripTags(dayMatches[0] ? dayMatches[0][1] : "")),
      daysRunning: parseIntegerFromText(stripTags(dayMatches[1] ? dayMatches[1][1] : "")),
      playerFill: parsePlayerFill(stripTags(playersMatch ? playersMatch[1] : "")),
    };
  }

  function matchesFilters(cardData, filters) {
    const normalized = normalizeFilters(filters);

    if (normalized.speedMin !== null) {
      if (cardData.speed === null || cardData.speed < normalized.speedMin) {
        return false;
      }
    }

    if (normalized.daysRunningMin !== null) {
      if (cardData.daysRunning === null || cardData.daysRunning < normalized.daysRunningMin) {
        return false;
      }
    }

    if (normalized.playerFillMax !== null) {
      if (cardData.playerFill === null || cardData.playerFill > normalized.playerFillMax) {
        return false;
      }
    }

    return true;
  }

  async function readFilters() {
    const syncArea = getStorageArea("sync");
    const localArea = getStorageArea("local");
    const [syncRecord, localRecord] = await Promise.all([
      storageGet(syncArea, STORAGE_KEY).catch(() => ({})),
      storageGet(localArea, STORAGE_KEY).catch(() => ({})),
    ]);

    return mergeFilterRecords([localRecord[STORAGE_KEY], syncRecord[STORAGE_KEY]]);
  }

  async function writeFilters(filters) {
    const normalized = normalizeInputFilters(filters);
    const payload = { [STORAGE_KEY]: normalized };
    const syncArea = getStorageArea("sync");
    const localArea = getStorageArea("local");

    const writes = [
      storageSet(syncArea, payload).catch(() => null),
      storageSet(localArea, payload).catch(() => null),
    ];

    await Promise.all(writes);
    return normalized;
  }

  function getCardRoot(node) {
    if (!node) {
      return null;
    }
    if (typeof node.closest === "function") {
      return node.closest(".v-popover.uber_game_tile") || node.closest(".uber_game_tile") || node;
    }
    return node;
  }

  function findGameCards(root) {
    const context = root || document;
    const cards = Array.from(context.querySelectorAll(".v-popover.uber_game_tile"));
    return cards.length ? cards : Array.from(context.querySelectorAll(".uber_game_tile"));
  }

  function createFilterController(options) {
    const state = {
      filters: normalizeFilters(options && options.initialFilters),
      observer: null,
      scheduled: false,
      started: false,
    };

    function applyToCard(card) {
      const cardRoot = getCardRoot(card);
      if (!cardRoot) {
        return;
      }

      const data = extractCardDataFromElement(cardRoot);
      const shouldShow = data ? matchesFilters(data, state.filters) : true;
      cardRoot.hidden = !shouldShow;
      cardRoot.setAttribute("data-conon-filter-hidden", shouldShow ? "false" : "true");
      cardRoot.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    }

    function scanNow() {
      const cards = findGameCards(document);
      for (const card of cards) {
        applyToCard(card);
      }
      state.scheduled = false;
    }

    function scheduleScan() {
      if (state.scheduled) {
        return;
      }
      state.scheduled = true;
      setTimeout(scanNow, 50);
    }

    function startObserver() {
      if (state.started) {
        return;
      }
      state.started = true;

      const target = document.body || document.documentElement;
      if (!target) {
        return;
      }

      state.observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "childList" && (mutation.addedNodes.length || mutation.removedNodes.length)) {
            scheduleScan();
            return;
          }
        }
      });

      state.observer.observe(target, {
        childList: true,
        subtree: true,
      });
    }

    return {
      async init() {
        state.filters = await readFilters();
        scanNow();
        startObserver();
        return state.filters;
      },
      applyFilters(nextFilters) {
        state.filters = normalizeFilters(nextFilters);
        scanNow();
        return state.filters;
      },
      async updateFilters(nextFilters) {
        state.filters = normalizeFilters(nextFilters);
        await writeFilters(state.filters);
        scanNow();
        return state.filters;
      },
      applyNow: scanNow,
      getFilters() {
        return { ...state.filters };
      },
      getState() {
        return { ...state };
      },
      startObserver,
      syncFromStorage() {
        return readFilters().then((filters) => {
          state.filters = filters;
          scanNow();
          return filters;
        });
      },
    };
  }

  root.CononFilter = Object.freeze({
    STORAGE_KEY,
    createFilterController,
    extractCardDataFromElement,
    extractCardDataFromMarkup,
    findGameCards,
    getStorageArea,
    matchesFilters,
    normalizeFilters,
    normalizeInputFilters,
    parseIntegerFromText,
    parsePlayerFill,
    readFilters,
    stripTags,
    writeFilters,
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
