import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isColoredPixel = (pixels, width, height, x, y, refBrightness) => {
  if (x < 0 || x >= width || y < 0 || y >= height) return false;
  
  const idx = (y * width + x) * 4;
  const r = pixels[idx];
  const g = pixels[idx + 1];
  const b = pixels[idx + 2];
  const avg = (r + g + b) / 3;
  
  const isWhite = avg > 240;
  const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
  const isColored = colorDiff > 15 && avg > 70 && avg < 210;
  const isSimilarBrightness = Math.abs(avg - refBrightness) < 60;
  
  return isWhite || (isColored && isSimilarBrightness);
};

const expandColoredButton = (pixels, width, height, x, y, fromWhiteText = false) => {
  console.log(`\n  Expanding button from (${x}, ${y}), fromWhiteText=${fromWhiteText}`);
  
  let seedX = x;
  let seedY = y;

  if (fromWhiteText) {
    let found = false;
    for (let radius = 1; radius <= 30 && !found; radius++) {
      for (let dy = -radius; dy <= radius && !found; dy++) {
        for (let dx = -radius; dx <= radius && !found; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const avg = (r + g + b) / 3;
            const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
            
            if (colorDiff > 20 && avg > 80 && avg < 200) {
              seedX = nx;
              seedY = ny;
              found = true;
            }
          }
        }
      }
    }
    
    if (!found) {
      console.log('  Failed: could not find colored seed from white text');
      return null;
    }
    console.log(`  Found colored seed at (${seedX}, ${seedY})`);
  }

  const seedIdx = (seedY * width + seedX) * 4;
  const refR = pixels[seedIdx];
  const refG = pixels[seedIdx + 1];
  const refB = pixels[seedIdx + 2];
  const refAvg = (refR + refG + refB) / 3;
  console.log(`  Seed pixel RGB(${refR}, ${refG}, ${refB}), avg=${refAvg.toFixed(0)}`);

  let left = seedX, right = seedX, top = seedY, bottom = seedY;

  for (let tx = seedX; tx >= Math.max(0, seedX - 500); tx--) {
    if (isColoredPixel(pixels, width, height, tx, seedY, refAvg)) {
      left = tx;
    } else {
      break;
    }
  }

  for (let tx = seedX; tx < Math.min(width, seedX + 500); tx++) {
    if (isColoredPixel(pixels, width, height, tx, seedY, refAvg)) {
      right = tx;
    } else {
      break;
    }
  }

  console.log(`  Horizontal bounds: left=${left}, right=${right}, width=${right - left + 1}`);

  for (let ty = seedY; ty >= Math.max(0, seedY - 100); ty--) {
    let coloredCount = 0;
    const samples = Math.min(5, right - left + 1);
    const step = Math.max(1, Math.floor((right - left) / samples));
    
    for (let i = 0; i <= samples; i++) {
      const testX = left + i * step;
      if (testX <= right && isColoredPixel(pixels, width, height, testX, ty, refAvg)) {
        coloredCount++;
      }
    }
    
    if (coloredCount >= samples * 0.4) {
      top = ty;
    } else {
      break;
    }
  }

  for (let ty = seedY; ty < Math.min(height, seedY + 100); ty++) {
    let coloredCount = 0;
    const samples = Math.min(5, right - left + 1);
    const step = Math.max(1, Math.floor((right - left) / samples));
    
    for (let i = 0; i <= samples; i++) {
      const testX = left + i * step;
      if (testX <= right && isColoredPixel(pixels, width, height, testX, ty, refAvg)) {
        coloredCount++;
      }
    }
    
    if (coloredCount >= samples * 0.4) {
      bottom = ty;
    } else {
      break;
    }
  }

  const w = right - left + 1;
  const h = bottom - top + 1;

  console.log(`  Expanded bounds: (${left}, ${top}) ${w}x${h}`);
  console.log(`  Validation: w=${w} (need 100-${Math.floor(width * 0.95)}), h=${h} (need 30-100)`);

  if (w < 100 || h < 30 || w > width * 0.95 || h > 100) {
    console.log(`  Failed validation!`);
    return null;
  }

  console.log(`  Success!`);
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

async function debugExpansion() {
  console.log('Loading image and testing button expansion...\n');
  
  const imagePath = join(__dirname, 'fixtures', 'login-page.png');
  const image = await loadImage(imagePath);
  
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const pixels = imageData.data;
  
  console.log(`Image size: ${image.width}x${image.height}`);
  console.log('Expected button: x=60-510 (width 450), y=505-565 (height 60)\n');
  
  // Test expansion from blue pixel
  console.log('Test 1: Click on blue pixel at (240, 535)');
  const result1 = expandColoredButton(pixels, image.width, image.height, 240, 535, false);
  console.log('Result:', result1);
  
  // Test expansion from another blue pixel
  console.log('\n\nTest 2: Click on blue pixel at (100, 540)');
  const result2 = expandColoredButton(pixels, image.width, image.height, 100, 540, false);
  console.log('Result:', result2);
}

debugExpansion().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
