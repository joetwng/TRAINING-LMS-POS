import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function debugButtonDetect() {
  const imagePath = join(__dirname, 'fixtures', 'login-page.png');
  const image = await loadImage(imagePath);
  
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const pixels = imageData.data;
  
  const x = 285;
  const y = 540;
  
  const idx = (y * image.width + x) * 4;
  const r = pixels[idx];
  const g = pixels[idx + 1];
  const b = pixels[idx + 2];
  const brightness = (r + g + b) / 3;
  const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
  
  console.log(`Pixel at (${x}, ${y}):`);
  console.log(`  RGB: (${r}, ${g}, ${b})`);
  console.log(`  Brightness: ${brightness.toFixed(1)}`);
  console.log(`  Color diff: ${colorDiff.toFixed(1)}`);
  console.log(`  isColored (diff > 10): ${colorDiff > 10}`);
  console.log(`  isMediumBright (40-220): ${brightness >= 40 && brightness <= 220}`);
  console.log(`  Should trigger button expand: ${colorDiff > 10 && brightness >= 40 && brightness <= 220}`);
}

debugButtonDetect().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
