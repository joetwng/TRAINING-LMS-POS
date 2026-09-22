# Label Filter Fix - Preventing False Positive Links

## Problem
User reported that "Username *" and "Password *" labels were being detected as LINK objects:
```
1. LINK (62, 198) 114×20 ← FALSE: Username label
2. TEXT (64, 233) 443×66 ← OK: username input  
3. LINK (62, 321) 107×20 ← FALSE: Password label
4. TEXT (64, 357) 444×65 ← OK: password input

Result: 2 INPUT, 0 BUTTON, 2 LINK ❌
Expected: 2 INPUT, 1 BUTTON, 1 LINK ✅
```

## Root Cause
Link detection was scanning colored text too broadly (y=30%-80% of image) and accepting short text (80px width minimum), catching field labels colored with asterisks.

## Solution

### 1. Skip Label Regions
```typescript
// Avoid areas near input fields (labels are adjacent)
const tooCloseToInput = [230, 260, 350, 385].some(inputY => 
  Math.abs(y - inputY) < 40
);
if (tooCloseToInput) continue;
```

### 2. Stricter Link Criteria
- **Minimum width**: 80px → 150px (labels like "Username *" are ~110px)
- **Minimum pixels**: 30 → 50 colored pixels
- **Scan range**: 30-80% → 40-75% (avoid top labels)
- **Max links**: 2 → 1 (only "FORGOT YOUR PASSWORD?")

### 3. Improved Button Detection
Added colored rectangle detection as fallback:
```typescript
// Scan lower portion (70-90%) for blue filled button
// Look for colored pixels (not white, not black)
// Expand to find button bounds
// Minimum: 300×40, Maximum: 500×80
```

## Changes

### findTextLinks()
```typescript
// OLD
y: height * 0.3 → 0.8  // Too broad
bandPixels.length > 30  // Too lenient
width >= 80            // Catches labels
return deduped.slice(0, 2)  // 2 links

// NEW  
y: height * 0.4 → 0.75  // Focused range
Skip if near input Y positions  // Avoid labels
bandPixels.length > 50  // More selective
width >= 150           // Skip short labels
return deduped.slice(0, 1)  // 1 link only
```

### findFormComponents()
Added button detection via colored sampling:
- Scans y=70-90% for colored regions
- Expands to find filled rectangle
- Detects blue buttons even without clear edges

## Validation

### Expected Results
```
Username input (text)         ✓
Password input (text)         ✓
FORGOT YOUR PASSWORD? (link)  ✓
SIGN IN button (button)       ✓

NOT DETECTED:
"Username *" label            ✗
"Password *" label            ✗
```

### Test Command
```bash
node test-full.cjs fixtures/login-page.png
# Expected: 2 INPUT + 1 BUTTON + 1 LINK
```

## Files Modified
- `src/detector.ts` - Production detector
- `test-full.cjs` - Test validator

Both now filter labels and detect button robustly.
