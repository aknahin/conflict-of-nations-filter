(function () {
  const api = globalThis.CononFilter;
  if (!api) {
    return;
  }

  const controller = api.createFilterController();
  let storageListenerAttached = false;

  function attachStorageListener() {
    if (storageListenerAttached) {
      return;
    }
    const browserApi = globalThis.browser || globalThis.chrome;
    if (!browserApi || !browserApi.storage || !browserApi.storage.onChanged) {
      return;
    }
    browserApi.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" && areaName !== "local") {
        return;
      }
      if (!changes || !(api.STORAGE_KEY in changes)) {
        return;
      }
      controller.syncFromStorage();
    });
    storageListenerAttached = true;
  }

  function start() {
    controller.init().catch(() => {
      controller.applyNow();
    });
    attachStorageListener();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
