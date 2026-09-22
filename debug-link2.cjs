const { createCanvas, loadImage } = require('canvas');

async function debugLink2() {
  const image = await loadImage('fixtures/login-page.png');
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  console.log('Scanning for colored bands (link detection logic):\n');
  
  const links = [];
  for (let y = Math.floor(height * 0.3); y < Math.floor(height * 0.8); y += 3) {
    const bandPixels = [];
    
    for (let dy = 0; dy < 3; dy++) {
      for (let x = Math.floor(width * 0.1); x < Math.floor(width * 0.9); x++) {
        const idx = ((y + dy) * width + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        
        const isColored = (
          (Math.abs(r - g) > 8 || Math.abs(r - b) > 8 || Math.abs(g - b) > 8) &&
          (r + g + b) < 720 &&
          (r + g + b) > 40
        );
        
        if (isColored) {
          bandPixels.push(x);
        }
      }
    }
    
    if (bandPixels.length > 30) {
      const minX = Math.min(...bandPixels);
      const maxX = Math.max(...bandPixels);
      const w = maxX - minX + 1;
      
      console.log(`y=${y}: Found ${bandPixels.length} colored pixels, width=${w} (${minX} to ${maxX})`);
      
      if (w >= 80 && w <= 350) {
        links.push({x: minX, y: y - 5, width: w, height: 20});
        console.log(`  -> Would create link rectangle!`);
      } else {
        console.log(`  -> Width ${w} out of range [80, 350]`);
      }
    }
  }
  
  console.log(`\nTotal link candidates found: ${links.length}`);
  links.forEach((link, i) => {
    console.log(`${i + 1}. x=${link.x}, y=${link.y}, w=${link.width}, h=${link.height}`);
  });
}

debugLink2().catch(console.error);
