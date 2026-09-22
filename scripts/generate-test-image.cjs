#!/usr/bin/env node

/**
 * Generate a test login page image for detector validation
 */

const fs = require('fs');
const { createCanvas } = require('canvas');

const width = 573;
const height = 649;

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, width, height);

// Border
ctx.strokeStyle = '#cccccc';
ctx.lineWidth = 2;
ctx.strokeRect(1, 1, width - 2, height - 2);

// Title (should not be detected)
ctx.fillStyle = '#333333';
ctx.font = 'bold 28px Arial';
ctx.fillText('Login to your account', 61, 85);

// Blue underline
ctx.fillStyle = '#3B7FC4';
ctx.fillRect(61, 95, 80, 4);

// Subtitle (should not be detected)
ctx.fillStyle = '#999999';
ctx.font = '16px Arial';
ctx.fillText('Sign in with your username and password', 61, 140);

// Username label (should not be detected)
ctx.fillStyle = '#666666';
ctx.font = '14px Arial';
ctx.fillText('Username *', 61, 195);

// Username input field - should be detected as INPUT
ctx.strokeStyle = '#cccccc';
ctx.lineWidth = 2;
ctx.fillStyle = '#ffffff';
ctx.fillRect(61, 210, 450, 55);
ctx.strokeRect(61, 210, 450, 55);

// Username placeholder
ctx.fillStyle = '#cccccc';
ctx.font = '16px Arial';
ctx.fillText('Username', 76, 242);

// Password label (should not be detected)
ctx.fillStyle = '#666666';
ctx.font = '14px Arial';
ctx.fillText('Password *', 61, 305);

// Password input field - should be detected as INPUT
ctx.strokeStyle = '#cccccc';
ctx.lineWidth = 2;
ctx.fillStyle = '#ffffff';
ctx.fillRect(61, 320, 450, 55);
ctx.strokeRect(61, 320, 450, 55);

// Password placeholder
ctx.fillStyle = '#cccccc';
ctx.font = '16px Arial';
ctx.fillText('Password', 76, 352);

// "FORGOT YOUR PASSWORD?" link - should be detected as LINK
ctx.fillStyle = '#3B7FC4';
ctx.font = '14px Arial';
ctx.fillText('FORGOT YOUR PASSWORD?', 61, 440);

// SIGN IN button - should be detected as BUTTON
ctx.fillStyle = '#3B7FC4';
ctx.fillRect(61, 460, 450, 65);

// SIGN IN text
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 18px Arial';
ctx.textAlign = 'center';
ctx.fillText('SIGN IN', 286, 497);

// Save
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('fixtures/login-page-generated.png', buffer);

console.log('Generated fixtures/login-page-generated.png');
console.log(`Size: ${width}×${height}`);
console.log('\nExpected detections:');
console.log('1. Username field (61, 210, 450×55) → INPUT');
console.log('2. Password field (61, 320, 450×55) → INPUT');
console.log('3. FORGOT YOUR PASSWORD? (~61, ~430, ~200×20) → LINK');
console.log('4. SIGN IN button (61, 460, 450×65) → BUTTON');
