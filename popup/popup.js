/**
 * FlowFix Popup Script
 * Displays health metrics and recommendations
 */

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('loading');
  const noPlatformEl = document.getElementById('no-platform');
  const healthDisplayEl = document.getElementById('health-display');
  const analyzeBtn = document.getElementById('analyze-btn');

  // Get current tab URL to determine platform
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';

  const isZapier = url.includes('zapier.com');
  const isMake = url.includes('make.com');

  if (!isZapier && !isMake) {
    showState('no-platform');
    return;
  }

  // Try to get stored metrics
  const platform = isZapier ? 'zapier' : 'make';
  const storageKey = isZapier ? 'zapierMetrics' : 'makeMetrics';

  try {
    const stored = await chrome.storage.local.get(storageKey);
    const metrics = stored[storageKey];

    if (metrics && isRecent(metrics.timestamp)) {
      displayMetrics(metrics);
    } else {
      // Request fresh metrics from content script
      await requestMetrics();
    }
  } catch (error) {
    console.error('Error loading metrics:', error);
    showState('no-platform');
  }

  // Re-analyze button
  analyzeBtn.addEventListener('click', async () => {
    showState('loading');
    await requestMetrics();
  });
});

/**
 * Check if metrics are recent (within 5 minutes)
 */
function isRecent(timestamp) {
  if (!timestamp) return false;
  const age = Date.now() - new Date(timestamp).getTime();
  return age < 5 * 60 * 1000; // 5 minutes
}

/**
 * Request fresh metrics from content script
 */
async function requestMetrics() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'ANALYZE_TAB' });
    
    if (response?.error) {
      console.error('Analysis error:', response.error);
      showState('no-platform');
      return;
    }

    if (response?.metrics) {
      displayMetrics(response.metrics);
    } else {
      // Wait a bit for content script to extract
      setTimeout(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const isZapier = tab?.url?.includes('zapier.com');
        const storageKey = isZapier ? 'zapierMetrics' : 'makeMetrics';
        
        const stored = await chrome.storage.local.get(storageKey);
        if (stored[storageKey]) {
          displayMetrics(stored[storageKey]);
        } else {
          showState('no-platform');
        }
      }, 2000);
    }
  } catch (error) {
    console.error('Request metrics error:', error);
    showState('no-platform');
  }
}

/**
 * Show a specific state view
 */
function showState(state) {
  document.getElementById('loading').classList.toggle('hidden', state !== 'loading');
  document.getElementById('no-platform').classList.toggle('hidden', state !== 'no-platform');
  document.getElementById('health-display').classList.toggle('hidden', state !== 'health');
}

/**
 * Display metrics in the popup
 */
function displayMetrics(metrics) {
  showState('health');

  const score = metrics.healthScore || 0;
  const color = getScoreColor(score);

  // Update score ring
  const scoreRing = document.getElementById('score-ring');
  const scoreValue = document.getElementById('score-value');
  scoreRing.style.setProperty('--score-color', color);
  scoreValue.textContent = score;
  scoreValue.style.color = color;
  
  // Add critical pulse animation for low scores
  if (score < 40) {
    scoreRing.classList.add('critical');
  } else {
    scoreRing.classList.remove('critical');
  }
  
  // Accessibility: add aria-label
  scoreRing.setAttribute('role', 'img');
  scoreRing.setAttribute('aria-label', `Health score: ${score} out of 100. ${getScoreDescription(score)}`);

  // Update platform badge
  const platformName = document.getElementById('platform-name');
  platformName.textContent = metrics.platform === 'zapier' ? 'Zapier' : 'Make.com';

  // Build metrics grid
  const metricsGrid = document.getElementById('metrics-grid');
  metricsGrid.innerHTML = '';

  if (metrics.platform === 'zapier') {
    addMetric(metricsGrid, 'Total Zaps', metrics.totalZaps || 0);
    addMetric(metricsGrid, 'Errors', metrics.errorZaps || 0, metrics.errorZaps > 0 ? 'error' : 'success');
    addMetric(metricsGrid, 'Task Usage', `${metrics.taskUsagePercent || 0}%`, 
      getUsageClass(metrics.taskUsagePercent));
    addMetric(metricsGrid, 'Paused', metrics.pausedZaps || 0, metrics.pausedZaps > 0 ? 'warning' : 'success');
  } else {
    addMetric(metricsGrid, 'Scenarios', metrics.totalScenarios || 0);
    addMetric(metricsGrid, 'Errors', metrics.errorScenarios || 0, metrics.errorScenarios > 0 ? 'error' : 'success');
    addMetric(metricsGrid, 'Operations', `${metrics.operationsUsagePercent || 0}%`,
      getUsageClass(metrics.operationsUsagePercent));
    addMetric(metricsGrid, 'Inactive', metrics.inactiveScenarios || 0, 
      metrics.inactiveScenarios > 0 ? 'warning' : 'success');
  }

  // Generate recommendations
  const recommendations = generateRecommendations(metrics);
  const recList = document.getElementById('recommendations-list');
  recList.innerHTML = '';

  recommendations.forEach(rec => {
    const li = document.createElement('li');
    li.className = rec.level;
    li.textContent = rec.text;
    recList.appendChild(li);
  });
}

