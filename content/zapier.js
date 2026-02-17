/**
 * FlowFix Content Script for Zapier Dashboard
 * Extracts workflow health metrics from the DOM
 *
 * Strategy: Zapier is a React SPA. Selectors target multiple patterns:
 * 1. data-testid attributes (Zapier's testing hooks)
 * 2. aria-label attributes (accessibility layer, more stable)
 * 3. Semantic HTML structure (headings, lists, tables)
 * 4. Text content matching (last resort, most resilient)
 */

(function() {
  'use strict';

  const FLOWFIX_VERSION = '1.1.0';
  const DEBUG = false;

  function log(...args) {
    if (DEBUG) console.log('[FlowFix:Zapier]', ...args);
  }

  // --- Selector Utilities ---

  /**
   * Query using multiple selector strategies, return first match
   */
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

  /**
   * Query all using multiple selector strategies, return first non-empty result
   */
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

  /**
   * Find element by text content within a container
   */
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

  /**
   * Find numeric value near a label element
   */
  function findValueNearLabel(labelText) {
    const label = findByText(null, labelText);
    if (!label) return null;
    // Check siblings, parent's children, and nearby elements
    const parent = label.closest('div, section, li, tr, td') || label.parentElement;
    if (!parent) return null;
    const text = parent.textContent;
    const nums = text.replace(/,/g, '').match(/[\d,]+/g);
    if (nums && nums.length > 0) {
      // Return the largest number found (likely the actual value, not a label number)
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

  // --- Zapier-specific extraction ---

  function extractTaskUsage() {
    // Strategy 1: data-testid
    let el = queryFirst(
      '[data-testid="task-usage"]',
      '[data-testid="task-count"]',
      '[data-testid="tasks-used"]'
    );
    if (el) return extractNumber(getText(el));

    // Strategy 2: aria-label
    el = queryFirst(
      '[aria-label*="task" i][aria-label*="usage" i]',
      '[aria-label*="tasks used" i]'
    );
    if (el) return extractNumber(getText(el));

    // Strategy 3: Text matching near known labels
    const val = findValueNearLabel('tasks used');
    if (val !== null) return val;

    // Strategy 4: Look for progress bars or usage displays
    el = queryFirst(
      '.usage-bar [role="progressbar"]',
      '[role="progressbar"][aria-label*="task" i]'
    );
    if (el) {
      const ariaVal = el.getAttribute('aria-valuenow');
      if (ariaVal) return parseFloat(ariaVal);
    }

    return null;
  }

  function extractTaskLimit() {
    let el = queryFirst(
      '[data-testid="task-limit"]',
      '[data-testid="tasks-limit"]',
      '[data-testid="task-quota"]'
    );
    if (el) return extractNumber(getText(el));

    el = queryFirst(
      '[aria-label*="task" i][aria-label*="limit" i]',
      '[aria-label*="task quota" i]'
    );
    if (el) return extractNumber(getText(el));

    // Look for "X of Y" pattern near task usage
    const usageArea = findByText(null, 'tasks');
    if (usageArea) {
      const parent = usageArea.closest('div, section') || usageArea.parentElement;
      if (parent) {
        const ofMatch = parent.textContent.replace(/,/g, '').match(/(\d+)\s*(?:of|\/)\s*(\d+)/);
        if (ofMatch) return parseInt(ofMatch[2], 10);
      }
    }

    const val = findValueNearLabel('task limit');
    if (val !== null) return val;

    // Check progressbar max
    const bar = queryFirst('[role="progressbar"][aria-label*="task" i]');
    if (bar) {
      const max = bar.getAttribute('aria-valuemax');
      if (max) return parseFloat(max);
    }

    return null;
  }

  function extractZapList() {
    // Strategy 1: data-testid
    let items = queryAllFirst(
      '[data-testid="zap-row"]',
      '[data-testid="zap-list-item"]',
      '[data-testid="zap-card"]',
      '[data-testid*="zap-item"]'
    );
    if (items.length > 0) return items;

    // Strategy 2: aria/role-based
    items = queryAllFirst(
      'table[aria-label*="zap" i] tbody tr',
      '[role="list"][aria-label*="zap" i] [role="listitem"]',
      '[role="listitem"][aria-label*="zap" i]'
    );
    if (items.length > 0) return items;

    // Strategy 3: Structural — look for repeated structures that look like zap rows
    // Zapier typically shows zaps in a table or card list
    items = queryAllFirst(
      'main table tbody tr',
      'main [role="list"] > div',
      '[class*="ZapRow"]',
      '[class*="zap-row"]',
      '[class*="zapRow"]'
    );
    if (items.length > 0) return items;

    return [];
  }

  function countZapsByStatus(status) {
    // status: 'on', 'off', 'error'
    const statusMap = {
      on: ['on', 'active', 'running', 'enabled'],
      off: ['off', 'paused', 'disabled', 'inactive', 'stopped'],
      error: ['error', 'failed', 'broken', 'needs attention']
    };
    const terms = statusMap[status] || [status];

    // Strategy 1: data-testid with status
    for (const term of terms) {
      const els = queryAllFirst(
        `[data-testid="zap-status-${term}"]`,
        `[data-status="${term}"]`,
        `[aria-label*="${term}" i][role="status"]`
      );
      if (els.length > 0) return els.length;
    }

    // Strategy 2: Count by text content in status badges
    let count = 0;
    const statusEls = queryAllFirst(
      '[data-testid*="status"]',
      '[class*="status"]',
      '[class*="Status"]',
      '[role="status"]'
    );
    for (const el of statusEls) {
      const text = el.textContent.toLowerCase().trim();
      if (terms.some(t => text.includes(t))) count++;
    }
    if (count > 0) return count;

    // Strategy 3: Look for colored indicators
    if (status === 'error') {
      const errorIcons = queryAllFirst(
        '[class*="error"]',
        '[class*="Error"]',
        '.text-red-500',
        '.text-danger',
        'svg[fill="red"]'
      );
      // Filter to only those that seem to be zap status indicators
      return Array.from(errorIcons).filter(el => {
        const parent = el.closest('tr, [role="listitem"], [data-testid*="zap"]');
        return parent !== null;
      }).length;
    }

    return 0;
  }

  function extractPlanName() {
    let el = queryFirst(
      '[data-testid="current-plan"]',
      '[data-testid="plan-name"]',
      '[data-testid="plan-badge"]',
      '[aria-label*="plan" i]'
    );
    if (el) return getText(el);

    // Text search near "Plan" label
    el = findByText(null, 'plan');
    if (el) {
      const parent = el.closest('div, section, a');
      if (parent) {
        const text = parent.textContent.trim();
        // Common plan names
        const plans = ['Free', 'Starter', 'Professional', 'Team', 'Company', 'Enterprise'];
        for (const plan of plans) {
          if (text.includes(plan)) return plan;
        }
      }
    }

    return null;
  }

  // --- Main extraction ---

  function extractZapierMetrics() {
    const zapList = extractZapList();
    const totalZaps = zapList.length || extractNumber(getText(queryFirst(
      '[data-testid="zap-count"]',
      '[aria-label*="total zaps" i]'
    )));

    const tasksUsed = extractTaskUsage();
    const taskLimit = extractTaskLimit();
    const errorZaps = countZapsByStatus('error');
    const pausedZaps = countZapsByStatus('off');

    const metrics = {
      version: FLOWFIX_VERSION,
      timestamp: new Date().toISOString(),
      platform: 'zapier',
      url: window.location.href,
      tasksUsed,
      taskLimit,
      totalZaps: totalZaps || 0,
      errorZaps,
      pausedZaps,
      planName: extractPlanName(),
      taskUsagePercent: null,
      errorRate: null,
      healthScore: null
    };

    if (metrics.tasksUsed && metrics.taskLimit) {
      metrics.taskUsagePercent = Math.round((metrics.tasksUsed / metrics.taskLimit) * 100);
    }

    if (metrics.totalZaps > 0) {
      metrics.errorRate = Math.round((metrics.errorZaps / metrics.totalZaps) * 100);
    }

    metrics.healthScore = calculateHealthScore(metrics);

    return metrics;
  }

  function calculateHealthScore(metrics) {
    let score = 100;

    if (metrics.taskUsagePercent) {
      if (metrics.taskUsagePercent > 90) score -= 30;
      else if (metrics.taskUsagePercent > 75) score -= 15;
      else if (metrics.taskUsagePercent > 50) score -= 5;
    }

    if (metrics.errorRate) {
      score -= Math.min(metrics.errorRate * 2, 40);
    }

    if (metrics.pausedZaps > 0 && metrics.totalZaps > 0) {
      const pausedRate = (metrics.pausedZaps / metrics.totalZaps) * 100;
      score -= Math.min(pausedRate, 20);
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

    // Outer container
    const container = document.createElement('div');
    container.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:20px', 'z-index:2147483647',
      'background:#1a1a2e', `border:1px solid ${color}`, 'border-radius:12px',
      'padding:12px 16px', 'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
      'box-shadow:0 4px 20px rgba(0,0,0,0.3)', 'cursor:pointer',
      'transition:transform 0.2s,box-shadow 0.2s', 'display:flex', 'align-items:center',
      'gap:10px'
    ].join(';');

    // Score ring
    const ring = document.createElement('div');
    ring.style.cssText = [
      'width:40px', 'height:40px', 'border-radius:50%',
      `background:${color}20`, `border:2px solid ${color}`,
      'display:flex', 'align-items:center', 'justify-content:center',
      'font-size:14px', 'font-weight:bold', `color:${color}`
    ].join(';');
    ring.textContent = String(metrics.healthScore);

    // Label block
    const labelBlock = document.createElement('div');

    const title = document.createElement('div');
    title.style.cssText = 'color:white;font-size:12px;font-weight:600';
    title.textContent = 'FlowFix Health';

    const sub = document.createElement('div');
    sub.style.cssText = 'color:#888;font-size:11px';
    sub.textContent = `${metrics.totalZaps || 0} zaps \u00b7 ${metrics.errorZaps || 0} errors`;

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
    log('Content script loaded on Zapier');

    let attempts = 0;
    const maxAttempts = 30;

    function tryExtract() {
      attempts++;
      const metrics = extractZapierMetrics();

      // Consider extraction successful if we found zaps or task data
      const hasData = metrics.totalZaps > 0 || metrics.tasksUsed !== null;

      if (hasData || attempts >= maxAttempts) {
        if (hasData) {
          log('Extracted metrics:', metrics);
          chrome.storage.local.set({ zapierMetrics: metrics });
          injectHealthBadge(metrics);
          chrome.runtime.sendMessage({ type: 'METRICS_EXTRACTED', metrics });
        } else {
          log('Could not extract metrics after', maxAttempts, 'attempts');
          // Still send what we have so the popup can show a "no data" state
          chrome.runtime.sendMessage({ type: 'METRICS_EXTRACTION_FAILED', url: window.location.href });
        }
        return true;
      }
      return false;
    }

    // Try immediately
    if (tryExtract()) return;

    // Poll with increasing intervals
    let pollDelay = 500;
    function poll() {
      if (tryExtract()) return;
      pollDelay = Math.min(pollDelay * 1.5, 3000);
      setTimeout(poll, pollDelay);
    }
    setTimeout(poll, pollDelay);

    // Also watch for SPA navigation (React router changes)
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
