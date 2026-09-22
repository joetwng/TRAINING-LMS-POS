const { createCanvas, loadImage } = require('canvas');

async function quickTest() {
  const image = await loadImage('fixtures/login-page.png');
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Sample some pixels to see colors
  const samples = [
    {name: 'Username field interior', x: 100, y: 260},
    {name: 'Password field interior', x: 100, y: 385},
    {name: 'SIGN IN button interior', x: 280, y: 537},
    {name: 'FORGOT PASSWORD text', x: 62, y: 453},
  ];
  
  console.log('Pixel samples from login-page.png:\n');
  samples.forEach(s => {
    const idx = (s.y * canvas.width + s.x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const gray = (r + g + b) / 3;
    console.log(`${s.name} (${s.x},${s.y}):`);
    console.log(`  RGB: (${r}, ${g}, ${b})`);
    console.log(`  Gray: ${gray.toFixed(0)}`);
    console.log(`  Colored: ${Math.max(Math.abs(r-g), Math.abs(r-b), Math.abs(g-b)) > 20}\n`);
  });
}

quickTest().catch(console.error);
