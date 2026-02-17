# FlowFix DOM Selector Validation Guide

**Last Updated:** 2026-02-16
**Status:** Selectors require live validation against authenticated dashboard pages

## Quick Start: Validate Selectors

### Step 1: Open Live Zapier/Make Dashboard
- Zapier: https://zapier.com/app/home or https://zapier.com/app/dashboard
- Make: https://make.com (any authenticated region)

### Step 2: Open Browser DevTools
- Press `F12` on Windows/Linux
- Press `Cmd+Option+I` on macOS

### Step 3: Copy & Paste Inspector
1. Go to Console tab
2. Open `/flowfix/tools/selector-inspector.js`
3. Copy entire content
4. Paste into browser console
5. Press Enter to load

### Step 4: Run Inspection
In the console, run:
```javascript
window.flowfixInspect()
```

### Step 5: Review Results
You'll see output like:
```
=== FlowFix Selector Inspector ===
Site: zapier
URL: https://zapier.com/app/home
Time: 2026-02-16T...

  ✅ data-testid=task-usage: "1,234" → 1234
  ✅ zaps_total: found 15 elements
  ❌ Could not find task limit

=== Summary ===
✅ tasks_used: {"selector":"...","text":"...","value":1234,"status":"found"}
...
```

## Current Known Issues (as of Feb 16, 2026)

| Metric | Status | Notes |
|--------|--------|-------|
| Zapier tasks_used | ⚠️ Speculative | Selector patterns exist but untested on live page |
| Zapier tasks_limit | ⚠️ Speculative | May require "X of Y" pattern or plan lookup |
| Zapier zaps_total | ⚠️ Speculative | Zapier uses React dynamic classes |
| Zapier zaps_error | ⚠️ Speculative | Error indicators may have changed |
| Make operations_used | ⚠️ Speculative | Behind Cloudflare, untested |
| Make scenarios_total | ⚠️ Speculative | Angular-based component CSS |

## What to Look For

When running the inspector, you're looking for:

### Task/Operations Usage
- Text like: "1,234 of 10,000 tasks used"
- Elements with `data-testid` containing "usage", "usage", or "quota"
- Progress bars with `role="progressbar"` and `aria-valuenow`
- Percentage displays (80% remaining, etc.)

### Zap/Scenario Count
- Table rows or card elements representing individual workflows
- Status indicators (✓ active, ✗ error, — paused)
- Color-coded elements (green=active, red=error)
- Text badges like "15 Zaps" or "3 Active"

### Error Metrics
- Red-colored elements or icons
- Text containing "error", "failed", "needs attention"
- Issue badges or warning icons
- Sidebar notification counters

### Team/Plan Info
- Team name in header or sidebar
- Plan name in account menu or settings
- Sidebar elements with role="button" or class containing "account", "profile"

## Updating Selectors

Once you've identified working selectors:

1. **Edit the content script:** `/flowfix/content/zapier.js` or `/flowfix/content/make.js`
2. **Update extraction function:** Replace selector arrays in functions like `extractTaskUsage()`
3. **Add comment with source:** Include inspector output or screenshot reference
4. **Test in extension:** Load unpacked extension in Chrome, verify on live page
5. **Commit:** Add `docs/SELECTOR-VALIDATION.md` notes to git

## Selector Priority Strategy

If multiple selectors work, prefer this order:

1. **data-testid** — Most stable (Zapier's own testing hooks)
2. **aria-label** — Accessible, usually stable
3. **[data-status]** — Status-specific, very specific
4. **Role + aria attributes** — Semantic, fallback-friendly
5. **Text content matching** — Last resort, breaks with UI text changes

Avoid:
- Generic class names (`.btn`, `.card`, `.item`)
- Semantic elements alone (`main table tr`) — too fragile
- CSS utility classes (`.text-red-500`, `.bg-blue-100`) — changed by every redesign

## Known Zapier URL Patterns (2026)

- **Dashboard:** `zapier.com/app/home`
- **Assets/Zaps:** `zapier.com/app/assets/zaps`
- **Automation:** `zapier.com/app/automation`
- **Team Billing:** `zapier.com/account/team/{teamId}/billing`

## Known Make.com URL Patterns (2026)

- **Main:** `make.com` (with regional subdomains: `us1.make.com`, `eu1.make.com`, etc.)
- **Scenarios:** `{region}.make.com/scenarios`
- **Executions:** `{region}.make.com/executions`

## Testing Checklist

- [ ] Inspector runs without errors
- [ ] All metrics show "✅ found" or "ℹ️ found_by_text"
- [ ] No console errors or warnings
- [ ] Numeric values are reasonable (not 0 or 999)
- [ ] Team name and plan name are populated
- [ ] Verified on both free and paid accounts (if possible)

## Debugging Tips

If selectors aren't working:

1. **Check if you're on the right page**
   - Inspector logs URL — verify it's the dashboard, not a sub-page

2. **Use Chrome DevTools to manually test selectors**
   ```javascript
   // In console
   document.querySelector('[data-testid="task-usage"]')
   // Should return the element or null
   ```

3. **Inspect the actual page structure**
   - Right-click element → Inspect
   - Look for data-testid, aria-label, role attributes
   - Note the actual selector that matches

4. **Check for dynamic rendering**
   - Sometimes Zapier/Make load metrics asynchronously
   - Wait 2-3 seconds after page load before running inspector
   - Scroll down to trigger lazy-loaded elements

5. **Check Cloudflare/Auth**
   - Make.com may require specific regional URL
   - Ensure you're logged in
   - Try in private/incognito window if cache is stale

## When to Escalate

If after running inspector you find:
- All metrics return "❌ not_found"
- Numeric values are always 0 or placeholder
- Selectors don't match any elements

Then:
1. Take a screenshot of the dashboard
2. Share with project team
3. Mark selector as "Requires Live Dev Debugging"
4. File issue with date, URL, screenshot, inspector output

## Extension Loading (for live testing)

1. Go to `chrome://extensions/`
2. Enable "Developer mode" (toggle, top-right)
3. Click "Load unpacked"
4. Navigate to `/Users/gloria/eigen/flowfix/`
5. Visit Zapier/Make page — badge should appear
6. Click badge to see popup with metrics
7. Check console (F12) for debug logs

To enable debug logging, in content script change:
```javascript
const DEBUG = false;  // Change to true
```

Then reload extension (Ctrl+R or click reload icon on extension card).

---

**Next Steps:**
- [ ] Run inspector on live Zapier dashboard
- [ ] Run inspector on live Make.com dashboard
- [ ] Update selector arrays with working selectors
- [ ] Verify badge appears and shows correct metrics
- [ ] Submit to Chrome Web Store
