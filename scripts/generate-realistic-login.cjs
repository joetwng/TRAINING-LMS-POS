#!/usr/bin/env node

/**
 * Generate a realistic login page matching user's description
 * Based on the attached screenshots showing a 573×649 login form
 */

const fs = require('fs');
const { createCanvas } = require('canvas');

const width = 573;
const height = 649;

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Background - light gray
ctx.fillStyle = '#f5f5f5';
ctx.fillRect(0, 0, width, height);

// White card in center
const cardX = 0;
const cardY = 0;
const cardW = width;
const cardH = height;
ctx.fillStyle = '#ffffff';
ctx.fillRect(cardX, cardY, cardW, cardH);

// Add subtle shadow/border
ctx.strokeStyle = '#dddddd';
ctx.lineWidth = 1;
ctx.strokeRect(cardX, cardY, cardW, cardH);

// Title "Login to your account"
ctx.fillStyle = '#2c3e50';
ctx.font = 'bold 32px Arial';
ctx.fillText('Login to your account', 61, 90);

// Blue underline under "Login"
ctx.fillStyle = '#4A90E2';
ctx.fillRect(61, 100, 90, 3);

// Subtitle "Sign in with your username and password"
ctx.fillStyle = '#95a5a6';
ctx.font = '16px Arial';
ctx.fillText('Sign in with your username and password', 61, 160);

// "Username *" label  
ctx.fillStyle = '#555';
ctx.font = '14px Arial';
ctx.fillText('Username ', 61, 210);
ctx.fillStyle = '#e74c3c';
ctx.fillText('*', 135, 210);

// Username input field - white with light gray border
ctx.fillStyle = '#ffffff';
ctx.fillRect(41, 230, 490, 65);
ctx.strokeStyle = '#d0d0d0';
ctx.lineWidth = 2;
ctx.strokeRect(41, 230, 490, 65);

// Placeholder text
ctx.fillStyle = '#bbb';
ctx.font = '16px Arial';
ctx.fillText('Username', 62, 267);

// "Password *" label
ctx.fillStyle = '#555';
ctx.font = '14px Arial';
ctx.fillText('Password ', 61, 335);
ctx.fillStyle = '#e74c3c';
ctx.fillText('*', 133, 335);

// Password input field
ctx.fillStyle = '#ffffff';
ctx.fillRect(41, 355, 490, 65);
ctx.strokeStyle = '#d0d0d0';
ctx.lineWidth = 2;
ctx.strokeRect(41, 355, 490, 65);

// Placeholder text
ctx.fillStyle = '#bbb';
ctx.font = '16px Arial';
ctx.fillText('Password', 62, 392);

// "FORGOT YOUR PASSWORD?" link - blue text
ctx.fillStyle = '#4A90E2';
ctx.font = '14px Arial';
ctx.fillText('FORGOT YOUR PASSWORD?', 61, 455);

// SIGN IN button - solid blue
const buttonX = 41;
const buttonY = 505;
const buttonW = 490;
const buttonH = 65;

ctx.fillStyle = '#4A90E2';
ctx.fillRect(buttonX, buttonY, buttonW, buttonH);

// Button text - white
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 18px Arial';
ctx.textAlign = 'center';
ctx.fillText('SIGN IN', buttonX + buttonW / 2, buttonY + 42);

// Save
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('fixtures/login-page.png', buffer);

console.log('Generated fixtures/login-page.png');
console.log(`Size: ${width}×${height}`);
console.log('\nExpected detections:');
console.log('1. Username field (41, 230, 490×65) → INPUT/text');
console.log('2. Password field (41, 355, 490×65) → INPUT/text');
console.log('3. FORGOT YOUR PASSWORD? (61, ~445, ~210×20) → LINK');
console.log('4. SIGN IN button (41, 505, 490×65) → BUTTON');
console.log('\nThis should match the ground truth from the user.');
