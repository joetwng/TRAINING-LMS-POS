import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkEdge() {
  const imagePath = join(__dirname, 'fixtures', 'login-page.png');
  const image = await loadImage(imagePath);
  
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const pixels = imageData.data;
  
  const y = 535;
  const refAvg = 119; // From blue button
  
  console.log('Checking horizontal line at y=535 (middle of button):');
  console.log('Expected button width: x=60 to x=510\n');
  
  for (let x = 240; x <= 260; x++) {
    const idx = (y * image.width + x) * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const avg = (r + g + b) / 3;
    const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
    
    const isWhite = avg > 240;
    const isColored = colorDiff > 15 && avg > 70 && avg < 210;
    const isSimilarBrightness = Math.abs(avg - refAvg) < 60;
    const passes = isWhite || (isColored && isSimilarBrightness);
    
    console.log(`x=${x}: RGB(${r},${g},${b}) avg=${avg.toFixed(0)} diff=${colorDiff.toFixed(0)} white=${isWhite} colored=${isColored} similar=${isSimilarBrightness} => ${passes ? 'PASS' : 'FAIL'}`);
  }
  
  console.log('\n\nChecking vertical line at x=240 (middle of button):');
  console.log('Expected button height: y=505 to y=565\n');
  
  for (let y = 500; y <= 570; y += 5) {
    const idx = (y * image.width + 240) * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const avg = (r + g + b) / 3;
    const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
    
    const isWhite = avg > 240;
    const isColored = colorDiff > 15 && avg > 70 && avg < 210;
    const isSimilarBrightness = Math.abs(avg - refAvg) < 60;
    const passes = isWhite || (isColored && isSimilarBrightness);
    
    console.log(`y=${y}: RGB(${r},${g},${b}) avg=${avg.toFixed(0)} diff=${colorDiff.toFixed(0)} white=${isWhite} colored=${isColored} similar=${isSimilarBrightness} => ${passes ? 'PASS' : 'FAIL'}`);
  }
}

checkEdge().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
