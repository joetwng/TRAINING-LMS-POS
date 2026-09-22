import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

const expandColoredButton = (pixels, width, height, x, y, fromWhiteText = false) => {
  console.log(`\nExpanding from (${x}, ${y}), fromWhiteText=${fromWhiteText}`);
  
  let seedX = x;
  let seedY = y;

  if (fromWhiteText) {
    console.log('  Searching for colored seed pixel...');
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
              console.log(`  Found IDEAL colored seed at (${seedX}, ${seedY}), RGB=(${r},${g},${b}), avg=${avg.toFixed(0)}, colorDiff=${colorDiff.toFixed(0)}`);
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
      const idx = (seedY * width + seedX) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const avg = (r + g + b) / 3;
      console.log(`  Using BEST colored seed at (${seedX}, ${seedY}), RGB=(${r},${g},${b}), avg=${avg.toFixed(0)}, score=${bestScore.toFixed(1)}`);
    }
    
    if (!found) {
      console.log('  FAILED: No colored seed found');
      return null;
    }
  }

  const seedIdx = (seedY * width + seedX) * 4;
  const refR = pixels[seedIdx];
  const refG = pixels[seedIdx + 1];
  const refB = pixels[seedIdx + 2];
  const refAvg = (refR + refG + refB) / 3;
  console.log(`  Seed RGB=(${refR},${refG},${refB}), refAvg=${refAvg.toFixed(0)}`);

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
  console.log(`  Left expand: ${left}`);

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
  console.log(`  Right expand: ${right}`);
  console.log(`  Width: ${right - left + 1}`);

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
  console.log(`  Top expand: ${top}`);

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
  console.log(`  Bottom expand: ${bottom}`);

  const w = right - left + 1;
  const h = bottom - top + 1;
  console.log(`  Final bounds: (${left}, ${top}) ${w}x${h}`);
  console.log(`  Validation: w=${w} (need 180-${Math.floor(width*0.95)}), h=${h} (need 24-100)`);

  if (w < 180 || h < 24 || w > width * 0.95 || h > 100) {
    console.log(`  FAILED validation`);
    return null;
  }

  console.log(`  SUCCESS!`);
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

async function debugButtonExpand() {
  const imagePath = join(__dirname, 'fixtures', 'login-page.png');
  const image = await loadImage(imagePath);
  
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const pixels = imageData.data;
  
  console.log(`Image size: ${image.width}x${image.height}`);
  console.log('Expected button bounds: x=60-510 (width 450), y=505-565 (height 60)');
  
  const result = expandColoredButton(pixels, image.width, image.height, 285, 540, true);
  console.log('\nFinal result:', result);
}

debugButtonExpand().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
