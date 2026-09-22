import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function sampleButtonArea() {
  console.log('Sampling button area...\n');
  
  const imagePath = join(__dirname, 'fixtures', 'login-page.png');
  const image = await loadImage(imagePath);
  
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const pixels = imageData.data;
  
  // Sample a grid in the button area (around y=505-565, x=60-510)
  console.log('Button area samples (expected button at x:60-510, y:505-565):');
  console.log('');
  
  for (let y = 510; y <= 560; y += 10) {
    for (let x = 100; x <= 450; x += 70) {
      const idx = (y * image.width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const brightness = (r + g + b) / 3;
      const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
      
      console.log(`(${x}, ${y}): RGB(${r},${g},${b}) bright=${brightness.toFixed(0)} diff=${colorDiff.toFixed(0)}`);
    }
  }
}

sampleButtonArea().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
