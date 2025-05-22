let panelState = {};

// Handles the extension icon click to toggle the side panel
chrome.action.onClicked.addListener((tab) => {
  const tabId = tab.id;

  if (panelState[tabId]) {
    // Panel is open → close it
    chrome.sidePanel.setOptions({
      tabId: tabId,
      enabled: false,
    });
    panelState[tabId] = false;
    console.log("🔒 Side panel closed");
  } else {
    // Panel is closed → open it
    chrome.sidePanel.setOptions({
      tabId: tabId,
      path: "sidepanel.html",
      enabled: true,
    });
    chrome.sidePanel.open({ tabId: tabId });
    panelState[tabId] = true;
    console.log("🔓 Side panel opened");
  }
});

// Listen for manual panel close (if supported)
if (chrome.sidePanel.onPanelClosed) {
  chrome.sidePanel.onPanelClosed.addListener((event) => {
    const tabId = event.tabId;
    console.log("🔒 Side panel closed by user");
  });
}

// Ensures the side panel is available (path is set) on relevant tabs.
// Does not force the panel open or enabled by default.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.id || !tab.url) {
    return;
  }
  try {
    const url = new URL(tab.url);
    if (url.protocol === 'chrome:' || url.protocol === 'about:') {
      const currentOptions = await chrome.sidePanel.getOptions({ tabId });
      if (currentOptions && (currentOptions.enabled || currentOptions.path)) {
        await chrome.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: false });
      }
      return;
    }
    const currentOptions = await chrome.sidePanel.getOptions({ tabId });
    if (!currentOptions || currentOptions.path !== 'sidepanel.html') {
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel.html',
        enabled: currentOptions ? currentOptions.enabled : false,
      });
    }
  } catch (error) {
    if (
      error.message.includes('No tab with id') ||
      error.message.includes('No current window') ||
      error.message.includes('Invalid tab ID') ||
      error.message.includes('cannot be scripted')
    ) {
      // Safe to ignore
    } else {
      console.warn(
        `Error setting side panel options in onUpdated for tab ${tabId} (${tab.url}): ${error.message}`
      );
    }
  }
}); 