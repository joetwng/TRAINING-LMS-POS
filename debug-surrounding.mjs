import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const checkSurroundingColored = (pixels, width, height, x, y) => {
  let coloredCount = 0;
  let totalChecked = 0;

  console.log(`  Checking surrounding pixels around (${x}, ${y}):`);
  
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

  const ratio = coloredCount / totalChecked;
  console.log(`  Colored pixels: ${coloredCount} / ${totalChecked} = ${ratio.toFixed(3)}`);
  console.log(`  Passes threshold (> 0.25): ${ratio > 0.25}`);
  
  return ratio > 0.25;
};

async function debugSurrounding() {
  const imagePath = join(__dirname, 'fixtures', 'login-page.png');
  const image = await loadImage(imagePath);
  
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const pixels = imageData.data;
  
  console.log('Testing surrounding colored check at (285, 540):\n');
  const result = checkSurroundingColored(pixels, image.width, image.height, 285, 540);
  console.log(`\nResult: ${result}`);
}

debugSurrounding().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
