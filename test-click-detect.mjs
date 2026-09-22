import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Replicate the exact logic from src/detector.ts for validation
const detectLocalRectangle = (pixels, width, height, x, y) => {
  if (x < 0 || x >= width || y < 0 || y >= height) return null;

  const idx = (y * width + x) * 4;
  const r = pixels[idx];
  const g = pixels[idx + 1];
  const b = pixels[idx + 2];
  const brightness = (r + g + b) / 3;

  const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
  const isColored = colorDiff > 10;
  const isBright = brightness > 200;
  const isMediumBright = brightness >= 40 && brightness <= 220;

  if (isColored && isMediumBright) {
    return expandColoredButton(pixels, width, height, x, y);
  }

  if (brightness > 220) {
    const surroundingColored = checkSurroundingColored(pixels, width, height, x, y);
    if (surroundingColored) {
      return expandColoredButton(pixels, width, height, x, y, true);
    }
    return expandWhiteInput(pixels, width, height, x, y);
  }

  if (isColored && brightness >= 180 && brightness <= 240) {
    return expandColoredLink(pixels, width, height, x, y);
  }

  return null;
};

const checkSurroundingColored = (pixels, width, height, x, y) => {
  let coloredCount = 0;
  let totalChecked = 0;

  for (let dy = -10; dy <= 10; dy += 2) {
    for (let dx = -10; dx <= 10; dx += 2) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = (ny * width + nx) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const avg = (r + g + b) / 3;
        const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
        
        if (colorDiff > 10 && avg >= 40 && avg <= 220) {
          coloredCount++;
        }
        totalChecked++;
      }
    }
  }

  return coloredCount / totalChecked > 0.25;
};

const expandColoredButton = (pixels, width, height, x, y, fromWhiteText = false) => {
  let seedX = x;
  let seedY = y;

  if (fromWhiteText) {
    let found = false;
    let bestScore = -1;
    let bestX = x, bestY = y;
    
    for (let radius = 1; radius <= 30 && !found; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const avg = (r + g + b) / 3;
            const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
            
            if (colorDiff > 30 && avg >= 80 && avg <= 180) {
              seedX = nx;
              seedY = ny;
              found = true;
              break;
            }
            
            if (colorDiff > 15 && avg >= 40 && avg <= 200) {
              const score = colorDiff * (1 - Math.abs(avg - 130) / 100);
              if (score > bestScore) {
                bestScore = score;
                bestX = nx;
                bestY = ny;
              }
            }
          }
        }
        if (found) break;
      }
      if (found) break;
    }
    
    if (!found && bestScore > 0) {
      seedX = bestX;
      seedY = bestY;
      found = true;
    }
    
    if (!found) return null;
  }

  const seedIdx = (seedY * width + seedX) * 4;
  const refR = pixels[seedIdx];
  const refG = pixels[seedIdx + 1];
  const refB = pixels[seedIdx + 2];
  const refAvg = (refR + refG + refB) / 3;

  let left = seedX, right = seedX, top = seedY, bottom = seedY;

  // Expand left with hole tolerance
  let consecutiveHoles = 0;
  const maxHoleGap = 15;
  let leftmostValid = seedX;
  
  for (let tx = seedX; tx >= Math.max(0, seedX - 500); tx--) {
    let rowPasses = 0;
    for (let dy = -5; dy <= 5; dy += 5) {
      const testY = seedY + dy;
      if (testY >= 0 && testY < height && isButtonPixel(pixels, width, height, tx, testY, refAvg)) {
        rowPasses++;
      }
    }
    
    if (rowPasses >= 2) {
      leftmostValid = tx;
      consecutiveHoles = 0;
    } else {
      consecutiveHoles++;
      if (consecutiveHoles > maxHoleGap) {
        break;
      }
    }
  }
  left = leftmostValid;

  // Expand right with hole tolerance
  consecutiveHoles = 0;
  let rightmostValid = seedX;
  
  for (let tx = seedX; tx < Math.min(width, seedX + 500); tx++) {
    let rowPasses = 0;
    for (let dy = -5; dy <= 5; dy += 5) {
      const testY = seedY + dy;
      if (testY >= 0 && testY < height && isButtonPixel(pixels, width, height, tx, testY, refAvg)) {
        rowPasses++;
      }
    }
    
    if (rowPasses >= 2) {
      rightmostValid = tx;
      consecutiveHoles = 0;
    } else {
      consecutiveHoles++;
      if (consecutiveHoles > maxHoleGap) {
        break;
      }
    }
  }
  right = rightmostValid;

  // Expand up
  for (let ty = seedY; ty >= Math.max(0, seedY - 80); ty--) {
    let coloredCount = 0;
    const samples = Math.min(7, right - left + 1);
    const step = Math.max(1, Math.floor((right - left) / samples));
    
    for (let i = 0; i <= samples; i++) {
      const testX = Math.min(right, left + i * step);
      if (isButtonPixel(pixels, width, height, testX, ty, refAvg)) {
        coloredCount++;
      }
    }
    
    if (coloredCount >= samples * 0.5) {
      top = ty;
    } else {
      break;
    }
  }

  // Expand down
  for (let ty = seedY; ty < Math.min(height, seedY + 80); ty++) {
    let coloredCount = 0;
    const samples = Math.min(7, right - left + 1);
    const step = Math.max(1, Math.floor((right - left) / samples));
    
    for (let i = 0; i <= samples; i++) {
      const testX = Math.min(right, left + i * step);
      if (isButtonPixel(pixels, width, height, testX, ty, refAvg)) {
        coloredCount++;
      }
    }
    
    if (coloredCount >= samples * 0.5) {
      bottom = ty;
    } else {
      break;
    }
  }

  const w = right - left + 1;
  const h = bottom - top + 1;

  if (w < 180 || h < 24 || w > width * 0.95 || h > 100) {
    return null;
  }

  return {
    x: left,
    y: top,
    width: w,
    height: h,
    confidence: 0.9,
    type: 'button',
    colorInfo: { uniformity: 0.9, avgBrightness: refAvg, isColored: true }
  };
};

