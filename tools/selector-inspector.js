/**
 * FlowFix Selector Inspector — Development Tool
 *
 * Purpose: Extract working DOM selectors from live Zapier/Make pages
 * Usage: Inject into browser console on authenticated Zapier/Make dashboard pages
 *
 * How to use:
 * 1. Open Zapier dashboard (https://zapier.com/app/dashboard or /app/home)
 * 2. Open DevTools (F12)
 * 3. Paste this entire script into the console
 * 4. Call window.flowfixInspect() to run analysis
 * 5. Copy console output and paste into selector-audit.md
 */

(function() {
  'use strict';

  window.flowfixInspect = function() {
    const site = detectSite();
    console.log(`\n=== FlowFix Selector Inspector ===`);
    console.log(`Site: ${site}`);
    console.log(`URL: ${window.location.href}`);
    console.log(`Time: ${new Date().toISOString()}\n`);

    const metrics = {
      site,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      findings: {}
    };

    if (site === 'zapier') {
      metrics.findings = inspectZapier();
    } else if (site === 'make') {
      metrics.findings = inspectMake();
    } else {
      console.log('Unknown site. Expected zapier.com or make.com');
      return metrics;
    }

    console.log('\n=== Summary ===');
    Object.entries(metrics.findings).forEach(([key, val]) => {
      const status = val.match ? '✅' : '❌';
      console.log(`${status} ${key}: ${JSON.stringify(val)}`);
    });

    return metrics;
  };

  function detectSite() {
    const host = window.location.hostname;
    if (host.includes('zapier')) return 'zapier';
    if (host.includes('make')) return 'make';
    return 'unknown';
  }

  // ===== ZAPIER INSPECTION =====

  function inspectZapier() {
    const findings = {};

    // Task Usage & Limit
    findings['tasks_used'] = findTaskUsage();
    findings['tasks_limit'] = findTaskLimit();

    // Zap Status
    findings['zaps_total'] = findZapsTotal();
    findings['zaps_active'] = findZapsActive();
    findings['zaps_error'] = findZapsWithErrors();

    // Team Info
    findings['team_name'] = findTeamName();
    findings['plan_name'] = findPlanName();

    return findings;
  }

  function findTaskUsage() {
    const candidates = [
      { sel: '[data-testid="task-usage"]', name: 'data-testid=task-usage' },
      { sel: '[data-testid*="usage"]', name: 'data-testid contains usage' },
      { sel: '[aria-label*="task" i][aria-label*="used" i]', name: 'aria-label task+used' },
      { sel: '.task-usage', name: '.task-usage class' },
      { sel: '[class*="Usage"][class*="Task"]', name: 'class*=Usage|Task' }
    ];

    for (const cand of candidates) {
      try {
        const el = document.querySelector(cand.sel);
        if (el) {
          const text = el.textContent.trim();
          const num = extractNum(text);
          console.log(`  ✅ ${cand.name}: "${text}" → ${num}`);
          return { selector: cand.sel, text, value: num, status: 'found' };
        }
      } catch (e) {}
    }

    // Fallback: search by text "tasks used"
    const byText = findByTextContent('tasks used');
    if (byText.length > 0) {
      console.log(`  ℹ️  Found by text "tasks used": ${byText.map(e => e.textContent).join(' | ')}`);
      return { byText, status: 'found_by_text' };
    }

    console.log(`  ❌ Could not find task usage`);
    return { status: 'not_found' };
  }

  function findTaskLimit() {
    const candidates = [
      { sel: '[data-testid*="limit"]', name: 'data-testid contains limit' },
      { sel: '[data-testid*="quota"]', name: 'data-testid contains quota' },
      { sel: '[aria-label*="limit" i]', name: 'aria-label contains limit' },
      { sel: '.task-limit', name: '.task-limit class' }
    ];

    for (const cand of candidates) {
      try {
        const el = document.querySelector(cand.sel);
        if (el) {
          const text = el.textContent.trim();
          const num = extractNum(text);
          console.log(`  ✅ ${cand.name}: "${text}" → ${num}`);
          return { selector: cand.sel, text, value: num, status: 'found' };
        }
      } catch (e) {}
    }

    // Try "X of Y" pattern
    const pattern = document.body.textContent.match(/(\d+)\s+(?:of|\/)\s+(\d+)/);
    if (pattern) {
      console.log(`  ℹ️  Found "X of Y" pattern: ${pattern[0]}`);
      return { pattern: pattern[0], used: pattern[1], limit: pattern[2], status: 'found_pattern' };
    }

    console.log(`  ❌ Could not find task limit`);
    return { status: 'not_found' };
  }

  function findZapsTotal() {
    const candidates = [
      { sel: '[data-testid*="zap"][data-testid*="count"]', name: 'zap+count testid' },
      { sel: '[aria-label*="zap" i]', name: 'aria-label zap' },
      { sel: '[class*="Zap"][class*="Count"]', name: 'Zap+Count class' }
    ];

    for (const cand of candidates) {
      try {
        const els = document.querySelectorAll(cand.sel);
        if (els.length > 0) {
          console.log(`  ✅ ${cand.name}: found ${els.length} elements`);
          return { selector: cand.sel, count: els.length, status: 'found' };
        }
      } catch (e) {}
    }

    console.log(`  ❌ Could not find zaps total`);
    return { status: 'not_found' };
  }

  function findZapsActive() {
    const text = document.body.textContent;
    const match = text.match(/(\d+)\s+(?:active|enabled|on)\s+zaps?/i);
    if (match) {
      console.log(`  ✅ Found by text: "${match[0]}" → ${match[1]}`);
      return { text: match[0], value: match[1], status: 'found_text' };
    }
    console.log(`  ❌ Could not find active zaps`);
    return { status: 'not_found' };
  }

  function findZapsWithErrors() {
    const candidates = [
      { sel: '[data-status="error"]', name: 'data-status=error' },
      { sel: '[aria-label*="error" i]', name: 'aria-label error' },
      { sel: '[class*="Error"]', name: 'class*=Error' },
      { sel: '.text-red-500', name: '.text-red-500' }
    ];

    for (const cand of candidates) {
      try {
        const els = document.querySelectorAll(cand.sel);
        if (els.length > 0) {
          console.log(`  ✅ ${cand.name}: found ${els.length} elements`);
          return { selector: cand.sel, count: els.length, status: 'found' };
        }
      } catch (e) {}
    }

    console.log(`  ❌ Could not find error zaps`);
    return { status: 'not_found' };
  }

  function findTeamName() {
    const candidates = [
      { sel: '[data-testid*="team"]', name: 'data-testid team' },
      { sel: '[aria-label*="team" i]', name: 'aria-label team' },
      { sel: '.team-name', name: '.team-name' }
    ];

    for (const cand of candidates) {
      try {
        const el = document.querySelector(cand.sel);
        if (el && el.textContent.trim()) {
          const text = el.textContent.trim();
          console.log(`  ✅ ${cand.name}: "${text}"`);
          return { selector: cand.sel, text, status: 'found' };
        }
      } catch (e) {}
    }

    console.log(`  ⚠️  Could not find team name`);
    return { status: 'not_found' };
  }

  function findPlanName() {
    const text = document.body.textContent;
    const match = text.match(/(Free|Starter|Professional|Team|Premium|Enterprise)/i);
    if (match) {
      console.log(`  ✅ Found plan by text: "${match[0]}"`);
      return { text: match[0], status: 'found_text' };
    }
    console.log(`  ⚠️  Could not find plan name`);
    return { status: 'not_found' };
  }

  // ===== MAKE.COM INSPECTION =====

  function inspectMake() {
    const findings = {};

    findings['operations_used'] = findOperationsUsed();
    findings['operations_limit'] = findOperationsLimit();
    findings['scenarios_total'] = findScenariosTotal();
    findings['scenarios_active'] = findScenariosActive();
    findings['scenarios_error'] = findScenariosError();
    findings['team_name'] = findMakeTeamName();
    findings['plan_name'] = findMakePlanName();

    return findings;
  }

  function findOperationsUsed() {
    const candidates = [
      { sel: '[data-testid*="operations"][data-testid*="used"]', name: 'operations+used testid' },
      { sel: '[aria-label*="operations used" i]', name: 'aria-label operations used' },
      { sel: '.operations-used', name: '.operations-used' }
    ];

    for (const cand of candidates) {
      try {
        const el = document.querySelector(cand.sel);
        if (el) {
          const text = el.textContent.trim();
          const num = extractNum(text);
          console.log(`  ✅ ${cand.name}: "${text}" → ${num}`);
          return { selector: cand.sel, text, value: num, status: 'found' };
        }
      } catch (e) {}
    }

    const byText = findByTextContent('operations used');
    if (byText.length > 0) {
      console.log(`  ℹ️  Found by text: ${byText.map(e => e.textContent).join(' | ')}`);
      return { byText, status: 'found_by_text' };
    }

    console.log(`  ❌ Could not find operations used`);
    return { status: 'not_found' };
  }

  function findOperationsLimit() {
    const candidates = [
      { sel: '[data-testid*="limit"]', name: 'data-testid limit' },
      { sel: '[aria-label*="limit" i]', name: 'aria-label limit' }
    ];

    for (const cand of candidates) {
      try {
        const el = document.querySelector(cand.sel);
        if (el) {
          const text = el.textContent.trim();
          const num = extractNum(text);
          console.log(`  ✅ ${cand.name}: "${text}" → ${num}`);
          return { selector: cand.sel, text, value: num, status: 'found' };
        }
      } catch (e) {}
    }

    console.log(`  ❌ Could not find operations limit`);
    return { status: 'not_found' };
  }

  function findScenariosTotal() {
    const candidates = [
      { sel: '[data-testid*="scenario"][data-testid*="count"]', name: 'scenario count testid' },
      { sel: '[aria-label*="scenario" i]', name: 'aria-label scenario' }
    ];

    for (const cand of candidates) {
      try {
        const els = document.querySelectorAll(cand.sel);
        if (els.length > 0) {
          console.log(`  ✅ ${cand.name}: found ${els.length}`);
          return { selector: cand.sel, count: els.length, status: 'found' };
        }
      } catch (e) {}
    }

    console.log(`  ❌ Could not find scenarios total`);
    return { status: 'not_found' };
  }

  function findScenariosActive() {
    const text = document.body.textContent;
    const match = text.match(/(\d+)\s+(?:active|enabled)\s+scenarios?/i);
    if (match) {
      console.log(`  ✅ Found by text: "${match[0]}" → ${match[1]}`);
      return { text: match[0], value: match[1], status: 'found_text' };
    }
    console.log(`  ❌ Could not find active scenarios`);
    return { status: 'not_found' };
  }

  function findScenariosError() {
    const candidates = [
      { sel: '[data-status="error"]', name: 'data-status error' },
      { sel: '[aria-label*="error" i]', name: 'aria-label error' }
    ];

    for (const cand of candidates) {
      try {
        const els = document.querySelectorAll(cand.sel);
        if (els.length > 0) {
          console.log(`  ✅ ${cand.name}: found ${els.length}`);
          return { selector: cand.sel, count: els.length, status: 'found' };
        }
      } catch (e) {}
    }

    console.log(`  ❌ Could not find error scenarios`);
    return { status: 'not_found' };
  }

  function findMakeTeamName() {
    const candidates = [
      { sel: '[data-testid*="team"]', name: 'data-testid team' },
      { sel: '[class*="TeamName"]', name: 'class*=TeamName' }
    ];

    for (const cand of candidates) {
      try {
        const el = document.querySelector(cand.sel);
        if (el && el.textContent.trim()) {
          console.log(`  ✅ ${cand.name}: "${el.textContent.trim()}"`);
          return { selector: cand.sel, text: el.textContent.trim(), status: 'found' };
        }
      } catch (e) {}
    }

    console.log(`  ⚠️  Could not find team name`);
    return { status: 'not_found' };
  }

  function findMakePlanName() {
    const text = document.body.textContent;
    const match = text.match(/(Free|Core|Pro|Team|Unlimited|Enterprise)/i);
    if (match) {
      console.log(`  ✅ Found plan by text: "${match[0]}"`);
      return { text: match[0], status: 'found_text' };
    }
    console.log(`  ⚠️  Could not find plan name`);
    return { status: 'not_found' };
  }

  // ===== UTILITIES =====

  function extractNum(text) {
    if (!text) return null;
    const cleaned = text.replace(/,/g, '').replace(/[^\d.]/g, '');
    return cleaned ? parseFloat(cleaned) : null;
  }

  function findByTextContent(phrase) {
    const results = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    while (walker.nextNode()) {
      if (walker.currentNode.textContent.toLowerCase().includes(phrase.toLowerCase())) {
        results.push(walker.currentNode.parentElement);
      }
    }
    return results;
  }
})();

// Export for copy-paste
console.log('✅ Inspector loaded. Run: window.flowfixInspect()');
