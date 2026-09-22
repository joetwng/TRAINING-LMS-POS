#!/usr/bin/env node

/**
 * Node.js test for detector using canvas
 * 
 * Usage:
 *   node scripts/test-detector-node.cjs fixtures/login-page.png
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Expected results for login page
const EXPECTED = {
  minTotal: 3,
  maxTotal: 5,
  minInputs: 2,
  maxInputs: 3,
  buttons: 1,
  links: 1,
  forbiddenTypes: ['radio', 'checkbox', 'select'],
};

// Inline detector logic (simplified for Node.js)
function detectComponents(image) {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  const edges = detectEdges(data, width, height);
  const rectangles = findFormComponents(edges, data, width, height);
  
  return rectangles.map((rect, index) => ({
    type: inferType(rect, index, rectangles.length),
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    confidence: rect.confidence,
  }));
}

function detectEdges(data, width, height) {
  const edges = Array(height).fill(null).map(() => Array(width).fill(false));
  const threshold = 30;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      const neighbors = [
        (data[((y - 1) * width + x) * 4] + data[((y - 1) * width + x) * 4 + 1] + data[((y - 1) * width + x) * 4 + 2]) / 3,
        (data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2]) / 3,
        (data[(y * width + (x - 1)) * 4] + data[(y * width + (x - 1)) * 4 + 1] + data[(y * width + (x - 1)) * 4 + 2]) / 3,
        (data[(y * width + (x + 1)) * 4] + data[(y * width + (x + 1)) * 4 + 1] + data[(y * width + (x + 1)) * 4 + 2]) / 3,
      ];

      const maxDiff = Math.max(...neighbors.map(n => Math.abs(gray - n)));
      if (maxDiff > threshold) {
        edges[y][x] = true;
      }
    }
  }

  return edges;
}

function findFormComponents(edges, pixels, width, height) {
  const rectangles = [];
  
  const minWidth = 100;
  const minHeight = 30;
  const maxWidth = width * 0.9;
  const maxHeight = height * 0.15;
  
  const horizontalRuns = [];
  
  for (let y = 0; y < height; y++) {
    let runStart = -1;
    let runLength = 0;
    
    for (let x = 0; x < width; x++) {
      if (edges[y][x]) {
        if (runStart === -1) {
          runStart = x;
          runLength = 1;
        } else {
          runLength++;
        }
      } else {
        if (runLength >= minWidth * 0.6) {
          horizontalRuns.push({y, x1: runStart, x2: runStart + runLength});
        }
        runStart = -1;
        runLength = 0;
      }
    }
    if (runLength >= minWidth * 0.6) {
      horizontalRuns.push({y, x1: runStart, x2: runStart + runLength});
    }
  }
  
  for (let i = 0; i < horizontalRuns.length; i++) {
    const top = horizontalRuns[i];
    
    for (let j = i + 1; j < horizontalRuns.length; j++) {
      const bottom = horizontalRuns[j];
      const h = bottom.y - top.y;
      
      if (h < minHeight || h > maxHeight) continue;
      
      const x1 = Math.max(top.x1, bottom.x1);
      const x2 = Math.min(top.x2, bottom.x2);
      const w = x2 - x1;
      
      if (w < minWidth || w > maxWidth) continue;
      
      const leftEdgeScore = scoreVerticalEdge(edges, x1, top.y, h);
      const rightEdgeScore = scoreVerticalEdge(edges, x2, top.y, h);
      
      if (leftEdgeScore > 0.3 && rightEdgeScore > 0.3) {
        const confidence = (leftEdgeScore + rightEdgeScore) / 2;
        rectangles.push({
          x: x1,
          y: top.y,
          width: w,
          height: h,
          confidence
        });
      }
    }
  }
  
  return filterRectangles(rectangles, pixels, width, height);
}

function scoreVerticalEdge(edges, x, y, height) {
  let edgeCount = 0;
  const samples = Math.min(height, 50);
  const step = Math.max(1, Math.floor(height / samples));
  
  for (let i = 0; i < height; i += step) {
    const py = y + i;
    if (py >= 0 && py < edges.length && x >= 0 && x < edges[0].length) {
      if (edges[py][x] || (x > 0 && edges[py][x-1]) || (x < edges[0].length-1 && edges[py][x+1])) {
        edgeCount++;
      }
    }
  }
  
  return edgeCount / (height / step);
}

function filterRectangles(rectangles, pixels, width, height) {
  const filtered = rectangles.filter(rect => {
    if (rect.width < 80 || rect.height < 25) return false;
    if (rect.width > width * 0.9 || rect.height > height * 0.3) return false;
    
    const uniformity = measureUniformity(pixels, width, rect);
    if (uniformity < 0.5) return false;
    
    return true;
  });
  
  const sorted = filtered.sort((a, b) => {
    const scoreA = a.confidence * Math.sqrt(a.width * a.height);
    const scoreB = b.confidence * Math.sqrt(b.width * b.height);
    return scoreB - scoreA;
  });
  
  const final = [];
  
  for (const rect of sorted) {
    const overlaps = final.some(existing => {
      const overlapArea = getOverlapArea(rect, existing);
      const rectArea = rect.width * rect.height;
      const existingArea = existing.width * existing.height;
      return overlapArea > Math.min(rectArea, existingArea) * 0.5;
    });
    
    if (!overlaps && final.length < 6) {
      final.push(rect);
    }
  }
  
  return final;
}

function measureUniformity(pixels, width, rect) {
  const samples = 20;
  const colors = [];
  
  const stepX = Math.max(1, Math.floor(rect.width / samples));
  const stepY = Math.max(1, Math.floor(rect.height / samples));
  
  for (let dy = 0; dy < rect.height; dy += stepY) {
    for (let dx = 0; dx < rect.width; dx += stepX) {
      const x = rect.x + dx;
      const y = rect.y + dy;
      if (x >= 0 && x < width && y >= 0 && y < pixels.length / width / 4) {
        const idx = (y * width + x) * 4;
        const gray = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
        colors.push(gray);
      }
    }
  }
  
  if (colors.length === 0) return 0;
  
  const mean = colors.reduce((a, b) => a + b, 0) / colors.length;
  const variance = colors.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / colors.length;
  const stdDev = Math.sqrt(variance);
  
  return Math.max(0, 1 - (stdDev / 80));
}

function getOverlapArea(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}

function inferType(rect, index, total) {
  const aspectRatio = rect.width / rect.height;
  const area = rect.width * rect.height;
  const height = rect.height;
  
  if (height >= 45 && height <= 100 && aspectRatio > 3 && area > 15000) {
    return 'button';
  }
  
  if (height < 45 && aspectRatio > 4 && area < 12000) {
    return 'link';
  }
  
  if (height >= 30 && height <= 70 && aspectRatio > 3 && aspectRatio < 10) {
    return 'text';
  }
  
  return 'text';
}

function validateResults(detected) {
  const errors = [];
  const warnings = [];
  
  // Count types
  const typeCounts = {
    text: 0,
    password: 0,
    button: 0,
    link: 0,
    radio: 0,
    checkbox: 0,
    select: 0,
  };
  
  detected.forEach(obj => {
    typeCounts[obj.type] = (typeCounts[obj.type] || 0) + 1;
  });
  
  const inputCount = typeCounts.text + typeCounts.password;
  
  // Validate total count
  if (detected.length < EXPECTED.minTotal || detected.length > EXPECTED.maxTotal) {
    errors.push(`Total count ${detected.length} not in range [${EXPECTED.minTotal}, ${EXPECTED.maxTotal}]`);
  }
  
  // Validate input count
  if (inputCount < EXPECTED.minInputs || inputCount > EXPECTED.maxInputs) {
    errors.push(`Input count ${inputCount} not in range [${EXPECTED.minInputs}, ${EXPECTED.maxInputs}]`);
  }
  
  // Validate button count
  if (typeCounts.button !== EXPECTED.buttons) {
    errors.push(`Expected ${EXPECTED.buttons} button(s), found ${typeCounts.button}`);
  }
  
  // Validate link count
  if (typeCounts.link !== EXPECTED.links) {
    errors.push(`Expected ${EXPECTED.links} link(s), found ${typeCounts.link}`);
  }
  
  // Check for forbidden types
  EXPECTED.forbiddenTypes.forEach(type => {
    if (typeCounts[type] > 0) {
      errors.push(`Found forbidden type '${type}' (count: ${typeCounts[type]})`);
    }
  });
  
  return { valid: errors.length === 0, errors, warnings, typeCounts, inputCount };
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Login Page Detector Test');
    console.log('========================\n');
    console.log('Expected detection for login-page.png:');
    console.log(`  - Total objects: ${EXPECTED.minTotal}-${EXPECTED.maxTotal}`);
    console.log(`  - Input fields: ${EXPECTED.minInputs}-${EXPECTED.maxInputs}`);
    console.log(`  - Buttons: ${EXPECTED.buttons}`);
    console.log(`  - Links: ${EXPECTED.links}`);
    console.log(`  - Forbidden: ${EXPECTED.forbiddenTypes.join(', ')}`);
    console.log('\nUsage:');
    console.log('  node scripts/test-detector-node.cjs <image-path>');
    console.log('\nExample:');
    console.log('  node scripts/test-detector-node.cjs fixtures/login-page.png');
    process.exit(0);
  }
  
  const imagePath = args[0];
  
  if (!fs.existsSync(imagePath)) {
    console.error(`Error: Image not found: ${imagePath}`);
    process.exit(1);
  }
  
  console.log(`Testing detector on: ${imagePath}\n`);
  
  try {
    const image = await loadImage(imagePath);
    console.log(`Image size: ${image.width}×${image.height}`);
    
    const detected = detectComponents(image);
    
    console.log(`\nDetected ${detected.length} objects:\n`);
    detected.forEach((obj, i) => {
      console.log(`${i + 1}. ${obj.type.toUpperCase()}`);
      console.log(`   Position: (${obj.x}, ${obj.y})`);
      console.log(`   Size: ${obj.width}×${obj.height}`);
      console.log(`   Confidence: ${obj.confidence.toFixed(2)}\n`);
    });
    
    const result = validateResults(detected);
    
    console.log('Type Summary:');
    console.log(`  Input fields (text/password): ${result.inputCount}`);
    console.log(`  Buttons: ${result.typeCounts.button}`);
    console.log(`  Links: ${result.typeCounts.link}`);
    if (result.typeCounts.radio > 0) console.log(`  Radio: ${result.typeCounts.radio}`);
    if (result.typeCounts.checkbox > 0) console.log(`  Checkbox: ${result.typeCounts.checkbox}`);
    if (result.typeCounts.select > 0) console.log(`  Select: ${result.typeCounts.select}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ VALIDATION FAILED:\n');
      result.errors.forEach(err => console.log(`  - ${err}`));
      process.exit(1);
    } else {
      console.log('\n✅ VALIDATION PASSED');
      console.log('   All checks passed for login page detection.');
      process.exit(0);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
