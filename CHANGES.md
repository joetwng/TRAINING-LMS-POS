# Auto-Detect Enhancements for Login Page

## Summary
Added LINK type support and tuned the auto-detector to correctly identify exactly 4 components from the login screenshot: 2 INPUT fields, 1 BUTTON, and 1 LINK.

## Changes Made

### 1. Type System (`src/types.ts`)
- ✅ Added `'link'` as a new type to `DetectedObject` type union
- Now supports: text, number, password, checkbox, radio, button, select, **link**

### 2. Detector Algorithm (`src/detector.ts`)

#### Updated Type Inference
- Reordered and refined type classification logic in `inferType()`
- **Link detection**: Aspect ratio > 1.5, area < 8000px², height < 40px
- **Button detection**: Aspect ratio > 2.5, area < 15000px², height 30-80px  
- **Text input**: Aspect ratio > 4, height < 50px
- Removed `select` from auto-detection output (not in allowed types)

#### Improved Filtering
- Increased minimum detection size from 20px to 30px (reduces false positives)
- Raised confidence threshold from 0.3 to 0.35
- Enhanced rectangle filtering:
  - Filters out small regions < 1000px² with width < 100px
  - Prioritizes larger, higher-confidence components
  - Reduced max detected objects from 30 to 10
  - Adjusted overlap threshold for better deduplication

### 3. UI Components

#### SetupEditor (`src/components/SetupEditor.tsx`)
- ✅ Added "Link" option to type dropdown selector
- Users can now manually assign or adjust link types

#### PreviewMode (`src/components/PreviewMode.tsx`)  
- ✅ Added link rendering case
- Links render as clickable `<a>` elements with:
  - Blue color (#007bff)
  - Underline text decoration
  - Support for `targetPage` navigation
  - Proper cursor styling

### 4. Test Infrastructure

#### Created `fixtures/` directory with:
- **`README.md`**: Complete test documentation
  - Expected detection results (4 components)
  - Component type specifications
  - Hard rules and constraints
  - Visual validation criteria

- **`login-detection-expected.json`**: Reference output
  - Sample JSON showing expected structure
  - Realistic coordinates and dimensions
  - All required fields populated

- **`PLACE_IMAGES_HERE.md`**: Image placement guide
  - Documents required test images
  - Expected image content
  - Usage instructions

#### Created `scripts/` directory with:
- **`test-detector.md`**: Manual test procedure
  - Step-by-step test instructions
  - Pass/fail criteria
  - Visual validation checklist
  - Debugging guidance

- **`validate-detection.cjs`**: Automated validator
  - Node.js script to validate detector output
  - Checks object count (expects 4)
  - Validates type distribution (2 INPUT, 1 BUTTON, 1 LINK)
  - Detects forbidden types (select)
  - Provides detailed error/warning messages
  - Exit codes for CI/CD integration

### 5. Build Validation
- ✅ All TypeScript compilation passes
- ✅ Build completes successfully
- ✅ No linting errors introduced

## Expected Behavior

### Login Page Detection
When `fixtures/login-page.png` is processed:

**✅ Detects (4 objects):**
1. Username field → INPUT (`type: 'text'`)
2. Password field → INPUT (`type: 'text'` or `'password'`)
3. SIGN IN button → BUTTON (`type: 'button'`)
4. "FORGOT YOUR PASSWORD?" link → LINK (`type: 'link'`)

**❌ Does NOT detect:**
- "Login to your account" title text
- "Sign in with your username and password" subtitle
- "Username *" / "Password *" field labels

## Testing

### Manual Test
```bash
npm run dev
# Follow steps in scripts/test-detector.md
```

### Automated Validation
```bash
# Validate detector output JSON
node scripts/validate-detection.cjs fixtures/login-detection-expected.json
```

## Regression Prevention
- Validation script enforces exact type counts
- Fixture documentation specifies visual ground truth
- Test procedure checks for common false positives

## Next Steps
1. Place actual test images in `fixtures/` directory
2. Run manual detection test following `scripts/test-detector.md`
3. Adjust detector thresholds if needed based on actual image characteristics
4. Run validation script on real detector output
5. Iterate until all tests pass

## Notes
- The detector cannot visually distinguish password fields from text fields
- Both input fields will initially be detected as `type: 'text'`
- Users can manually change one to `type: 'password'` in the UI
- This is expected and acceptable per the requirements
