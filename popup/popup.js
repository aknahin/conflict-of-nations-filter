(function () {
  const api = globalThis.CononFilter;
  if (!api) {
    return;
  }

  const form = document.getElementById("filter-form");
  const speedInput = document.getElementById("speed-min");
  const daysInput = document.getElementById("days-running-min");
  const playerInput = document.getElementById("player-fill-max");
  const status = document.getElementById("status");

  function setStatus(message, isError) {
    status.textContent = message;
    status.dataset.error = isError ? "true" : "false";
  }

  function inputToNumber(input) {
    return input.value === "" ? null : Number(input.value);
  }

  function setInputValue(input, value) {
    input.value = value === null || value === undefined ? "" : String(value);
  }

  function getBrowserApi() {
    return globalThis.browser || globalThis.chrome;
  }

  async function sendApplyMessage(filters) {
    const browserApi = getBrowserApi();
    if (!browserApi) {
      return;
    }

    const tabsApi = browserApi.tabs;
    if (!tabsApi || typeof tabsApi.query !== "function" || typeof tabsApi.sendMessage !== "function") {
      return;
    }

    const queryResult = tabsApi.query({ active: true, currentWindow: true });
    const tabs = queryResult && typeof queryResult.then === "function" ? await queryResult : await new Promise((resolve, reject) => {
      tabsApi.query({ active: true, currentWindow: true }, (result) => {
        const lastError = browserApi.runtime && browserApi.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        resolve(result || []);
      });
    });

    const activeTab = tabs && tabs[0];
    if (!activeTab || typeof activeTab.id !== "number") {
      return;
    }

    const sendResult = tabsApi.sendMessage(activeTab.id, { type: "conon-apply-filters", filters });
    if (sendResult && typeof sendResult.then === "function") {
      await sendResult.catch(() => null);
    }
  }

  async function loadFilters() {
    const filters = await api.readFilters();
    setInputValue(speedInput, filters.speedMin);
    setInputValue(daysInput, filters.daysRunningMin);
    setInputValue(playerInput, filters.playerFillMax);
  }

  async function saveFilters(event) {
    event.preventDefault();
    try {
      const filters = await api.writeFilters({
        speedMin: inputToNumber(speedInput),
        daysRunningMin: inputToNumber(daysInput),
        playerFillMax: inputToNumber(playerInput),
      });
      await sendApplyMessage(filters);

      setStatus("Applied.");
    } catch (error) {
      setStatus(`Could not apply filters: ${error.message}`, true);
    }
  }

  form.addEventListener("submit", saveFilters);
  loadFilters().catch((error) => {
    setStatus(`Could not load filters: ${error.message}`, true);
  });
})();