/**
 * Add a metric card to the grid
 * Uses DOM methods exclusively — no innerHTML — to prevent any XSS risk.
 */
function addMetric(container, label, value, statusClass = '') {
  const card = document.createElement('div');
  card.className = 'metric-card';

  const labelEl = document.createElement('div');
  labelEl.className = 'metric-label';
  labelEl.textContent = label;

  const valueEl = document.createElement('div');
  valueEl.className = statusClass ? `metric-value ${statusClass}` : 'metric-value';
  valueEl.textContent = value;

  card.appendChild(labelEl);
  card.appendChild(valueEl);
  container.appendChild(card);
}

/**
 * Get usage class based on percentage
 */
function getUsageClass(percent) {
  if (percent >= 90) return 'error';
  if (percent >= 75) return 'warning';
  return 'success';
}

/**
 * Get score color
 */
function getScoreColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

/**
 * Get score description for accessibility
 */
function getScoreDescription(score) {
  if (score >= 80) return 'Healthy';
  if (score >= 60) return 'Needs attention';
  if (score >= 40) return 'Degraded';
  return 'Critical';
}

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(metrics) {
  const recs = [];
  
  const isZapier = metrics.platform === 'zapier';
  const usagePercent = isZapier ? metrics.taskUsagePercent : metrics.operationsUsagePercent;
  const errors = isZapier ? metrics.errorZaps : metrics.errorScenarios;
  const total = isZapier ? metrics.totalZaps : metrics.totalScenarios;

  // Critical: High error rate
  if (errors > 0 && total > 0) {
    const errorRate = (errors / total) * 100;
    if (errorRate >= 20) {
      recs.push({
        level: 'critical',
        text: `${errors} workflows have errors. Check error logs and fix triggers.`
      });
    } else if (errorRate > 0) {
      recs.push({
        level: 'warning',
        text: `${errors} workflow${errors > 1 ? 's' : ''} need${errors === 1 ? 's' : ''} attention.`
      });
    }
  }

  // Warning: High usage
  if (usagePercent >= 90) {
    recs.push({
      level: 'critical',
      text: `${usagePercent}% of ${isZapier ? 'tasks' : 'operations'} used. Consider upgrading or optimizing.`
    });
  } else if (usagePercent >= 75) {
    recs.push({
      level: 'warning',
      text: `Approaching ${isZapier ? 'task' : 'operation'} limit. Review workflow efficiency.`
    });
  }

  // Info: General tips
  if (recs.length === 0) {
    recs.push({
      level: 'info',
      text: 'Your integrations are healthy! Consider consolidating similar workflows.'
    });
  }

  // Migration suggestion for high spenders
  if (usagePercent >= 50) {
    recs.push({
      level: 'info',
      text: 'Pro tip: n8n self-hosted has no operation limits. Migrate to save 50%+'
    });
  }

  return recs;
}
