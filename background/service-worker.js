/**
 * FlowFix Background Service Worker
 * Handles messaging between content scripts and popup
 */

// Store latest metrics from each platform
const metricsStore = {
  zapier: null,
  make: null
};

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[FlowFix BG] Received message:', message.type);

  switch (message.type) {
    case 'METRICS_EXTRACTED':
      handleMetricsExtracted(message.metrics, sender.tab);
      break;
      
    case 'GET_METRICS':
      sendResponse(metricsStore);
      break;
      
    case 'OPEN_POPUP':
      // Store metrics and badge will show them when popup opens
      if (message.metrics) {
        metricsStore[message.metrics.platform] = message.metrics;
      }
      break;
      
    case 'ANALYZE_TAB':
      analyzeCurrentTab(sendResponse);
      return true; // Keep channel open for async response
  }
});

/**
 * Handle metrics extracted from content script
 */
function handleMetricsExtracted(metrics, tab) {
  if (!metrics || !metrics.platform) return;
  
  metricsStore[metrics.platform] = metrics;
  
  // Update badge with health score
  const score = metrics.healthScore || 0;
  const color = getScoreColor(score);
  
  chrome.action.setBadgeText({ 
    text: score.toString(),
    tabId: tab?.id 
  });
  
  chrome.action.setBadgeBackgroundColor({ 
    color: color,
    tabId: tab?.id 
  });

  console.log(`[FlowFix BG] Updated ${metrics.platform} metrics, score: ${score}`);
}

/**
 * Get badge color based on score
 */
function getScoreColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

/**
 * Analyze the current tab on demand
 */
async function analyzeCurrentTab(sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.url) {
      sendResponse({ error: 'No active tab' });
      return;
    }

    // Check if we're on a supported platform
    const isZapier = tab.url.includes('zapier.com');
    const isMake = tab.url.includes('make.com');

    if (!isZapier && !isMake) {
      sendResponse({ 
        error: 'Not on a supported platform',
        hint: 'Open Zapier or Make.com dashboard to analyze'
      });
      return;
    }

    // Request content script to extract metrics
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_METRICS' });
    sendResponse(response);
    
  } catch (error) {
    console.error('[FlowFix BG] Error analyzing tab:', error);
    sendResponse({ error: error.message });
  }
}

// Set default badge
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
  console.log('[FlowFix] Extension installed');
});

// Clear metrics when navigating away from supported sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    const isSupported = tab.url?.includes('zapier.com') || tab.url?.includes('make.com');
    if (!isSupported) {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});
