/**
 * FlowFix Content Script for Make.com Dashboard
 * Extracts workflow health metrics from the DOM
 *
 * Strategy: Make.com is a React SPA. Selectors target multiple patterns:
 * 1. data-testid attributes
 * 2. aria-label attributes (accessibility layer, more stable)
 * 3. Semantic HTML structure
 * 4. Text content matching (last resort, most resilient)
 */

(function() {
  'use strict';

  const FLOWFIX_VERSION = '1.1.0';
  const DEBUG = false;

  function log(...args) {
    if (DEBUG) console.log('[FlowFix:Make]', ...args);
  }

  // --- Selector Utilities ---

  function queryFirst(...selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          log('Matched:', sel);
          return el;
        }
      } catch (e) { /* invalid selector, skip */ }
    }
    return null;
  }

  function queryAllFirst(...selectors) {
    for (const sel of selectors) {
      try {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          log('Matched all:', sel, 'count:', els.length);
          return els;
        }
      } catch (e) { /* invalid selector, skip */ }
    }
    return [];
  }

  function findByText(containerSelector, text, exact = false) {
    const container = containerSelector ? document.querySelector(containerSelector) : document.body;
    if (!container) return null;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const match = exact
        ? node.textContent.trim() === text
        : node.textContent.toLowerCase().includes(text.toLowerCase());
      if (match) return node.parentElement;
    }
    return null;
  }

  function findValueNearLabel(labelText) {
    const label = findByText(null, labelText);
    if (!label) return null;
    const parent = label.closest('div, section, li, tr, td') || label.parentElement;
    if (!parent) return null;
    const text = parent.textContent;
    const nums = text.replace(/,/g, '').match(/[\d,]+/g);
    if (nums && nums.length > 0) {
      return Math.max(...nums.map(n => parseInt(n.replace(/,/g, ''), 10)));
    }
    return null;
  }

  function extractNumber(text) {
    if (!text) return null;
    const cleaned = text.replace(/,/g, '').replace(/\s/g, '');
    const match = cleaned.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  }

  function getText(el) {
    if (!el) return null;
    return el.textContent.trim();
  }

  // --- Make.com-specific extraction ---

  function extractOperationsUsed() {
    let el = queryFirst(
      '[data-testid="operations-used"]',
      '[data-testid="ops-used"]',
      '[data-testid="operations-count"]'
    );
    if (el) return extractNumber(getText(el));

    el = queryFirst(
      '[aria-label*="operation" i][aria-label*="used" i]',
      '[aria-label*="operations used" i]'
    );
    if (el) return extractNumber(getText(el));

    const val = findValueNearLabel('operations');
    if (val !== null) return val;

    // Check progressbar
    el = queryFirst('[role="progressbar"][aria-label*="operation" i]');
    if (el) {
      const ariaVal = el.getAttribute('aria-valuenow');
      if (ariaVal) return parseFloat(ariaVal);
    }

    return null;
  }

  function extractOperationsLimit() {
    let el = queryFirst(
      '[data-testid="operations-limit"]',
      '[data-testid="ops-limit"]',
      '[data-testid="operations-quota"]'
    );
    if (el) return extractNumber(getText(el));

    el = queryFirst(
      '[aria-label*="operation" i][aria-label*="limit" i]',
      '[aria-label*="operations limit" i]'
    );
    if (el) return extractNumber(getText(el));

    // Look for "X / Y" or "X of Y" pattern
    const opsArea = findByText(null, 'operations');
    if (opsArea) {
      const parent = opsArea.closest('div, section') || opsArea.parentElement;
      if (parent) {
        const ofMatch = parent.textContent.replace(/,/g, '').match(/(\d+)\s*(?:of|\/)\s*(\d+)/);
        if (ofMatch) return parseInt(ofMatch[2], 10);
      }
    }

    const val = findValueNearLabel('operations limit');
    if (val !== null) return val;

    // Check progressbar max
    const bar = queryFirst('[role="progressbar"][aria-label*="operation" i]');
    if (bar) {
      const max = bar.getAttribute('aria-valuemax');
      if (max) return parseFloat(max);
    }

    return null;
  }

  function extractScenarioList() {
    // Strategy 1: data-testid
    let items = queryAllFirst(
      '[data-testid="scenario-row"]',
      '[data-testid="scenario-item"]',
      '[data-testid="scenario-card"]',
      '[data-testid*="scenario-list"] > *'
    );
    if (items.length > 0) return items;

    // Strategy 2: aria/role-based
    items = queryAllFirst(
      'table[aria-label*="scenario" i] tbody tr',
      '[role="list"][aria-label*="scenario" i] [role="listitem"]',
      '[role="listitem"][aria-label*="scenario" i]'
    );
    if (items.length > 0) return items;

    // Strategy 3: Structural patterns
    items = queryAllFirst(
      '[class*="ScenarioRow"]',
      '[class*="scenario-row"]',
      '[class*="scenarioRow"]',
      '[class*="ScenarioCard"]',
      'main table tbody tr',
      'main [role="list"] > div'
    );
    if (items.length > 0) return items;

    return [];
  }

  function countScenariosByStatus(status) {
    const statusMap = {
      active: ['active', 'on', 'running', 'enabled', 'scheduling'],
      error: ['error', 'failed', 'broken', 'warning'],
      inactive: ['inactive', 'off', 'disabled', 'stopped', 'paused']
    };
    const terms = statusMap[status] || [status];

    // Strategy 1: data-testid / data-status
    for (const term of terms) {
      const els = queryAllFirst(
        `[data-testid="scenario-status-${term}"]`,
        `[data-status="${term}"]`,
        `[aria-label*="${term}" i][role="status"]`
      );
      if (els.length > 0) return els.length;
    }

    // Strategy 2: Text content matching on status elements
    let count = 0;
    const statusEls = queryAllFirst(
      '[data-testid*="status"]',
      '[class*="status"]',
      '[class*="Status"]',
      '[role="status"]',
      '.imt-toggle',
      '[class*="toggle"]'
    );
    for (const el of statusEls) {
      const text = el.textContent.toLowerCase().trim();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const combined = text + ' ' + ariaLabel;
      if (terms.some(t => combined.includes(t))) count++;
    }
    if (count > 0) return count;

    // Strategy 3: Toggle state for active/inactive
    if (status === 'active') {
      const toggles = queryAllFirst(
        '[role="switch"][aria-checked="true"]',
        'input[type="checkbox"]:checked'
      );
      return toggles.length;
    }
    if (status === 'inactive') {
      const toggles = queryAllFirst(
        '[role="switch"][aria-checked="false"]',
        'input[type="checkbox"]:not(:checked)'
      );
      return toggles.length;
    }

    return 0;
  }

  function extractPlanName() {
    let el = queryFirst(
      '[data-testid="plan-name"]',
      '[data-testid="current-plan"]',
      '[data-testid="plan-badge"]',
      '[aria-label*="plan" i]'
    );
    if (el) return getText(el);

    el = findByText(null, 'plan');
    if (el) {
      const parent = el.closest('div, section, a, span');
      if (parent) {
        const text = parent.textContent.trim();
        const plans = ['Free', 'Core', 'Pro', 'Teams', 'Enterprise'];
        for (const plan of plans) {
          if (text.includes(plan)) return plan;
        }
      }
    }

    return null;
  }

  function extractTeamName() {
    let el = queryFirst(
      '[data-testid="team-name"]',
      '[data-testid="organization-name"]',
      '[aria-label*="team" i]',
      '[aria-label*="organization" i]'
    );
    if (el) return getText(el);
    return null;
  }

  // --- Main extraction ---

  function extractMakeMetrics() {
    const scenarioList = extractScenarioList();
    const totalScenarios = scenarioList.length || extractNumber(getText(queryFirst(
      '[data-testid="scenario-count"]',
      '[aria-label*="total scenarios" i]'
    )));

    const operationsUsed = extractOperationsUsed();
    const operationsLimit = extractOperationsLimit();
    const activeScenarios = countScenariosByStatus('active');
    const errorScenarios = countScenariosByStatus('error');
    const inactiveScenarios = countScenariosByStatus('inactive');

    const metrics = {
      version: FLOWFIX_VERSION,
      timestamp: new Date().toISOString(),
      platform: 'make',
      url: window.location.href,
      operationsUsed,
      operationsLimit,
      totalScenarios: totalScenarios || 0,
      activeScenarios,
      errorScenarios,
      inactiveScenarios,
      planName: extractPlanName(),
      teamName: extractTeamName(),
      operationsUsagePercent: null,
      errorRate: null,
      healthScore: null
    };

    if (metrics.operationsUsed && metrics.operationsLimit) {
      metrics.operationsUsagePercent = Math.round((metrics.operationsUsed / metrics.operationsLimit) * 100);
    }

    if (metrics.totalScenarios > 0) {
      metrics.errorRate = Math.round((metrics.errorScenarios / metrics.totalScenarios) * 100);
    }

    metrics.healthScore = calculateHealthScore(metrics);

    return metrics;
  }

  function calculateHealthScore(metrics) {
    let score = 100;

    if (metrics.operationsUsagePercent) {
      if (metrics.operationsUsagePercent > 90) score -= 30;
      else if (metrics.operationsUsagePercent > 75) score -= 15;
      else if (metrics.operationsUsagePercent > 50) score -= 5;
    }

    if (metrics.errorRate) {
      score -= Math.min(metrics.errorRate * 2, 40);
    }

    if (metrics.inactiveScenarios > 0 && metrics.totalScenarios > 0) {
      const inactiveRate = (metrics.inactiveScenarios / metrics.totalScenarios) * 100;
      score -= Math.min(inactiveRate / 2, 15);
    }

    return Math.max(0, Math.round(score));
  }

  function getScoreColor(score) {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }

  function injectHealthBadge(metrics) {
    const existing = document.getElementById('flowfix-badge-host');
    if (existing) existing.remove();

    const color = getScoreColor(metrics.healthScore);
    const host = document.createElement('div');
    host.id = 'flowfix-badge-host';
    const shadow = host.attachShadow({ mode: 'closed' });

    const container = document.createElement('div');
    container.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:20px', 'z-index:2147483647',
      'background:#1a1a2e', `border:1px solid ${color}`, 'border-radius:12px',
      'padding:12px 16px', 'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
      'box-shadow:0 4px 20px rgba(0,0,0,0.3)', 'cursor:pointer',
      'transition:transform 0.2s,box-shadow 0.2s', 'display:flex', 'align-items:center',
      'gap:10px'
    ].join(';');

    const ring = document.createElement('div');
    ring.style.cssText = [
      'width:40px', 'height:40px', 'border-radius:50%',
      `background:${color}20`, `border:2px solid ${color}`,
      'display:flex', 'align-items:center', 'justify-content:center',
      'font-size:14px', 'font-weight:bold', `color:${color}`
    ].join(';');
    ring.textContent = String(metrics.healthScore);

    const labelBlock = document.createElement('div');

    const title = document.createElement('div');
    title.style.cssText = 'color:white;font-size:12px;font-weight:600';
    title.textContent = 'FlowFix Health';

    const sub = document.createElement('div');
    sub.style.cssText = 'color:#888;font-size:11px';
    sub.textContent = `${metrics.totalScenarios || 0} scenarios \u00b7 ${metrics.errorScenarios || 0} errors`;

    labelBlock.appendChild(title);
    labelBlock.appendChild(sub);
    container.appendChild(ring);
    container.appendChild(labelBlock);
    shadow.appendChild(container);
    document.body.appendChild(host);

    container.addEventListener('mouseenter', () => {
      container.style.transform = 'scale(1.05)';
    });
    container.addEventListener('mouseleave', () => {
      container.style.transform = 'scale(1)';
    });
    container.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP', metrics });
    });
  }

  // --- Initialization with MutationObserver ---

  function init() {
    log('Content script loaded on Make.com');

    let attempts = 0;
    const maxAttempts = 30;

    function tryExtract() {
      attempts++;
      const metrics = extractMakeMetrics();

      const hasData = metrics.totalScenarios > 0 || metrics.operationsUsed !== null;

      if (hasData || attempts >= maxAttempts) {
        if (hasData) {
          log('Extracted metrics:', metrics);
          chrome.storage.local.set({ makeMetrics: metrics });
          injectHealthBadge(metrics);
          chrome.runtime.sendMessage({ type: 'METRICS_EXTRACTED', metrics });
        } else {
          log('Could not extract metrics after', maxAttempts, 'attempts');
          chrome.runtime.sendMessage({ type: 'METRICS_EXTRACTION_FAILED', url: window.location.href });
        }
        return true;
      }
      return false;
    }

    if (tryExtract()) return;

    let pollDelay = 500;
    function poll() {
      if (tryExtract()) return;
      pollDelay = Math.min(pollDelay * 1.5, 3000);
      setTimeout(poll, pollDelay);
    }
    setTimeout(poll, pollDelay);

    // Watch for SPA navigation
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        log('SPA navigation detected, re-extracting');
        attempts = 0;
        setTimeout(poll, 1000);
      }
    });
    urlObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
