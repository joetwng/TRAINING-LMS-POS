# Screenshot-Driven Page Flow Builder

A web MVP for creating interactive training flows from screenshots. Upload screenshots of POS/retail screens, auto-detect UI components, configure their behavior, and create clickable navigation flows.

## Features

- **Page Management**: Create, rename, and delete named pages (e.g., loginpage, mainpage)
- **Screenshot Upload**: Upload screenshot images for each page
- **Auto-Detection**: Automatically detect UI components from screenshots using multi-pass algorithms:
  - Edge-based detection for inputs with clear borders
  - Filled region detection for soft-bordered white inputs
  - Colored button detection for filled buttons (e.g., blue SIGN IN buttons)
  - Text link detection for colored hyperlinks
- **Click-to-Detect**: Click on any UI control in a screenshot to automatically detect and add it
- **Component Configuration**: Set properties for each detected component:
  - Type (text, number, password, checkbox, radio, button, select)
  - Auto-detect produces only: text inputs, checkboxes, radio buttons, buttons, and links
  - Click-to-detect intelligently identifies control type at the clicked location
  - Other types (number, password, select) available via manual editing
  - Label and required status
  - Max length for input fields
  - Target page for navigation
- **Interactive Preview**: Test your page flow with real HTML controls positioned over screenshots
- **Navigation**: Click buttons/controls to jump between pages based on configured targets

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open your browser to `http://localhost:5174`

## How It Works

### 1. Create Pages
Start by creating named pages in the main list view. Each page represents a screen in your training flow.

### 2. Upload Screenshot
Click into a page and upload a screenshot of the screen you want to recreate.

### 3. Detect Components

Two detection methods are available:

#### Auto-Detect (Full Page)
Click "Setup Components" then "🔍 Auto-Detect Components". The system will:
- Convert the image to canvas for pixel-level analysis
- Apply edge detection algorithms to find high-contrast boundaries
- Identify rectangular regions that likely represent UI elements
- Classify components based on aspect ratio and size heuristics:
  - Wide, short regions → text inputs (INPUT)
  - Medium rectangles → buttons (BUTTON)
  - Small squares → checkboxes (CHECKBOX)
  - Tall, narrow regions → radio buttons (RADIO)
  - Colored text regions → links (LINK)
- **Note**: Auto-detect finds all controls at once

#### Click-to-Detect (Single Control)
Click "🎯 Click to Detect Object" then click on any control in the screenshot:
- The cursor changes to a crosshair
- Click directly on the control you want to detect
- The system analyzes that specific location and detects the control type and bounds
- Perfect for adding individual controls missed by auto-detect or in complex UIs
- Shows success/failure messages with clear feedback

### 4. Configure Objects
For each detected object:
- Adjust the type if auto-detection guessed wrong
- Set labels and validation rules (required, max length)
- Assign a target page for navigation (or leave empty)
- Delete false positives
- Add missed components using click-to-detect

### 5. Preview Mode
Test your flow! The preview overlays real HTML controls on the screenshot. Click any button/control with a target page to navigate through your training flow.

## Auto-Detection Algorithm

The detection system uses a multi-pass heuristic approach:

1. **Edge Detection**: Analyzes pixel gradients to identify high-contrast boundaries
   - Compares each pixel against its 4 neighbors (low threshold of 8 for soft borders)
   - Threshold-based detection for robustness
   - Creates a binary edge map

2. **Rectangle Finding**: Samples the edge map to find rectangular regions
   - Tests various position and size combinations
   - Scores rectangles based on edge density along perimeters
   - Filters overlapping regions, keeping highest-confidence matches

3. **Filled Region Detection**: Finds white input fields that edge detection may miss
   - Scans for high-brightness uniform regions
   - Only runs if fewer than 2 rectangles found via edges