const isButtonPixel = (pixels, width, height, x, y, refBrightness) => {
  if (x < 0 || x >= width || y < 0 || y >= height) return false;
  
  const idx = (y * width + x) * 4;
  const r = pixels[idx];
  const g = pixels[idx + 1];
  const b = pixels[idx + 2];
  const avg = (r + g + b) / 3;
  
  const isWhite = avg > 220;
  if (isWhite) return true;
  
  const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
  const isColored = colorDiff > 15 && avg >= 40 && avg <= 200;
  const isSimilarBrightness = Math.abs(avg - refBrightness) < 50;
  
  return isColored && isSimilarBrightness;
};

const expandWhiteInput = (pixels, width, height, x, y) => {
  let left = x, right = x, top = y, bottom = y;

  for (let tx = x; tx >= Math.max(0, x - 300); tx--) {
    const idx = (y * width + tx) * 4;
    const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
    if (brightness > 240) {
      left = tx;
    } else {
      break;
    }
  }

  for (let tx = x; tx < Math.min(width, x + 300); tx++) {
    const idx = (y * width + tx) * 4;
    const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
    if (brightness > 240) {
      right = tx;
    } else {
      break;
    }
  }

  for (let ty = y; ty >= Math.max(0, y - 50); ty--) {
    const midX = Math.floor((left + right) / 2);
    const idx = (ty * width + midX) * 4;
    const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
    if (brightness > 240) {
      top = ty;
    } else {
      break;
    }
  }

  for (let ty = y; ty < Math.min(height, y + 50); ty++) {
    const midX = Math.floor((left + right) / 2);
    const idx = (ty * width + midX) * 4;
    const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
    if (brightness > 240) {
      bottom = ty;
    } else {
      break;
    }
  }

  const w = right - left + 1;
  const h = bottom - top + 1;

  if (w < 150 || h < 20 || w > width * 0.95 || h > 100) {
    return null;
  }

  return {
    x: left,
    y: top,
    width: w,
    height: h,
    confidence: 0.85,
    type: 'text',
    colorInfo: { uniformity: 0.95, avgBrightness: 250, isColored: false }
  };
};

