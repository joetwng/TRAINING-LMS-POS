# Next Steps for Login Page Detector Testing

## ✅ Completed Work

### 1. Type System
- [x] Added `'link'` type to DetectedObject
- [x] Updated all UI components to support links
- [x] Added link rendering in preview mode

### 2. Detector Algorithm
- [x] Refined type inference for better accuracy
- [x] Increased selectivity to reduce false positives
- [x] Tuned thresholds for login page components
- [x] Implemented link detection heuristics

### 3. Test Infrastructure
- [x] Created fixtures directory with documentation
- [x] Created validation script for automated testing
- [x] Documented manual test procedure
- [x] Created expected output reference

### 4. Build & Deployment
- [x] All TypeScript compilation passes
- [x] Build completes successfully
- [x] Committed and pushed to feature branch
- [x] Created draft PR #3

## 📋 TODO: Testing & Validation

### 1. Obtain Test Images
The following images are needed in `fixtures/` directory:
- `login-page.png` - Clean login screen screenshot
- `login-expected-boxes.png` - Same screen with red ground truth boxes

**Note**: Images were mentioned in task description but not yet available in the repository.

### 2. Run Manual Detection Test
Once images are available:

```bash
# Start dev server
npm run dev

# Follow test procedure in scripts/test-detector.md
# 1. Open http://localhost:5174
# 2. Create page "loginpage"
# 3. Upload login-page.png
# 4. Click "Setup Components" → "Auto-Detect Components"
# 5. Verify exactly 4 objects detected
```

### 3. Validate Results
Expected detection:
- ✅ 2 INPUT fields (username, password)
- ✅ 1 BUTTON (SIGN IN)
- ✅ 1 LINK (FORGOT YOUR PASSWORD?)
- ❌ NO labels, titles, or subtitles

### 4. Export & Validate Output
After manual test:
1. Save detected objects to `fixtures/login-detection-actual.json`
2. Run validation:
   ```bash
   node scripts/validate-detection.cjs fixtures/login-detection-actual.json
   ```

### 5. Iterate if Needed
If detection doesn't match expectations:

**Too many objects detected:**
- Increase `minSize` in `detectRectangles()` (currently 30)
- Raise confidence threshold in `findRectangularRegions()` (currently 0.35)
- Adjust overlap filtering threshold

**Too few objects detected:**
- Decrease confidence threshold carefully
- Adjust `inferType()` heuristics
- Check image quality/contrast

**Wrong types assigned:**
- Review aspect ratio thresholds in `inferType()`
- Adjust area thresholds for each type
- Check height constraints

### 6. Finalize PR
Once tests pass:
1. Update PR description with test results
2. Add screenshots/evidence if helpful
3. Convert PR from draft to ready for review
4. Request review from team

## 🔍 Quick Reference

### Files Modified
- `src/types.ts` - Added link type
- `src/detector.ts` - Refined detection algorithm
- `src/components/SetupEditor.tsx` - Added link option
- `src/components/PreviewMode.tsx` - Added link rendering

### Files Created
- `fixtures/README.md` - Test documentation
- `fixtures/login-detection-expected.json` - Reference output
- `fixtures/PLACE_IMAGES_HERE.md` - Image guide
- `scripts/test-detector.md` - Manual test procedure
- `scripts/validate-detection.cjs` - Automated validator
- `CHANGES.md` - Change summary
- `NEXT_STEPS.md` - This file

### Key Commands
```bash
# Build
npm run build

# Run dev server
npm run dev

# Validate detector output
node scripts/validate-detection.cjs <output.json>

# Check validation help
node scripts/validate-detection.cjs
```

## 📊 Success Criteria

**PASS** when:
- ✅ Exactly 4 objects detected from login-page.png
- ✅ Type counts: 2 INPUT, 1 BUTTON, 1 LINK
- ✅ No false positives (labels/titles)
- ✅ Reasonable box alignment with ground truth
- ✅ Validation script returns exit code 0

**FAIL** if:
- ❌ Wrong object count
- ❌ Wrong type distribution
- ❌ Labels/titles detected as objects
- ❌ Missing expected components

## 🔗 Resources
- PR: https://github.com/joetwng/TRAINING-LMS-POS/pull/3
- Branch: `cursor/add-link-type-detector-8693`
- Test procedure: `scripts/test-detector.md`
- Fixture docs: `fixtures/README.md`

## ⚠️ Known Limitations
- Detector cannot distinguish password fields from text fields visually
- Both input fields will initially be type 'text'
- User must manually change one to 'password' if needed
- This is expected and acceptable