4. **Colored Button Detection**: Finds filled buttons with soft/rounded borders
   - Scans lower portion of screen for colored (non-white) regions
   - Expands from seed points to find button boundaries
   - Detects buttons like blue "SIGN IN" that have weak edges

5. **Text Link Detection**: Identifies colored text that may be clickable
   - Scans for bands of colored pixels (e.g., blue text)
   - Filters out labels near input fields
   - Finds links like "FORGOT YOUR PASSWORD?"

6. **Type Inference**: Classifies detected rectangles based on geometry and color
   - Aspect ratio analysis (wide = text input, medium = button)
   - Color analysis (colored + medium brightness = button, white = input)
   - Area thresholds (small = checkbox, large colored = button)
   - Shape analysis (tall/narrow = radio button)
   - Color analysis (colored text regions = links)
   - **Auto-detect restricted to**: INPUT (text), RADIO, CHECKBOX, BUTTON, LINK
   - Other types (number, password, select) must be set manually after detection

### Point-Based Detection (Click-to-Detect)

The new click-to-detect feature uses the same detection algorithm but:
- Constrains the search to controls at/near the clicked point
- Returns the single best match within 50px radius
- Provides immediate visual feedback on success or failure
- Uses same type inference as full-page detection

### Known Limitations

- **Accuracy**: Best results with clean, high-contrast screenshots with clear borders
- **Complex UIs**: May miss borderless or low-contrast elements
- **Overlapping**: Struggles with overlapping or nested components
- **Fine Details**: Small icons or decorative elements may be detected as components
- **Manual Adjustment**: Always requires human review and correction

**Success Strategy**: The auto-detect provides a starting point. Manual editing (add, delete, resize, retype) is expected and supported.

## Technology Stack

- **Vite + React + TypeScript**: Modern, fast development experience
- **localStorage**: Simple persistence (no backend required)
- **Canvas API**: Client-side image processing
- **Pure JavaScript**: No external vision libraries, runs entirely in-browser

## Data Storage

All data is stored in browser localStorage:
- Page definitions (names, creation time)
- Screenshot images (base64-encoded)
- Detected objects with full configuration

To reset: Clear browser data or localStorage for this domain.

## Project Structure

```
src/
├── types.ts              # TypeScript interfaces
├── storage.ts            # localStorage utilities
├── detector.ts           # Auto-detection algorithm
├── components/
│   ├── PageList.tsx      # Main page list view
│   ├── PageDetail.tsx    # Individual page with upload
│   ├── SetupEditor.tsx   # Component detection & editing
│   └── PreviewMode.tsx   # Interactive preview/runtime
└── App.tsx              # Main app orchestration
```

## Development

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## Testing

The detector can be validated against test fixtures:

```bash
# Validate detector against login-page.png
node validate-detector.cjs fixtures/login-page.png
```

This validation script mirrors the actual `src/detector.ts` logic and verifies that:
- Input fields (Username, Password) are detected
- Colored buttons (like SIGN IN) are detected
- Text links (like FORGOT YOUR PASSWORD?) are detected

## Sample Workflow

1. Create page "loginpage"
2. Upload a login screen screenshot
3. Click "Setup Components" → "🔍 Auto-Detect Components" (or use "🎯 Click to Detect Object" to add controls one by one)
4. Edit detected objects:
   - Username field: type=text, required=true, maxLength=50
   - Password field: type=password, required=true
   - Login button: type=button, targetPage=mainpage
5. Create page "mainpage" with its screenshot
6. Back to loginpage → Click "Preview"
7. Click the login button → navigates to mainpage!

**Tip**: Use Auto-Detect first to find all controls quickly, then use Click-to-Detect to add any controls that were missed.

## Future Enhancements (Out of Scope for MVP)

- Export/import flows as JSON
- Validation rules (regex patterns)
- Multi-select and conditional navigation
- Touch gesture support
- Actual form submission
- Production hosting

## License

MIT

## Author

Built for POS/retail staff training scenarios.