const expandColoredLink = (pixels, width, height, x, y) => {
  const idx = (y * width + x) * 4;
  const refR = pixels[idx];
  const refG = pixels[idx + 1];
  const refB = pixels[idx + 2];
  
  let left = x, right = x;
  const bandHeight = 3;

  for (let tx = x; tx >= Math.max(0, x - 300); tx--) {
    let hasColor = false;
    for (let dy = 0; dy < bandHeight; dy++) {
      const ty = y + dy;
      if (ty < height) {
        const testIdx = (ty * width + tx) * 4;
        const r = pixels[testIdx];
        const g = pixels[testIdx + 1];
        const b = pixels[testIdx + 2];
        const colorMatch = Math.abs(r - refR) < 40 && Math.abs(g - refG) < 40 && Math.abs(b - refB) < 40;
        if (colorMatch) hasColor = true;
      }
    }
    if (hasColor) {
      left = tx;
    } else {
      break;
    }
  }

  for (let tx = x; tx < Math.min(width, x + 300); tx++) {
    let hasColor = false;
    for (let dy = 0; dy < bandHeight; dy++) {
      const ty = y + dy;
      if (ty < height) {
        const testIdx = (ty * width + tx) * 4;
        const r = pixels[testIdx];
        const g = pixels[testIdx + 1];
        const b = pixels[testIdx + 2];
        const colorMatch = Math.abs(r - refR) < 40 && Math.abs(g - refG) < 40 && Math.abs(b - refB) < 40;
        if (colorMatch) hasColor = true;
      }
    }
    if (hasColor) {
      right = tx;
    } else {
      break;
    }
  }

  const w = right - left + 1;

  if (w < 80 || w > 400) {
    return null;
  }

  return {
    x: left,
    y: y - 5,
    width: w,
    height: 20,
    confidence: 0.75,
    type: 'link',
    colorInfo: { uniformity: 0.5, avgBrightness: 150, isColored: true }
  };
};

// Test cases
const testCases = [
  {
    name: 'SIGN IN button (blue pixel)',
    x: 285,
    y: 540,
    expectedType: 'button',
    expectedBounds: { x: 60, y: 505, width: 450, height: 60 },
    tolerance: 20
  },
  {
    name: 'Username field',
    x: 285,
    y: 260,
    expectedType: 'text',
    expectedBounds: { x: 60, y: 230, width: 450, height: 45 },
    tolerance: 20
  },
  {
    name: 'Empty background (should fail)',
    x: 50,
    y: 50,
    expectedType: null,
    expectedBounds: null,
    tolerance: 0
  }
];

async function runTests() {
  console.log('Loading login page image...\n');
  
  const imagePath = join(__dirname, 'fixtures', 'login-page.png');
  const image = await loadImage(imagePath);
  
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const pixels = imageData.data;
  
  console.log(`Image size: ${image.width}x${image.height}\n`);
  console.log('Running click detection tests (signin-detect-v2)...\n');
  console.log('='.repeat(80));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    console.log(`\nTest: ${test.name}`);
    console.log(`Click at: (${test.x}, ${test.y})`);
    
    const result = detectLocalRectangle(pixels, image.width, image.height, test.x, test.y);
    
    if (test.expectedType === null) {
      if (result === null) {
        console.log('✓ PASSED - Correctly returned null');
        passed++;
      } else {
        console.log(`✗ FAILED - Expected null, got ${JSON.stringify(result)}`);
        failed++;
      }
    } else {
      if (!result) {
        console.log(`✗ FAILED - Expected ${test.expectedType}, got null`);
        failed++;
        continue;
      }
      
      const typeMatch = result.type === test.expectedType;
      const xMatch = Math.abs(result.x - test.expectedBounds.x) <= test.tolerance;
      const yMatch = Math.abs(result.y - test.expectedBounds.y) <= test.tolerance;
      const wMatch = Math.abs(result.width - test.expectedBounds.width) <= test.tolerance;
      const hMatch = Math.abs(result.height - test.expectedBounds.height) <= test.tolerance;
      
      console.log(`  Type: ${result.type} ${typeMatch ? '✓' : '✗'} (expected ${test.expectedType})`);
      console.log(`  Position: (${result.x}, ${result.y}) ${xMatch && yMatch ? '✓' : '✗'} (expected ~${test.expectedBounds.x}, ${test.expectedBounds.y})`);
      console.log(`  Size: ${result.width}x${result.height} ${wMatch && hMatch ? '✓' : '✗'} (expected ~${test.expectedBounds.width}x${test.expectedBounds.height})`);
      
      if (typeMatch && xMatch && yMatch && wMatch && hMatch) {
        console.log('✓ PASSED');
        passed++;
      } else {
        console.log('✗ FAILED - Bounds or type mismatch');
        failed++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\nTest Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
  
  if (failed === 0) {
    console.log('\n✓ All tests passed! Click detection (signin-detect-v2) is working.');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed. Please review the implementation.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
