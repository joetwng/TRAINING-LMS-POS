# Auto-Detect Test Fixtures

This directory contains test images and expected detection results for validating the auto-detect functionality.

## Login Page Test

### Test Images
- `login-page.png` - Clean login screen screenshot (source)
- `login-expected-boxes.png` - Same image with red boxes showing ground truth

### Expected Detection Results

For `login-page.png`, auto-detect must find **exactly 4 components**:

1. **Username field** → `INPUT` (type: 'text')
2. **Password field** → `INPUT` (type: 'password')  
3. **SIGN IN button** → `BUTTON` (type: 'button')
4. **"FORGOT YOUR PASSWORD?" link** → `LINK` (type: 'link')

### Hard Rules
- Auto-detect may **only** emit: INPUT (text/password/number), RADIO, CHECKBOX, BUTTON, LINK
- Do **NOT** detect: title text, subtitle, field labels ("Username *", "Password *")

### Component Details

#### Input Fields
- Wide, rectangular shapes with clear borders
- Aspect ratio > 4:1
- Height typically 30-50px
- Should have consistent styling

#### Button
- Medium rectangular shape
- Aspect ratio ~2.5-3:1
- Visually distinct (solid color fill)
- Height 30-80px

#### Link
- Text-like element
- Smaller area than button (<8000px²)
- Aspect ratio 1.5-4:1
- Height < 40px
- Typically styled differently from regular text (color, position)

## Running Tests

### Manual Test (Browser)
1. Open the app: `npm run dev`
2. Create a new page called "loginpage"
3. Upload `login-page.png`
4. Click "Setup Components" → "Auto-Detect Components"
5. Verify exactly 4 objects are detected with correct types

### Visual Validation
Compare detected boxes against `login-expected-boxes.png` to ensure:
- All 4 components are found
- No extra false positives (labels, titles, etc.)
- Box positions roughly align with red ground truth boxes

## Success Criteria
✅ Exactly 4 objects detected  
✅ 2× INPUT types (text + password)  
✅ 1× BUTTON type  
✅ 1× LINK type  
✅ No false positives (labels/titles)  
✅ Reasonable box alignment with ground truth
