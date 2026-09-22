# Image Fixtures

Place the following images in this directory:

## Required Files

### login-page.png
The clean login screen screenshot to be used as detection input.

**Source**: Provided by user as `/workspace/TRAINING-LMS-POS/fixtures/login-page.png`

Expected to show:
- "Login to your account" title
- "Sign in with your username and password" subtitle  
- Username input field with label
- Password input field with label
- "SIGN IN" button
- "FORGOT YOUR PASSWORD?" link

### login-expected-boxes.png
Same login page with red boxes overlaid showing ground truth detection targets.

**Source**: Provided by user as `/workspace/TRAINING-LMS-POS/fixtures/login-expected-boxes.png`

Should show 4 red boxes around:
1. Username field
2. Password field
3. SIGN IN button
4. FORGOT YOUR PASSWORD? link

## Usage

Once images are placed here:
```bash
# Copy images from user-provided location
cp /path/to/login-page.png ./fixtures/
cp /path/to/login-expected-boxes.png ./fixtures/

# Run manual tests as described in scripts/test-detector.md
npm run dev
```
