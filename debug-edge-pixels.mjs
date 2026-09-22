import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkEdgePixels() {
  const imagePath = join(__dirname, 'fixtures', 'login-page.png');
  const image = await loadImage(imagePath);
  
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const pixels = imageData.data;
  
  const y = 538;
  const refAvg = 135;
  
  console.log('Checking pixels at y=538 (button row):\n');
  console.log('Reference brightness (button): 135\n');
  
  for (const x of [0, 10, 50, 60, 250, 500, 510, 560, 572]) {
    const idx = (y * image.width + x) * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const avg = (r + g + b) / 3;
    const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
    
    const isWhite = avg > 220;
    const isColored = colorDiff > 15 && avg >= 40 && avg <= 200;
    const isSimilarBrightness = Math.abs(avg - refAvg) < 50;
    const passes = isWhite || (isColored && isSimilarBrightness);
    
    console.log(`x=${x}: RGB(${r},${g},${b}) avg=${avg.toFixed(0)} diff=${colorDiff.toFixed(0)} white=${isWhite} colored=${isColored} similar=${isSimilarBrightness} => ${passes ? 'PASS' : 'FAIL'}`);
  }
  
  console.log('\n\nExpected button x-range: 60-510');
}

checkEdgePixels().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
