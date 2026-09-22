#!/usr/bin/env node
/**
 * Create realistic login matching the actual screenshot
 * Key differences from synthetic: softer borders, realistic shadows, proper anti-aliasing
 */

const fs = require('fs');
const { createCanvas } = require('canvas');

const width = 573;
const height = 649;

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// White background
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, width, height);

// Very subtle outer shadow/border
ctx.strokeStyle = '#e0e0e0';
ctx.lineWidth = 1;
ctx.strokeRect(0, 0, width, height);

// Title "Login to your account" - dark gray
ctx.fillStyle = '#37474F';
ctx.font = 'bold 30px Arial';
ctx.fillText('Login to your account', 61, 88);

// Blue underline
ctx.fillStyle = '#5B9BD5';
ctx.fillRect(61, 98, 82, 3);

// Subtitle "Sign in with your username and password" - light gray
ctx.fillStyle = '#9E9E9E';
ctx.font = '15px Arial';
ctx.fillText('Sign in with your username and password', 61, 155);

// "Username *" label - dark gray
ctx.fillStyle = '#616161';
ctx.font = '14px Arial';
ctx.fillText('Username ', 61, 209);
ctx.fillStyle = '#D32F2F';
ctx.fillText('*', 132, 209);

// Username input - white with very soft gray border
ctx.fillStyle = '#FFFFFF';
const input1 = {x: 61, y: 232, w: 449, h: 62};
ctx.fillRect(input1.x, input1.y, input1.w, input1.h);

// Soft border for input
ctx.strokeStyle = '#DADCE0';
ctx.lineWidth = 1.5;
ctx.strokeRect(input1.x, input1.y, input1.w, input1.h);

// Placeholder
ctx.fillStyle = '#BDBDBD';
ctx.font = '15px Arial';
ctx.fillText('Username', 77, 267);

// "Password *" label
ctx.fillStyle = '#616161';
ctx.font = '14px Arial';
ctx.fillText('Password ', 61, 331);
ctx.fillStyle = '#D32F2F';
ctx.fillText('*', 130, 331);

// Password input - white with soft gray border
ctx.fillStyle = '#FFFFFF';
const input2 = {x: 61, y: 354, w: 449, h: 62};
ctx.fillRect(input2.x, input2.y, input2.w, input2.h);

// Soft border
ctx.strokeStyle = '#DADCE0';
ctx.lineWidth = 1.5;
ctx.strokeRect(input2.x, input2.y, input2.w, input2.h);

// Placeholder
ctx.fillStyle = '#BDBDBD';
ctx.font = '15px Arial';
ctx.fillText('Password', 77, 389);

// "FORGOT YOUR PASSWORD?" link - blue
ctx.fillStyle = '#5B9BD5';
ctx.font = '13px Arial';
ctx.fillText('FORGOT YOUR PASSWORD?', 61, 462);

// SIGN IN button - solid blue
const btn = {x: 61, y: 507, w: 449, h: 61};
ctx.fillStyle = '#5B9BD5';
ctx.fillRect(btn.x, btn.y, btn.w, btn.h);

// Button text
ctx.fillStyle = '#FFFFFF';
ctx.font = 'bold 16px Arial';
ctx.textAlign = 'center';
ctx.fillText('SIGN IN', btn.x + btn.w/2, btn.y + 38);

// Save
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('fixtures/login-page.png', buffer);

console.log('Created realistic login-page.png');
console.log('Dimensions: 573×649');
console.log('Key features:');
console.log('- Soft borders (#DADCE0)');
console.log('- Realistic colors');
console.log('- Input: (61,232) 449×62');
console.log('- Input: (61,354) 449×62');
console.log('- Link: ~(61,462)');
console.log('- Button: (61,507) 449×61');
