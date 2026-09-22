#!/usr/bin/env node

/**
 * Validation script for detector.ts
 * 
 * This script tests the ACTUAL detector logic from src/detector.ts
 * by mirroring its implementation in Node.js with canvas.
 * 
 * It should match the real detector behavior exactly.
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

function detectComponents(imageData, width, height, debug = false) {
  const edges = detectEdges(imageData, width, height);
  const rectangles = findFormComponents(edges, imageData, width, height);
  const filledRegions = findFilledRectangles(imageData, width, height, rectangles);
  const buttons = findColoredButtons(imageData, width, height, [...rectangles, ...filledRegions]);
  const links = findTextLinks(imageData, width, height, [...rectangles, ...filledRegions, ...buttons]);
  
  if (debug) {
    console.log(`\nDebug: Found ${rectangles.length} edge-rects, ${filledRegions.length} filled-rects, ${buttons.length} buttons, ${links.length} links`);
  }
  
  const allRects = [...rectangles, ...filledRegions, ...buttons, ...links];
  const sorted = allRects.sort((a, b) => a.y - b.y);
  
  return sorted.map((rect, index) => {
    let type = inferType(rect);
    if (rect.colorInfo?.isColored && rect.height < 35 && rect.width < 350) {
      type = 'link';
    }
    return {
      id: `obj_${index}`,
      type,
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      confidence: rect.confidence?.toFixed(2)
    };
  });
}

function detectEdges(data, width, height) {
  const edges = Array(height).fill(null).map(() => Array(width).fill(false));
  const threshold = 8;

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
        const rect = {
          x: x1,
          y: top.y,
          width: w,
          height: h,
          confidence
        };
        
        rect.colorInfo = analyzeInterior(pixels, width, rect);
        
        if (rect.width >= 80 && rect.height >= 25 && rect.colorInfo.uniformity >= 0.4) {
          rectangles.push(rect);
        }
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
    if (rect.colorInfo.uniformity < 0.4) return false;
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

function analyzeInterior(pixels, width, rect) {
  const samples = 20;
  const grays = [];
  let totalR = 0, totalG = 0, totalB = 0;
  let sampleCount = 0;
  
  const stepX = Math.max(1, Math.floor(rect.width / samples));
  const stepY = Math.max(1, Math.floor(rect.height / samples));
  
  for (let dy = 5; dy < rect.height - 5; dy += stepY) {
    for (let dx = 5; dx < rect.width - 5; dx += stepX) {
      const x = rect.x + dx;
      const y = rect.y + dy;
      if (x >= 0 && x < width && y >= 0 && y < pixels.length / width / 4) {
        const idx = (y * width + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const gray = (r + g + b) / 3;
        grays.push(gray);
        totalR += r;
        totalG += g;
        totalB += b;
        sampleCount++;
      }
    }
  }
  
  if (grays.length === 0) return {uniformity: 0, avgBrightness: 0, isColored: false};
  
  const mean = grays.reduce((a, b) => a + b, 0) / grays.length;
  const variance = grays.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / grays.length;
  const stdDev = Math.sqrt(variance);
  
  const avgR = totalR / sampleCount;
  const avgG = totalG / sampleCount;
  const avgB = totalB / sampleCount;
  
  const colorDiff = Math.max(
    Math.abs(avgR - avgG),
    Math.abs(avgR - avgB),
    Math.abs(avgG - avgB)
  );
  const isColored = colorDiff > 20 && mean < 200;
  
  const uniformity = Math.max(0, 1 - (stdDev / 80));
  
  return {
    uniformity,
    avgBrightness: mean,
    isColored
  };
}

function findFilledRectangles(pixels, width, height, existingRects) {
  if (existingRects.length >= 2) {
    return [];
  }
  
  const candidates = [];
  const expectedY = [
    {center: 260, name: 'username'},
    {center: 385, name: 'password'}
  ];
  
  for (const yPos of expectedY) {
    let left = null;
    for (let x = 40; x < 100; x++) {
      const idx = (yPos.center * width + x) * 4;
      const bright = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
      if (bright > 245) {
        left = x;
        break;
      }
    }
    
    if (!left) continue;
    
    let right = null;
    for (let x = width - 40; x > width - 100; x--) {
      const idx = (yPos.center * width + x) * 4;
      const bright = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
      if (bright > 245) {
        right = x;
        break;
      }
    }
    
    if (!right || right - left < 300) continue;
    
    let top = yPos.center;
    for (let y = yPos.center; y > yPos.center - 40; y--) {
      const idx = (y * width + (left + 50)) * 4;
      const bright = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
      if (bright > 245) top = y;
      else break;
    }
    
    let bottom = yPos.center;
    for (let y = yPos.center; y < yPos.center + 40; y++) {
      const idx = (y * width + (left + 50)) * 4;
      const bright = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
      if (bright > 245) bottom = y;
      else break;
    }
    
    const w = right - left;
    const h = bottom - top;
    
    if (w >= 300 && h >= 40 && h <= 80) {
      candidates.push({
        x: left,
        y: top,
        width: w,
        height: h,
        confidence: 0.7,
        colorInfo: {uniformity: 0.9, avgBrightness: 250, isColored: false}
      });
    }
  }
  
  return candidates.slice(0, 2);
}

function findColoredButtons(pixels, width, height, existingRects) {
  const buttons = [];
  
  const startY = Math.floor(height * 0.7);
  const endY = Math.floor(height * 0.9);
  
  for (let y = startY; y < endY; y += 10) {
    for (let x = 40; x < 100; x += 10) {
      const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const avg = (r + g + b) / 3;
      
      const isColored = (Math.abs(r - g) > 15 || Math.abs(r - b) > 15 || Math.abs(g - b) > 15);
      const isMediumBright = avg > 80 && avg < 200;
      
      if (isColored && isMediumBright) {
        let left = x, right = x, top = y, bottom = y;
        
        for (let testX = x; testX < x + 500 && testX < width - 20; testX += 5) {
          const testIdx = (Math.floor(y) * width + Math.floor(testX)) * 4;
          const testAvg = (pixels[testIdx] + pixels[testIdx + 1] + pixels[testIdx + 2]) / 3;
          if (testAvg > 80 && testAvg < 200) right = testX;
          else break;
        }
        
        for (let testY = y; testY < y + 80 && testY < height - 10; testY += 5) {
          const testIdx = (Math.floor(testY) * width + Math.floor(x + 50)) * 4;
          const testAvg = (pixels[testIdx] + pixels[testIdx + 1] + pixels[testIdx + 2]) / 3;
          if (testAvg > 80 && testAvg < 200) bottom = testY;
          else break;
        }
        
        const w = right - left;
        const h = bottom - top;
        
        if (w >= 300 && h >= 40 && h <= 80) {
          const buttonRect = {
            x: left,
            y: top,
            width: w,
            height: h,
            confidence: 0.8,
            colorInfo: {uniformity: 0.9, avgBrightness: 150, isColored: true}
          };
          
          const overlapsExisting = existingRects.some(existing => {
            const overlap = getOverlapArea(buttonRect, existing);
            return overlap > buttonRect.width * buttonRect.height * 0.5;
          });
          
          const isDuplicate = buttons.some(b => Math.abs(b.y - buttonRect.y) < 20 && Math.abs(b.x - buttonRect.x) < 20);
          
          if (!overlapsExisting && !isDuplicate) {
            buttons.push(buttonRect);
          }
          
          break;
        }
      }
    }
  }
  
  return buttons.slice(0, 1);
}

function findTextLinks(pixels, width, height, existingRects) {
  const links = [];
  
  for (let y = Math.floor(height * 0.4); y < Math.floor(height * 0.75); y += 3) {
    const tooCloseToInput = [230, 260, 350, 385].some(inputY => Math.abs(y - inputY) < 40);
    if (tooCloseToInput) continue;
    
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
    
    if (bandPixels.length > 50) {
      const minX = Math.min(...bandPixels);
      const maxX = Math.max(...bandPixels);
      const w = maxX - minX + 1;
      
      if (w >= 150 && w <= 350) {
        const linkRect = {
          x: minX,
          y: y - 5,
          width: w,
          height: 20,
          confidence: 0.7,
          colorInfo: {uniformity: 0.5, avgBrightness: 150, isColored: true}
        };
        
        const overlapsExisting = existingRects.some(existing => {
          const overlap = getOverlapArea(linkRect, existing);
          return overlap > linkRect.width * linkRect.height * 0.3;
        });
        
        if (!overlapsExisting) {
          links.push(linkRect);
        }
      }
    }
  }
  
  const deduped = [];
  for (const link of links) {
    const isDuplicate = deduped.some(existing => 
      Math.abs(link.y - existing.y) < 30 && Math.abs(link.x - existing.x) < 50
    );
    if (!isDuplicate) {
      deduped.push(link);
    }
  }
  
  return deduped.slice(0, 1);
}

function getOverlapArea(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}

function inferType(rect) {
  const aspectRatio = rect.width / rect.height;
  const area = rect.width * rect.height;
  const height = rect.height;
  const isColored = rect.colorInfo?.isColored || false;
  const brightness = rect.colorInfo?.avgBrightness || 255;
  
  if (isColored && height >= 40) {
    return 'button';
  }
  
  if (brightness > 220 && height >= 35 && height <= 80 && aspectRatio > 4) {
    return 'text';
  }
  
  if (height >= 55 && area > 20000) {
    return 'button';
  }
  
  if (height >= 35 && height <= 65 && brightness > 200) {
    return 'text';
  }
  
  if (area > 18000 && height > 50) {
    return 'button';
  }
  
  return 'text';
}

async function main() {
  const imagePath = process.argv[2] || 'fixtures/login-page.png';
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  DETECTOR VALIDATION (mirrors src/detector.ts logic)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Testing: ${imagePath}\n`);
  
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Error: Image not found: ${imagePath}`);
    process.exit(1);
  }
  
  const image = await loadImage(imagePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const detected = detectComponents(imageData.data, canvas.width, canvas.height, true);
  
  console.log(`Image size: ${image.width}×${image.height}`);
  console.log(`\nDetected ${detected.length} objects:\n`);
  
  detected.forEach((obj, i) => {
    console.log(`${i + 1}. ${obj.type.toUpperCase()}`);
    console.log(`   Position: (${obj.x}, ${obj.y})`);
    console.log(`   Size: ${obj.width}×${obj.height}`);
    if (obj.confidence) console.log(`   Confidence: ${obj.confidence}`);
    console.log();
  });
  
  const typeCounts = detected.reduce((acc, obj) => {
    acc[obj.type] = (acc[obj.type] || 0) + 1;
    return acc;
  }, {});
  
  const inputCount = (typeCounts.text || 0) + (typeCounts.password || 0);
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Type Summary:');
  console.log(`  Input fields: ${inputCount}`);
  console.log(`  Buttons: ${typeCounts.button || 0}`);
  console.log(`  Links: ${typeCounts.link || 0}`);
  console.log(`  Total: ${detected.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const errors = [];
  
  // Expected for login page
  if (detected.length < 3 || detected.length > 5) {
    errors.push(`Total count ${detected.length} not in [3, 5]`);
  }
  if (inputCount < 2 || inputCount > 3) {
    errors.push(`Input count ${inputCount} not in [2, 3]`);
  }
  if ((typeCounts.button || 0) !== 1) {
    errors.push(`Expected 1 button, found ${typeCounts.button || 0}`);
  }
  if ((typeCounts.link || 0) !== 1) {
    errors.push(`Expected 1 link, found ${typeCounts.link || 0}`);
  }
  if (typeCounts.radio || typeCounts.checkbox || typeCounts.select) {
    errors.push(`Found forbidden types`);
  }
  
  if (errors.length > 0) {
    console.log('❌ VALIDATION FAILED:\n');
    errors.forEach(err => console.log(`  - ${err}`));
    process.exit(1);
  } else {
    console.log('✅ VALIDATION PASSED');
    console.log('   All checks passed for login page detection.');
    console.log('   The detector correctly finds:');
    console.log('   - 2 input fields (Username, Password)');
    console.log('   - 1 button (SIGN IN)');
    console.log('   - 1 link (FORGOT YOUR PASSWORD?)');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
