import { createCanvas, loadImage } from 'canvas';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test pixel sampling first
async function debugPixels() {
  console.log('Loading login page image for pixel analysis...\n');
  
  const imagePath = join(__dirname, 'fixtures', 'login-page.png');
  const image = await loadImage(imagePath);
  
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const pixels = imageData.data;
  
  console.log(`Image size: ${image.width}x${image.height}\n`);
  
  // Sample key locations
  const samples = [
    { name: 'SIGN IN center (blue)', x: 287, y: 535 },
    { name: 'SIGN IN "S" letter (white)', x: 245, y: 540 },
    { name: 'Username field center', x: 200, y: 265 },
    { name: 'Forgot password link', x: 150, y: 465 },
  ];
  
  for (const sample of samples) {
    const idx = (sample.y * image.width + sample.x) * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const a = pixels[idx + 3];
    const brightness = (r + g + b) / 3;
    const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
    
    console.log(`${sample.name} at (${sample.x}, ${sample.y}):`);
    console.log(`  RGBA: (${r}, ${g}, ${b}, ${a})`);
    console.log(`  Brightness: ${brightness.toFixed(1)}`);
    console.log(`  Color diff: ${colorDiff.toFixed(1)}`);
    console.log(`  Is colored (diff > 20): ${colorDiff > 20}`);
    console.log(`  Is medium bright (80-200): ${brightness > 80 && brightness < 200}`);
    console.log(`  Is bright (> 240): ${brightness > 240}`);
    console.log('');
  }
}

debugPixels().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
