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

      const browserApi = globalThis.browser || globalThis.chrome;
      if (browserApi && browserApi.runtime && typeof browserApi.runtime.sendMessage === "function") {
        try {
          browserApi.runtime.sendMessage({ type: "conon-apply-filters", filters });
        } catch (error) {
          // Ignore delivery errors; storage persistence still succeeded.
        }
      }

      setStatus("Applied.");
    } catch (error) {
      setStatus(`Could not save filters: ${error.message}`, true);
    }
  }

  form.addEventListener("submit", saveFilters);
  loadFilters().catch((error) => {
    setStatus(`Could not load filters: ${error.message}`, true);
  });
})();
