const { createCanvas } = require('canvas');
const fs = require('fs');

// Test different border intensities
const tests = [
  {name: 'very-light', border: '#F0F0F0', text: 'Very light borders'},
  {name: 'ultra-light', border: '#F5F5F5', text: 'Ultra light borders'},
  {name: 'barely-visible', border: '#F8F8F8', text: 'Barely visible borders'},
];

tests.forEach(test => {
  const width = 573;
  const height = 649;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  // Input fields with test border color
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(61, 232, 449, 62);
  ctx.strokeStyle = test.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(61, 232, 449, 62);
  
  ctx.fillRect(61, 354, 449, 62);
  ctx.strokeRect(61, 354, 449, 62);
  
  // Button - solid blue
  ctx.fillStyle = '#5B9BD5';
  ctx.fillRect(61, 507, 449, 61);
  
  // Link text
  ctx.fillStyle = '#5B9BD5';
  ctx.font = '13px Arial';
  ctx.fillText('FORGOT YOUR PASSWORD?', 61, 462);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`fixtures/test-${test.name}.png`, buffer);
  console.log(`Created test-${test.name}.png with border ${test.border}`);
});

console.log('\nTest these files to find when detection breaks');
