# FlowFix — Chrome Web Store Submission Guide

**Time required: 3 minutes**

## Open the Dashboard
https://chrome.google.com/webstore/devconsole

## Step 1: New Item
Click **"+ New item"** → Upload the ZIP:
```
/Users/gloria/eigen/flowfix/flowfix-cws.zip
```

## Step 2: Store Listing
Copy-paste these fields:

**Title:**
```
FlowFix - Integration Doctor
```

**Short description:**
```
Instantly see your Zapier & Make.com workflow health. Spot errors, track usage limits, and get fix recommendations — all locally.
```

**Detailed description:** (copy from `memory/flowfix-cws-submission.md` Section 5, or use the text below)

FlowFix — Integration Doctor for Zapier & Make.com

Know the health of your automation workflows at a glance. FlowFix analyzes your Zapier and Make.com dashboards directly in your browser and gives you a real-time health score, error alerts, and smart recommendations — without sending a single byte of data off your device.

HOW IT WORKS

Open your Zapier or Make.com dashboard and FlowFix goes to work automatically. A clean health badge appears in the corner of your screen showing your score from 0-100. Click the extension icon for the full breakdown.

Health Score (0-100), Total workflows, Error count, Usage %, Paused/inactive count, Smart recommendations ranked by severity.

SUPPORTED PLATFORMS: Zapier (zapier.com) and Make.com (all regions).

PRIVACY — 100% LOCAL: No data sent to external servers. No analytics. No account required. All analysis happens in your browser.

PERMISSIONS — MINIMUM REQUIRED: activeTab (detect dashboard) + storage (cache metrics locally). That's it.

**Category:** Productivity
**Language:** English (US)

## Step 3: Upload Screenshots
Upload these 3 files (all 1280x800):
```
/Users/gloria/eigen/flowfix/store-assets/cws-01-hero.png
/Users/gloria/eigen/flowfix/store-assets/cws-02-features.png
/Users/gloria/eigen/flowfix/store-assets/cws-03-platforms.png
```

## Step 4: Privacy
**Privacy Policy URL:**
```
https://spicyblitz.github.io/flowfix/privacy-policy.html
```

**Single purpose:** "Diagnose and display health metrics for Zapier and Make.com automation workflows"

**Data use:** Select "I do not collect or use any user data"

**Permissions justification:**
- activeTab: "Detect whether the user is on a Zapier or Make.com dashboard to enable the popup analysis"
- storage: "Cache extracted workflow metrics locally for 5-minute display in the popup"
- Host permissions: "Content scripts run only on zapier.com and make.com to extract visible dashboard metrics"

## Step 5: Submit
Click **"Submit for review"**

Review typically takes 1-3 business days.

---
*All assets ready. Privacy policy live. ZIP verified. Just upload and submit.*
