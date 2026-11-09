# ThangamOS - Local Testing Guide

## 🎯 What's Included

This is the **complete ThangamOS project with ALL 10 BUGS FIXED** + design enhancements.

You can unzip this and test it locally in your browser before deploying to production.

---

## 📦 Project Structure

```
THANGAMOS_FIXED/
├── index.html              # Main app shell
├── sales.html              # Sales pages
├── shop.html               # Shop pages
├── crm.html                # CRM pages
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (FIXED - cache versioning)
│
├── js/                     # JavaScript files
│   ├── db.js              # (FIXED Bug #3) Database safety
│   ├── billing-sync.js    # (FIXED Bugs #1, #7, #8) Sync & payload fixes
│   ├── billing.js         # (FIXED Bugs #2, #4, #9) Rounding & UI
│   ├── crm.js             # (FIXED Bug #5) Customer filter
│   ├── bridge.js          # (FIXED Bug #10) DB retry logic
│   ├── cloud.js           # Cloud sync (unchanged)
│   ├── admin.js           # Admin (unchanged)
│   └── ... other files    # (unchanged)
│
├── css/                    # CSS files
│   ├── billing.css        # (ENHANCED) Design tokens, accessibility, mobile, print
│   ├── crm.css            # (ENHANCED) Focus indicators
│   └── thangamos.css      # (unchanged)
│
├── icons/                 # PWA icons
│
└── DOCUMENTATION/
    ├── INDEX.md                    # Overview of all fixes
    ├── QUICK_DEPLOY_GUIDE.md      # Fast deployment instructions
    ├── FIXES_IMPLEMENTED.md        # Detailed fix explanations (LONG)
    ├── DEPLOYMENT_CHECKLIST.md    # Pre/post deploy checklist
    └── LOCAL_TEST_README.md        # This file
```

---

## 🚀 How to Test Locally

### **Option 1: Simple HTTP Server (Recommended)**

```bash
# Navigate to project folder
cd THANGAMOS_FIXED

# Start a simple Python server
python -m http.server 8000

# Or Node.js http-server
npx http-server .

# Then open in browser:
# http://localhost:8000
```

### **Option 2: Live Server (VS Code)**

1. Install "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"
3. Opens automatically on http://localhost:5500

### **Option 3: Your Existing Build Pipeline**

If you have npm/webpack setup:
```bash
npm install
npm run build
npm start
```

---

## 🧪 Testing Checklist (30 Minutes)

### **1. Login & Navigation**
- [ ] App loads without console errors
- [ ] Can click through different pages (Home, Sales, CRM, Shop)
- [ ] Sidebar navigation works
- [ ] Mobile view works (open DevTools, toggle device toolbar)

### **2. Critical Bug Tests**

#### **Bug #1: Advance Payment Sync**
- [ ] Create a sale with ₹10,000 advance payment
- [ ] Verify the `advance_adjusted` field exists in sync queue
- [ ] Complete payment and check that due amount is correct

#### **Bug #2: Old Gold Rounding**
- [ ] Add 3+ old gold items with different purities
- [ ] Verify totals don't have ₹0.50+ errors
- [ ] Check console for "round2" function (should exist)

#### **Bug #3: Database Safety**
- [ ] Create and complete a payment
- [ ] Check IndexedDB (DevTools → Application → IndexedDB → invoices)
- [ ] Verify payment record exists without corruption

#### **Bug #4: Old Gold Hidden**
- [ ] In billing page, when old gold credit = ₹0, section should be hidden
- [ ] When credit > ₹0, section should show
- [ ] Check for `bl-ogBody` element in HTML

#### **Bug #5: Inactive Customer Filter**
- [ ] Go to CRM → Customers → Groups
- [ ] Check "Inactive 90+ Days" group
- [ ] Should NOT include customers with 0 visits (never visited)

#### **Bug #6: Service Worker Cache**
- [ ] Open DevTools → Application → Service Workers
- [ ] Cache name should be: `thangamos-modular-test-v1-2026-10-14`
- [ ] (Not the old static name)

#### **Bug #7: Sync Queue Payload**
- [ ] Create a sale with old gold
- [ ] Open DevTools → Application → IndexedDB → sync_queue
- [ ] Verify records have actual data (not null)

#### **Bug #8: Stack Overflow Prevention**
- [ ] Offline: Make quick changes to 10+ items
- [ ] Go online
- [ ] Check console: No stack overflow errors
- [ ] Sync completes successfully

#### **Bug #9: GST Rounding**
- [ ] Create sale with GST enabled
- [ ] Add multiple items
- [ ] GST amount should round to ₹0.01 (no 0.001 decimals)

#### **Bug #10: DB Retry Logic**
- [ ] Open console, search for "bootWithRetry"
- [ ] Function should exist and be called on startup
- [ ] If DB fails once, should retry automatically

### **3. Design & Mobile Tests**

#### **Design Tokens**
- [ ] CSS should have `--space-2` through `--space-8` variables
- [ ] Typography should have `--text-xs` through `--text-3xl`

