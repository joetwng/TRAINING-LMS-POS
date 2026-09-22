const { createCanvas, loadImage } = require('canvas');

async function debugLink() {
  const image = await loadImage('fixtures/login-page.png');
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  console.log('Scanning for colored text (link) at y=455 (FORGOT YOUR PASSWORD):\n');
  
  // Scan the line where the link should be
  const y = 453;
  let coloredPixels = 0;
  let runStart = -1;
  let longestRun = 0;
  let currentRun = 0;
  
  for (let x = 50; x < 400; x++) {
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    
    const isColored = (
      (Math.abs(r - g) > 15 || Math.abs(r - b) > 15 || Math.abs(g - b) > 15) &&
      (r + g + b) < 650 &&
      (r + g + b) > 50
    );
    
    if (isColored) {
      coloredPixels++;
      if (runStart === -1) {
        runStart = x;
      }
      currentRun++;
      longestRun = Math.max(longestRun, currentRun);
    } else {
      if (currentRun > 0 && x % 20 === 0) {
        console.log(`Run from ${runStart} to ${x-1}: length ${currentRun}`);
      }
      runStart = -1;
      currentRun = 0;
    }
    
    if (x % 50 === 0) {
      console.log(`x=${x}: RGB(${r},${g},${b}) colored=${isColored}`);
    }
  }
  
  console.log(`\nTotal colored pixels on line y=${y}: ${coloredPixels}`);
  console.log(`Longest run: ${longestRun} pixels`);
  
  // Check multiple scan lines
  console.log('\nScanning multiple lines around y=445-465:');
  for (let testY = 445; testY <= 465; testY += 5) {
    let count = 0;
    for (let x = 50; x < 300; x++) {
      const idx = (testY * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      const isColored = (
        (Math.abs(r - g) > 15 || Math.abs(r - b) > 15 || Math.abs(g - b) > 15) &&
        (r + g + b) < 650 &&
        (r + g + b) > 50
      );
      
      if (isColored) count++;
    }
    console.log(`y=${testY}: ${count} colored pixels`);
  }
}

debugLink().catch(console.error);
