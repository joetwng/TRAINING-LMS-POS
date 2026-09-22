# Click-to-Detect Feature - Testing Guide

## Overview
The click-to-detect feature allows users to click directly on UI controls in a screenshot to automatically detect and add them to the Setup editor, replacing the previous manual object placement workflow.

## Quick Start

1. **Start the dev server:**
   ```bash
   npm run dev
   ```
   The app will be available at: http://localhost:5174/TRAINING-LMS-POS/

2. **Create or select a page:**
   - Click "Add Page" to create a new page
   - Upload a screenshot (use `fixtures/login-page.png` for testing)

3. **Enter Setup mode:**
   - Click the "Setup" button for your page

4. **Try click-to-detect:**
   - Click the "🎯 Click to Detect Object" button
   - Notice the cursor changes to a crosshair and the screenshot gets a yellow border
   - Click on any visible UI control (button, input field, link, etc.)
   - The system will automatically detect and add the control
   - Edit the detected object's properties as needed

## Test Scenarios

### ✅ Successful Detection
Click on these areas in `fixtures/login-page.png`:
- **Username field** (center area around y=250): Should detect as TEXT input
- **Password field** (center area around y=380): Should detect as TEXT input  
- **"FORGOT YOUR PASSWORD?" link** (middle of page around y=465): Should detect as LINK
- **SIGN IN button** (bottom area around y=535): Should detect as BUTTON

### ❌ Null Detection
Click on these areas:
- **Empty background** (corners, margins): Should show "No control found" message
- **Between controls**: Should show appropriate error message

## Expected Behavior

### Visual Feedback
- **Click-to-detect mode OFF**: Normal appearance, green button
- **Click-to-detect mode ON**: 
  - Yellow border around screenshot
  - Crosshair cursor over image
  - Yellow highlighted button with "⊗ Cancel Click Detect" text
  - Info banner: "Click-to-detect mode active: Click on any control..."

### Detection Results
- **Success**: 
  - Green success message: "✓ Control detected!"
  - New object appears with red bounding box
  - Object is automatically selected in the properties panel
  - Can immediately edit label, type, required flag, target page
  
- **Failure**:
  - Red error message: "✗ No control found at that location. Try clicking on a button, input field, or link."
  - No object added to the list

### Existing Features Still Work
- **Auto-Detect button**: Full-page detection still works as before
- **Clear All button**: Clears all detected objects
- **Save All button**: Saves all objects to the page
- **Manual editing**: Click any detected box to edit its properties
- **Preview mode**: Runtime jump-on-click behavior unchanged

## Validation Tests

Run the validation test:
```bash
node test-point-detection.cjs
```

Expected output:
```
🎉 All validation tests passed!
   The click-to-detect feature is ready for manual testing.
```

## Build Verification

Check TypeScript compilation:
```bash
npm run build
```

Expected: Build completes successfully with no errors.

## Known Limitations

1. **Detection accuracy**: Works best with clear UI controls that have visible borders or distinct colors
2. **Search radius**: Only searches within 50px of click point if no exact match
3. **One at a time**: Detects one object per click (by design)
4. **Requires screenshot**: Click-to-detect is disabled if page has no uploaded image

## Tips for Best Results

- Click near the **center** of the control for best detection
- For very small controls, try clicking multiple points if first attempt fails
- Use **Auto-Detect** first to find all controls, then **Click-to-Detect** for any missed items
- The system uses the same detection logic as Auto-Detect, so controls that auto-detect finds will also be click-detectable

## Feature Comparison

| Feature | Old "Add Manual Object" | New "Click to Detect" |
|---------|------------------------|----------------------|
| Placement | Fixed position (50, 50) | Detected from click point |
| Type | Hardcoded to "button" | Auto-detected (INPUT/TEXT/BUTTON/LINK/RADIO/CHECKBOX) |
| Bounding box | Fixed 150×40 | Detected from actual control bounds |
| User effort | Manual positioning + type selection | Single click |
| Accuracy | User-dependent | System-detected |

---

**Ready to test?** Start the dev server and follow the Quick Start guide above!
