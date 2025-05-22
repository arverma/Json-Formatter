// background.js
// Service worker for JSON Formatter Pro Chrome extension.
// Handles side panel open/close logic, tab updates, and robust state management.

let panelState = {};

// --- Extension Icon Click: Toggle Side Panel ---
// Handles the extension icon click to toggle the side panel for the current tab
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

// --- Listen for Manual Panel Close (if supported) ---
if (chrome.sidePanel.onPanelClosed) {
  chrome.sidePanel.onPanelClosed.addListener((event) => {
    const tabId = event.tabId;
    // User closed the side panel manually
    console.log("🔒 Side panel closed by user");
  });
}

// --- Ensure Side Panel is Available on Relevant Tabs ---
// Sets the side panel path for all tabs except chrome:// and about://
// Does not force the panel open or enabled by default.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.id || !tab.url) {
    return;
  }
  try {
    const url = new URL(tab.url);
    if (url.protocol === 'chrome:' || url.protocol === 'about:') {
      // Disable side panel on internal Chrome/edge/about pages
      const currentOptions = await chrome.sidePanel.getOptions({ tabId });
      if (currentOptions && (currentOptions.enabled || currentOptions.path)) {
        await chrome.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: false });
      }
      return;
    }
    // Ensure side panel path is set for all other tabs
    const currentOptions = await chrome.sidePanel.getOptions({ tabId });
    if (!currentOptions || currentOptions.path !== 'sidepanel.html') {
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel.html',
        enabled: currentOptions ? currentOptions.enabled : false,
      });
    }
  } catch (error) {
    // Ignore common errors (e.g., tab closed, invalid tab ID)
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