#### **Accessibility**
- [ ] Tab through form fields
- [ ] Focus indicators should be visible (blue outline)
- [ ] Button hover/focus states clear

#### **Mobile (375px width)**
- [ ] POS page: Bill summary sticks to bottom
- [ ] Forms use 2-column layout
- [ ] Text readable, no horizontal scroll

#### **Print**
- [ ] Open an invoice
- [ ] Press Ctrl+P (Cmd+P on Mac)
- [ ] Preview should show A4 format
- [ ] Header, invoice details, items table visible
- [ ] No sidebar/buttons in print preview

### **4. Offline/Sync Tests**
- [ ] Create a sale while online
- [ ] Close app
- [ ] Open DevTools → Network → Offline
- [ ] Open app again
- [ ] Make another change
- [ ] Go online
- [ ] Both changes should sync (check sync_queue is empty)

---

## 🔍 How to Inspect Changes

### **Browser DevTools**

**View Fixed Code:**
```javascript
// Open DevTools → Sources → js/
// Search for function names:
F12 → Ctrl+P (or Cmd+P)

// Look for:
- "round2" (Bug #2)
- "advance_adjusted" (Bug #1)
- "bootWithRetry" (Bug #10)
- "daysSince(latestVisit" (Bug #5)
```

**View CSS Tokens:**
```css
// DevTools → Elements → Styles tab
// Look for :root { --space-2, --space-3, etc }
```

**View IndexedDB:**
```
DevTools → Application → IndexedDB → thangamos
  → invoices (check records have correct fields)
  → sync_queue (check payload is not null)
```

**View Service Worker:**
```
DevTools → Application → Service Workers
  → Cache Storage
    → Should show: thangamos-modular-test-v1-2026-10-14
```

---

## 📊 Console Checks

Open **DevTools → Console** and check:

```javascript
// Should see no errors:
// ✓ No 404s for JS/CSS files
// ✓ No "Uncaught" errors
// ✓ No "Cannot read property" errors

// Should see:
// ✓ "App initialized" or similar message
// ✓ Service worker registered (if present)

// Search for these to verify fixes:
console.log("round2")      // Bug #2 ✓
console.log("advance_adjusted")  // Bug #1 ✓
console.log("bootWithRetry")     // Bug #10 ✓
```

---

## ⚠️ Common Issues & Solutions

### **Issue: Page doesn't load**
**Solution:**
1. Check browser console for errors (F12)
2. Verify all JS files in `js/` folder exist
3. Verify all CSS files in `css/` folder exist
4. Clear browser cache: Ctrl+Shift+Delete

### **Issue: Styles don't apply**
**Solution:**
1. Check CSS file loads (Network tab)
2. Clear cache: Ctrl+Shift+R
3. Verify `<link>` tags in HTML point to correct paths
4. Check for CSS syntax errors (DevTools → Console)

### **Issue: Can't access IndexedDB**
**Solution:**
1. Not in private/incognito mode (IndexedDB disabled)
2. Check browser supports IndexedDB (all modern browsers do)
3. Open DevTools → Application → IndexedDB

### **Issue: Service Worker shows old cache**
**Solution:**
1. Unregister old: DevTools → Application → Service Workers → Unregister
2. Close browser completely (not just tab)
3. Reopen and hard-refresh: Ctrl+Shift+R

---

## 📈 Performance Notes

**Expected Load Time:**
- First load: < 1 second (local)
- Subsequent loads: < 500ms (service worker cached)

**Expected DB Operations:**
- Payment sync: < 500ms
- Old gold calculation: < 100ms
- Full sync queue: < 2 seconds (100+ items)

---

## 🎉 Success Indicators

Your local test is **successful** if:

✅ No console errors  
✅ All pages load and navigate  
✅ Old gold calculations don't have rounding errors  
✅ Mobile layout responsive (bill summary sticks to bottom)  
✅ Print preview shows A4 format  
✅ Focus indicators visible when tabbing  
✅ IndexedDB shows correct data  
✅ Service worker cache has new version name  

---

## 🚀 Ready to Deploy?

Once local testing passes:

1. Read **QUICK_DEPLOY_GUIDE.md**
2. Backup your current code
3. Copy fixed files to production
4. Clear production cache
5. Test on live server
6. Monitor error logs

---

## 📞 Reference Docs

- **INDEX.md** - Overview of all fixes
- **QUICK_DEPLOY_GUIDE.md** - Production deployment
- **FIXES_IMPLEMENTED.md** - Technical details of each fix
- **DEPLOYMENT_CHECKLIST.md** - Pre-launch checklist

---

## ✨ Need Help?

**Check console messages:**
```
DevTools → Console → Check for:
- network errors
- JavaScript errors
- Specific function names from fixes
```

**Verify fixes exist:**
```
DevTools → Sources → js/
- Search for "round2" in billing.js
- Search for "advance_adjusted" in billing-sync.js
- Search for "bootWithRetry" in bridge.js
```

---

**Happy Testing! 🎊**

**Test Date:** 2026-10-14  
**All Fixes Applied:** ✅  
**Ready for Production:** ✅  

If all tests pass, you're good to deploy!
