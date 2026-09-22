# Screenshot-Driven Page Flow Builder

A web MVP for creating interactive training flows from screenshots. Upload screenshots of POS/retail screens, auto-detect UI components, configure their behavior, and create clickable navigation flows.

## Features

- **Page Management**: Create, rename, and delete named pages (e.g., loginpage, mainpage)
- **Screenshot Upload**: Upload screenshot images for each page
- **Auto-Detection**: Automatically detect UI components from screenshots using edge detection algorithms
- **Component Configuration**: Set properties for each detected component:
  - Type (text, number, password, checkbox, radio, button, select)
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

### 3. Auto-Detect Components
Click "Setup Components" and then "Auto-Detect Components". The system will:
- Convert the image to canvas for pixel-level analysis
- Apply edge detection algorithms to find high-contrast boundaries
- Identify rectangular regions that likely represent UI elements
- Classify components based on aspect ratio and size heuristics:
  - Wide, short regions → text inputs
  - Medium rectangles → buttons
  - Small squares → checkboxes
  - Large areas → select dropdowns

### 4. Configure Objects
For each detected object:
- Adjust the type if auto-detection guessed wrong
- Set labels and validation rules (required, max length)
- Assign a target page for navigation (or leave empty)
- Delete false positives or add missed components manually

### 5. Preview Mode
Test your flow! The preview overlays real HTML controls on the screenshot. Click any button/control with a target page to navigate through your training flow.

## Auto-Detection Algorithm

The detection system uses a custom heuristic approach:

1. **Edge Detection**: Analyzes pixel gradients to identify high-contrast boundaries
   - Compares each pixel against its 4 neighbors
   - Threshold-based detection for robustness
   - Creates a binary edge map

2. **Rectangle Finding**: Samples the edge map to find rectangular regions
   - Tests various position and size combinations
   - Scores rectangles based on edge density along perimeters
   - Filters overlapping regions, keeping highest-confidence matches

3. **Type Inference**: Classifies detected rectangles based on geometry
   - Aspect ratio analysis (wide = input, square = checkbox)
   - Area thresholds (small = checkbox, large = select)
   - Height limits (tall = radio, short = text input)

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

## Sample Workflow

1. Create page "loginpage"
2. Upload a login screen screenshot
3. Click "Setup Components" → "Auto-Detect Components"
4. Edit detected objects:
   - Username field: type=text, required=true, maxLength=50
   - Password field: type=password, required=true
   - Login button: type=button, targetPage=mainpage
5. Create page "mainpage" with its screenshot
6. Back to loginpage → Click "Preview"
7. Click the login button → navigates to mainpage!

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
