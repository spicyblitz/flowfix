# FlowFix DOM Selector Rebuild — Action Plan

**Status:** P0 Priority — Blocking Chrome Web Store submission
**Target Completion:** Today (Feb 16, 2026)
**Owner:** Griffin (live page testing) + Gloria (code implementation)

---

## Current State

| Item | Status |
|------|--------|
| Security Issues | ✅ RESOLVED (Feb 16, commit c24ee81) |
| DOM Selectors | 🔴 UNVALIDATED — Require live testing |
| Chrome Web Store Requirements | ⚠️ PARTIAL — Missing privacy policy |
| Extension Functionality | ⚠️ BROKEN — Selectors non-functional on live pages |

### What Was Fixed in c24ee81

- ✅ Replaced `innerHTML` with `createElement` / `textContent` (XSS vector)
- ✅ Injected badge now uses Shadow DOM (prevents page interference)
- ✅ Added `eu2.make.com` to host permissions
- ✅ Version bumped to 1.1.0

### What Still Needs Fixing

- 🔴 **DOM selectors** — All current selectors are speculative and untested
- ⚠️ **privacy-policy.html** — Required before CWS submission
- ⚠️ **Extension icon** — icons/ directory exists; verify they're production-ready
- ℹ️ **Version consistency** — manifest.json (1.1.0) ↔ content scripts (1.1.0) ✅

---

## What Was Built for Selector Validation

### 1. `tools/selector-inspector.js`

A browser console tool that discovers working DOM selectors on live pages.

**How it works:**
- Injects into browser console
- Searches for elements using multiple selector strategies
- Returns working selectors and extracted values
- Documents both successful and failed extractions

**How to use it:**
1. Open Zapier or Make.com authenticated dashboard
2. Open DevTools (F12)
3. Copy entire `/tools/selector-inspector.js` into console
4. Run: `window.flowfixInspect()`
5. Review console output for working selectors
6. Copy results

### 2. `docs/SELECTOR-VALIDATION.md`

Complete guide for validating and updating selectors.

**Includes:**
- Quick start instructions
- What to look for on each site
- Selector priority rules
- Debugging checklist
- When to escalate issues

### 3. `tests/selector-validation.test.js`

Test harness for documenting and validating selectors.

**Purpose:**
- Provides template structure for adding found selectors
- Makes validation repeatable and versionable
- Documents working selectors for future updates

---

## Step-by-Step Action Plan

### Phase 1: Extract Working Selectors (Griffin → Gloria)

**Estimated time:** 10-15 minutes per site

#### For Zapier:
1. Go to https://zapier.com/app/home (must be authenticated)
2. Open DevTools (Cmd+Option+I on Mac, F12 on Windows)
3. Go to Console tab
4. Open file: `/Users/gloria/eigen/flowfix/tools/selector-inspector.js`
5. Copy all content
6. Paste into browser console
7. Press Enter
8. In console, run: `window.flowfixInspect()`
9. **Screenshot or copy console output**
10. Share results with Gloria

**Expected output example:**
```
✅ tasks_used: {"selector":"[data-testid=...]","value":1234,"status":"found"}
✅ tasks_limit: {"selector":"...","value":10000,"status":"found"}
✅ zaps_total: {"selector":"...","count":15,"status":"found"}
✅ zaps_active: {"text":"12 active zaps","value":12,"status":"found_text"}
✅ zaps_error: {"selector":"...","count":1,"status":"found"}
```

#### For Make.com:
1. Go to https://make.com (or any authenticated regional URL: us1.make.com, eu1.make.com)
2. Repeat steps 2-9 above
3. Share results

**Note:** Make may require specific region. If selectors fail, try:
- https://make.com
- https://us1.make.com
- https://eu1.make.com
- https://eu2.make.com

---

### Phase 2: Update Content Scripts (Gloria → Griffin)

Once Griffin provides working selectors:

1. **Update `/content/zapier.js`:**
   - Find function: `extractTaskUsage()`
   - Replace selector arrays with working selectors from inspector
   - Add comment with date and source
   - Test in extension

2. **Update `/content/make.js`:**
   - Same process for Make.com selectors
   - Functions: `findOperationsUsed()`, `findScenariosActive()`, etc.

3. **Load unpacked extension:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `/Users/gloria/eigen/flowfix/`

4. **Test on live pages:**
   - Go to Zapier/Make dashboard
   - Badge should appear with correct metrics
   - Click badge to see popup with health score
   - Check console for any errors

---

### Phase 3: Create privacy-policy.html (Gloria)

Required for Chrome Web Store:

