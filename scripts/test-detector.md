# Detector Test Script

## Purpose
Validate that the auto-detector correctly identifies UI components from the login page screenshot.

## Prerequisites
- `fixtures/login-page.png` present
- `fixtures/login-expected-boxes.png` present (for visual comparison)
- Development server running

## Test Procedure

### 1. Start Development Server
```bash
npm run dev
```

### 2. Manual Detection Test
1. Open http://localhost:5174 in browser
2. Click "Create New Page"
3. Enter page name: `login-test`
4. Click on the new page to open it
5. Click "Choose Screenshot" and select `fixtures/login-page.png`
6. Click "Setup Components" button
7. Click "🔍 Auto-Detect Components" button
8. Wait for detection to complete

### 3. Validate Results

#### Count Check
- **Expected**: Exactly 4 objects detected
- **Verify**: Check "Total objects: X" at bottom of properties panel

#### Type Check
For each detected object, check the Type dropdown:
- [ ] 1st object: Text Input (Username field)
- [ ] 2nd object: Password Input (Password field)
- [ ] 3rd object: Button (SIGN IN button)
- [ ] 4th object: Link (FORGOT YOUR PASSWORD? link)

#### Visual Alignment
1. Open `fixtures/login-expected-boxes.png` side-by-side
2. Compare detected boxes (red overlays) with ground truth (red boxes in expected image)
3. Verify reasonable alignment (±10-20px tolerance acceptable)

#### False Positive Check
Ensure these are **NOT** detected:
- ❌ "Login to your account" title
- ❌ "Sign in with your username and password" subtitle
- ❌ "Username *" label
- ❌ "Password *" label

### 4. Pass/Fail Criteria

**PASS** if:
- ✅ Exactly 4 objects detected
- ✅ Type distribution: 2 inputs, 1 button, 1 link
- ✅ No false positives (labels/titles)
- ✅ Reasonable box alignment

**FAIL** if:
- ❌ Wrong object count
- ❌ Wrong type assignments
- ❌ Labels/titles detected as objects
- ❌ Missing expected components

## Expected Detection Output

```typescript
[
  {
    type: 'text',           // Username input
    label: 'text_1',
    // x, y, width, height should align with username field
  },
  {
    type: 'password',       // Password input
    label: 'password_2',
    // x, y, width, height should align with password field
  },
  {
    type: 'button',         // SIGN IN button
    label: 'button_3',
    // x, y, width, height should align with button
  },
  {
    type: 'link',           // FORGOT YOUR PASSWORD? link
    label: 'link_4',
    // x, y, width, height should align with link text
  }
]
```

## Debugging Failed Tests

### Too Many Objects Detected
- Labels/titles being picked up → Increase `minSize` or confidence threshold
- Multiple boxes on same element → Adjust overlap filtering

### Too Few Objects Detected
- Missing link or button → Adjust `inferType` heuristics
- Missing input → Lower confidence threshold carefully

### Wrong Types Assigned
- Review `inferType` function logic
- Check aspect ratio and area calculations
- Verify type classification thresholds

## Related Files
- `/src/detector.ts` - Main detection algorithm
- `/src/types.ts` - Type definitions
- `/fixtures/README.md` - Fixture documentation