1. Create `/privacy-policy.html`
2. Include standard privacy policy language (see template below)
3. Mention that extension:
   - Reads DOM elements from Zapier/Make dashboards
   - Stores metrics locally in chrome.storage
   - Does NOT send data to external servers
   - Does NOT collect user data

**Minimal template:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>FlowFix Privacy Policy</title>
  <style>body { font-family: Arial; max-width: 800px; margin: 40px auto; }</style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p>FlowFix respects your privacy.</p>

  <h2>Data Collection</h2>
  <p>FlowFix does NOT collect or send personal data to external servers. All data stays on your device.</p>

  <h2>Local Storage</h2>
  <p>The extension stores the following locally in your browser:</p>
  <ul>
    <li>Zapier workflow metrics (health score, zap counts, error counts)</li>
    <li>Make.com scenario metrics (operations used, scenario counts)</li>
    <li>Timestamp of last dashboard check</li>
  </ul>

  <h2>Permissions</h2>
  <p>FlowFix requests only necessary permissions:</p>
  <ul>
    <li><code>activeTab</code> — To analyze your current dashboard</li>
    <li><code>storage</code> — To save metrics locally</li>
  </ul>

  <h2>Network Activity</h2>
  <p>FlowFix makes NO network requests. All analysis is performed locally.</p>

  <p><strong>Last Updated:</strong> Feb 16, 2026</p>
</body>
</html>
```

---

### Phase 4: Final Review & Submission (Both)

Before Chrome Web Store submission:

- [ ] All selectors tested on live authenticated pages
- [ ] Badge appears correctly on Zapier/Make dashboards
- [ ] Metrics display accurate health score
- [ ] No console errors
- [ ] privacy-policy.html created and accessible
- [ ] Version numbers consistent (manifest.json + content scripts)
- [ ] Icons verified (16x16, 48x48, 128x128)
- [ ] Commit with message: `feat: finalize selector validation for CWS submission`

---

## Tools Created

| File | Purpose | Status |
|------|---------|--------|
| `tools/selector-inspector.js` | Browser console tool to find working selectors | ✅ Ready to use |
| `docs/SELECTOR-VALIDATION.md` | Complete validation guide | ✅ Ready to use |
| `tests/selector-validation.test.js` | Test harness for documenting selectors | ✅ Ready to use |
| `docs/FLOWFIX-ACTION-PLAN.md` | This document | ✅ Ready |
| `privacy-policy.html` | CWS requirement | ⏳ Needs creation |

---

## Current Manifest

**Version:** 1.1.0 (released as commit c24ee81)
**Host Permissions:** Updated to include eu2.make.com
**Content Scripts:** Using Shadow DOM for badge injection, no innerHTML vulnerabilities

---

## Blockers & Risks

| Blocker | Severity | Resolution |
|---------|----------|-----------|
| Cannot test selectors on authenticated Zapier/Make pages | HIGH | Griffin must run inspector on live pages |
| Selectors may have changed since Oct 2025 | HIGH | Live testing will reveal actual structure |
| Make.com is behind Cloudflare | MEDIUM | Use authenticated session, not public preview |
| Regional Make.com instances may differ | MEDIUM | Test on us1.make.com first, then eu1.make.com |

---

## Success Criteria

✅ Task complete when:

1. Griffin runs inspector on Zapier dashboard and gets all "✅ found" results
2. Griffin runs inspector on Make.com dashboard (at least one region) and gets working selectors
3. Gloria updates both content scripts with real selectors
4. Extension loaded unpacked shows correct metrics on live pages
5. privacy-policy.html created and linked in popup
6. Git commit ready for CWS submission

---

## Timeline

- **Now:** Griffin runs inspector on both sites (10-15 min)
- **While Griffin tests:** Gloria prepares privacy policy + CWS requirements
- **Once selectors found:** Gloria updates content scripts (5-10 min per site)
- **Final test:** Extension loaded unpacked on live pages (5 min)
- **Submit:** CWS submission ready

**Total:** 30-40 minutes to completion

---

## Files to Know

| File | Purpose | Edit? |
|------|---------|-------|
| `/content/zapier.js` | Zapier DOM extraction logic | YES — update selectors |
| `/content/make.js` | Make.com DOM extraction logic | YES — update selectors |
| `/privacy-policy.html` | CWS requirement | CREATE — new file |
| `/manifest.json` | Extension metadata | MAYBE — verify icons, permissions |
| `/popup/index.html` | Badge popup UI | NO — functional |
| `/background/service-worker.js` | Message handling | NO — functional |

---

**Next Action:** Griffin runs `window.flowfixInspect()` on Zapier dashboard and shares results.
