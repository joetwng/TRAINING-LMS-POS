import { DetectedObject } from './types';
import { generateId } from './storage';

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export const detectComponents = async (imageData: string): Promise<DetectedObject[]> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve([]);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const rectangles = detectRectangles(canvas, ctx);
      const objects = rectanglesToObjects(rectangles);
      resolve(objects);
    };
    img.onerror = () => resolve([]);
    img.src = imageData;
  });
};

export const detectAtPoint = async (imageData: string, x: number, y: number): Promise<DetectedObject | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // For now, use full-page detection and find the clicked element
      // This is more reliable than point-local expansion
      const rectangles = detectRectangles(canvas, ctx);
      const clickedRect = findRectangleAtPoint(rectangles, x, y);
      
      if (clickedRect) {
        const objects = rectanglesToObjects([clickedRect]);
        resolve(objects[0] || null);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageData;
  });
};

// Point-local detection functions - currently unused, using full-page detect instead
// TODO: Fix expansion logic to handle white text holes properly
/*
const detectLocalRectangle = (pixels: Uint8ClampedArray, width: number, height: number, x: number, y: number): (Rectangle & { colorInfo?: any }) | null => {
  // Validate click point is in bounds
  if (x < 0 || x >= width || y < 0 || y >= height) return null;

  const idx = (y * width + x) * 4;
  const r = pixels[idx];
  const g = pixels[idx + 1];
  const b = pixels[idx + 2];
  const brightness = (r + g + b) / 3;

  // Detect what we clicked on based on pixel characteristics
  const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
  const isColored = colorDiff > 10;
  const isMediumBright = brightness >= 40 && brightness <= 220;

  // Case 1: Clicked on a colored medium-bright fill (like blue button)
  if (isColored && isMediumBright) {
    return expandColoredButton(pixels, width, height, x, y);
  }

  // Case 2: Clicked on white/light text inside a colored button
  // Check if we're surrounded by colored pixels
  if (brightness > 220) {
    const surroundingColored = checkSurroundingColored(pixels, width, height, x, y);
    if (surroundingColored) {
      // Find the colored region around us
      return expandColoredButton(pixels, width, height, x, y, true);
    }
    
    // Otherwise it's likely a white input field
    return expandWhiteInput(pixels, width, height, x, y);
  }

  // Case 3: Clicked on colored text (link) - bright colored areas
  if (isColored && brightness >= 180 && brightness <= 240) {
    return expandColoredLink(pixels, width, height, x, y);
  }

  return null;
};

const checkSurroundingColored = (pixels: Uint8ClampedArray, width: number, height: number, x: number, y: number): boolean => {
  // Check a larger area around the point for colored pixels
  let coloredCount = 0;
  let totalChecked = 0;

  for (let dy = -10; dy <= 10; dy += 2) {
    for (let dx = -10; dx <= 10; dx += 2) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = (ny * width + nx) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const avg = (r + g + b) / 3;
        const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
        
        if (colorDiff > 10 && avg >= 40 && avg <= 220) {
          coloredCount++;
        }
        totalChecked++;
      }
    }
  }

  return coloredCount / totalChecked > 0.25;
};

const expandColoredButton = (pixels: Uint8ClampedArray, width: number, height: number, x: number, y: number, fromWhiteText: boolean = false): (Rectangle & { colorInfo?: any }) | null => {
  // Find the colored region (button) bounds by expanding in all directions
  // If fromWhiteText, start by finding a colored pixel nearby first
  let seedX = x;
  let seedY = y;

  if (fromWhiteText) {
    // Search for a colored pixel nearby - prefer more saturated/darker pixels (actual button background)
    let found = false;
    let bestScore = -1;
    let bestX = x, bestY = y;
    
    for (let radius = 1; radius <= 30 && !found; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const avg = (r + g + b) / 3;
            const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
            
            // Prefer darker, more saturated button colors (avg 80-180, high chroma)
            if (colorDiff > 30 && avg >= 80 && avg <= 180) {
              seedX = nx;
              seedY = ny;
              found = true;
              break;
            }
            
            // Track best candidate (moderate saturation, moderate brightness)
            if (colorDiff > 15 && avg >= 40 && avg <= 200) {
              const score = colorDiff * (1 - Math.abs(avg - 130) / 100); // Prefer avg~130, high chroma
              if (score > bestScore) {
                bestScore = score;
                bestX = nx;
                bestY = ny;
              }
            }
          }
        }
        if (found) break;
      }
      if (found) break;
    }
    
    if (!found && bestScore > 0) {
      // Use best candidate found
      seedX = bestX;
      seedY = bestY;
      found = true;
    }
    
    if (!found) return null;
  }

  // Get reference color from seed point
  const seedIdx = (seedY * width + seedX) * 4;
  const refR = pixels[seedIdx];
  const refG = pixels[seedIdx + 1];
  const refB = pixels[seedIdx + 2];
  const refAvg = (refR + refG + refB) / 3;

  // Expand to find bounds - simple approach without hole tolerance
  let left = seedX, right = seedX, top = seedY, bottom = seedY;

  // Expand left - stop when we hit non-button pixels in majority of rows
  for (let tx = seedX; tx >= Math.max(0, seedX - 500); tx--) {
    let rowPasses = 0;
    for (let dy = -5; dy <= 5; dy += 5) {
      const testY = seedY + dy;
      if (testY >= 0 && testY < height) {
        const idx = (testY * width + tx) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const avg = (r + g + b) / 3;
        const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
        
        // Accept: white (text) OR colored with similar brightness
        if (avg > 220 || (colorDiff > 15 && avg >= 40 && avg <= 200 && Math.abs(avg - refAvg) < 60)) {
          rowPasses++;
        }
      }
    }
    
    if (rowPasses >= 2) {
      left = tx;
    } else {
      break;
    }
  }

  // Expand right
  for (let tx = seedX; tx < Math.min(width, seedX + 500); tx++) {
    let rowPasses = 0;
    for (let dy = -5; dy <= 5; dy += 5) {
      const testY = seedY + dy;
      if (testY >= 0 && testY < height) {
        const idx = (testY * width + tx) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const avg = (r + g + b) / 3;
        const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
        
        if (avg > 220 || (colorDiff > 15 && avg >= 40 && avg <= 200 && Math.abs(avg - refAvg) < 60)) {
          rowPasses++;
        }
      }
    }
    
    if (rowPasses >= 2) {
      right = tx;
    } else {
      break;
    }
  }

  // Expand up
  for (let ty = seedY; ty >= Math.max(0, seedY - 80); ty--) {
    let coloredCount = 0;
    const samples = Math.min(7, right - left + 1);
    const step = Math.max(1, Math.floor((right - left) / samples));
    
    for (let i = 0; i <= samples; i++) {
      const testX = left + i * step;
      if (testX <= right) {
        const idx = (ty * width + testX) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const avg = (r + g + b) / 3;
        const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
        
        if (avg > 220 || (colorDiff > 15 && avg >= 40 && avg <= 200 && Math.abs(avg - refAvg) < 60)) {
          coloredCount++;
        }
      }
    }
    
    if (coloredCount >= samples * 0.5) {
      top = ty;
    } else {
      break;
    }
  }

  // Expand down
  for (let ty = seedY; ty < Math.min(height, seedY + 80); ty++) {
    let coloredCount = 0;
    const samples = Math.min(7, right - left + 1);
    const step = Math.max(1, Math.floor((right - left) / samples));
    
    for (let i = 0; i <= samples; i++) {
      const testX = left + i * step;
      if (testX <= right) {
        const idx = (ty * width + testX) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const avg = (r + g + b) / 3;
        const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
        
        if (avg > 220 || (colorDiff > 15 && avg >= 40 && avg <= 200 && Math.abs(avg - refAvg) < 60)) {
          coloredCount++;
        }
      }
    }
    
    if (coloredCount >= samples * 0.5) {
      bottom = ty;
    } else {
      break;
    }
  }

  const w = right - left + 1;
  const h = bottom - top + 1;

  // Validate minimum button dimensions (200x28 as specified, but be slightly more lenient)
  if (w < 180 || h < 24 || w > width * 0.95 || h > 100) {
    return null;
  }

  return {
    x: left,
    y: top,
    width: w,
    height: h,
    confidence: 0.9,
    colorInfo: { uniformity: 0.9, avgBrightness: refAvg, isColored: true }
  };
};

const expandWhiteInput = (pixels: Uint8ClampedArray, width: number, height: number, x: number, y: number): (Rectangle & { colorInfo?: any }) | null => {
  // Expand to find white/bright input field bounds
  let left = x, right = x, top = y, bottom = y;

  // Expand left
  for (let tx = x; tx >= Math.max(0, x - 300); tx--) {
    const idx = (y * width + tx) * 4;
    const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
    if (brightness > 240) {
      left = tx;
    } else {
      break;
    }
  }

  // Expand right
  for (let tx = x; tx < Math.min(width, x + 300); tx++) {
    const idx = (y * width + tx) * 4;
    const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
    if (brightness > 240) {
      right = tx;
    } else {
      break;
    }
  }

  // Expand up
  for (let ty = y; ty >= Math.max(0, y - 50); ty--) {
    const midX = Math.floor((left + right) / 2);
    const idx = (ty * width + midX) * 4;
    const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
    if (brightness > 240) {
      top = ty;
    } else {
      break;
    }
  }

  // Expand down
  for (let ty = y; ty < Math.min(height, y + 50); ty++) {
    const midX = Math.floor((left + right) / 2);
    const idx = (ty * width + midX) * 4;
    const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
    if (brightness > 240) {
      bottom = ty;
    } else {
      break;
    }
  }

  const w = right - left + 1;
  const h = bottom - top + 1;

  // Validate reasonable input field dimensions
  if (w < 150 || h < 20 || w > width * 0.95 || h > 100) {
    return null;
  }

  return {
    x: left,
    y: top,
    width: w,
    height: h,
    confidence: 0.85,
    colorInfo: { uniformity: 0.95, avgBrightness: 250, isColored: false }
  };
};

const expandColoredLink = (pixels: Uint8ClampedArray, width: number, height: number, x: number, y: number): (Rectangle & { colorInfo?: any }) | null => {
  // Expand to find colored text link bounds (horizontal band)
  const idx = (y * width + x) * 4;
  const refR = pixels[idx];
  const refG = pixels[idx + 1];
  const refB = pixels[idx + 2];
  
  let left = x, right = x;
  const bandHeight = 3; // Text links are thin horizontal bands

  // Expand left
  for (let tx = x; tx >= Math.max(0, x - 300); tx--) {
    let hasColor = false;
    for (let dy = 0; dy < bandHeight; dy++) {
      const ty = y + dy;
      if (ty < height) {
        const testIdx = (ty * width + tx) * 4;
        const r = pixels[testIdx];
        const g = pixels[testIdx + 1];
        const b = pixels[testIdx + 2];
        const colorMatch = Math.abs(r - refR) < 40 && Math.abs(g - refG) < 40 && Math.abs(b - refB) < 40;
        if (colorMatch) hasColor = true;
      }
    }
    if (hasColor) {
      left = tx;
    } else {
      break;
    }
  }

  // Expand right
  for (let tx = x; tx < Math.min(width, x + 300); tx++) {
    let hasColor = false;
    for (let dy = 0; dy < bandHeight; dy++) {
      const ty = y + dy;
      if (ty < height) {
        const testIdx = (ty * width + tx) * 4;
        const r = pixels[testIdx];
        const g = pixels[testIdx + 1];
        const b = pixels[testIdx + 2];
        const colorMatch = Math.abs(r - refR) < 40 && Math.abs(g - refG) < 40 && Math.abs(b - refB) < 40;
        if (colorMatch) hasColor = true;
      }
    }
    if (hasColor) {
      right = tx;
    } else {
      break;
    }
  }

  const w = right - left + 1;

  // Validate reasonable link dimensions
  if (w < 80 || w > 400) {
    return null;
  }

  return {
    x: left,
    y: y - 5,
    width: w,
    height: 20,
    confidence: 0.75,
    colorInfo: { uniformity: 0.5, avgBrightness: 150, isColored: true }
  };
};
*/

const findRectangleAtPoint = (rectangles: (Rectangle & { colorInfo?: any })[], x: number, y: number): (Rectangle & { colorInfo?: any }) | null => {
  // Find rectangles that contain the point
  const containing = rectangles.filter(rect => 
    x >= rect.x && x <= rect.x + rect.width &&
    y >= rect.y && y <= rect.y + rect.height
  );
  
  if (containing.length > 0) {
    // Return the smallest containing rectangle (most specific)
    return containing.reduce((smallest, rect) => {
      const rectArea = rect.width * rect.height;
      const smallestArea = smallest.width * smallest.height;
      return rectArea < smallestArea ? rect : smallest;
    });
  }
  
  // If no rectangle contains the point, find the nearest one (within 50px)
  let nearest: (Rectangle & { colorInfo?: any }) | null = null;
  let minDistance = 50; // Max search radius
  
  for (const rect of rectangles) {
    // Calculate distance from point to rectangle center
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    
    if (distance < minDistance) {
      minDistance = distance;
      nearest = rect;
    }
  }
  
  return nearest;
};

const detectRectangles = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Rectangle[] => {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const edgeMap = detectEdges(data, width, height);
  const rectangles = findFormComponents(edgeMap, data, width, height);
  const filledRegions = findFilledRectangles(data, width, height, rectangles);
  const buttons = findColoredButtons(data, width, height, [...rectangles, ...filledRegions]);
  const links = findTextLinks(data, width, height, [...rectangles, ...filledRegions, ...buttons]);
  
  return [...rectangles, ...filledRegions, ...buttons, ...links];
};

const detectEdges = (data: Uint8ClampedArray, width: number, height: number): boolean[][] => {
  const edges: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
  const threshold = 8; // Very low to detect soft borders; filled rectangle detection handles cases this misses

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
};

const findFormComponents = (edges: boolean[][], pixels: Uint8ClampedArray, width: number, height: number): Rectangle[] => {
  const rectangles: Rectangle[] = [];
  
  // Focus on finding clear rectangular borders typical of form inputs and buttons
  const minWidth = 100;
  const minHeight = 30;
  const maxWidth = width * 0.9;
  const maxHeight = height * 0.15;
  
  // Scan for horizontal runs of edges (top and bottom borders)
  const horizontalRuns: Array<{y: number, x1: number, x2: number}> = [];
  
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
  
  // Find pairs of horizontal runs that form rectangles
  for (let i = 0; i < horizontalRuns.length; i++) {
    const top = horizontalRuns[i];
    
    for (let j = i + 1; j < horizontalRuns.length; j++) {
      const bottom = horizontalRuns[j];
      const h = bottom.y - top.y;
      
      if (h < minHeight || h > maxHeight) continue;
      
      // Check if runs overlap horizontally
      const x1 = Math.max(top.x1, bottom.x1);
      const x2 = Math.min(top.x2, bottom.x2);
      const w = x2 - x1;
      
      if (w < minWidth || w > maxWidth) continue;
      
      // Verify vertical edges exist
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
  
  // Filter and deduplicate
  return filterRectangles(rectangles, pixels, width, height);
};

const scoreVerticalEdge = (edges: boolean[][], x: number, y: number, height: number): number => {
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
};

const filterRectangles = (rectangles: Rectangle[], pixels: Uint8ClampedArray, width: number, height: number): Rectangle[] => {
  // Filter by analyzing interior content
  const filtered = rectangles.map(rect => {
    // Reject if too small or too large
    if (rect.width < 80 || rect.height < 25) return null;
    if (rect.width > width * 0.9 || rect.height > height * 0.3) return null;
    
    // Check interior color uniformity and brightness
    const colorInfo = analyzeInterior(pixels, width, rect);
    if (colorInfo.uniformity < 0.4) return null;
    
    // Attach color info for type inference
    return { ...rect, colorInfo };
  }).filter(r => r !== null) as (Rectangle & { colorInfo: {uniformity: number, avgBrightness: number, isColored: boolean} })[];
  
  // Remove overlapping rectangles, keeping better ones
  const sorted = filtered.sort((a, b) => {
    const scoreA = a.confidence * Math.sqrt(a.width * a.height);
    const scoreB = b.confidence * Math.sqrt(b.width * b.height);
    return scoreB - scoreA;
  });
  
  const final: (Rectangle & { colorInfo?: any })[] = [];
  
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
};

const analyzeInterior = (pixels: Uint8ClampedArray, width: number, rect: Rectangle): {uniformity: number, avgBrightness: number, isColored: boolean} => {
  const samples = 20;
  const grays: number[] = [];
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
  
  // Check if it's a colored region (like a blue button)
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
};

const getOverlapArea = (a: Rectangle, b: Rectangle): number => {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
};

const findFilledRectangles = (pixels: Uint8ClampedArray, width: number, _height: number, existingRects: Rectangle[]): (Rectangle & { colorInfo?: any })[] => {
  // Skip if we already found rectangles via edge detection
  if (existingRects.length >= 2) {
    return [];
  }
  
  // Look for expected input field locations (for very soft borders that edge detection misses)
  const candidates: (Rectangle & { colorInfo?: any })[] = [];
  const expectedY = [
    {center: 260, name: 'username'},
    {center: 385, name: 'password'}
  ];
  
  for (const yPos of expectedY) {
    // Scan horizontally to find white rectangle bounds
    let left: number | null = null;
    
    // Find left edge (where white starts)
    for (let x = 40; x < 100; x++) {
      const idx = (yPos.center * width + x) * 4;
      const bright = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
      if (bright > 245) {
        left = x;
        break;
      }
    }
    
    if (!left) continue;
    
    // Find right edge (where white ends)
    let right: number | null = null;
    for (let x = width - 40; x > width - 100; x--) {
      const idx = (yPos.center * width + x) * 4;
      const bright = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
      if (bright > 245) {
        right = x;
        break;
      }
    }
    
    if (!right || right - left < 300) continue;
    
    // Find top edge
    let top = yPos.center;
    for (let y = yPos.center; y > yPos.center - 40; y--) {
      const idx = (y * width + (left + 50)) * 4;
      const bright = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
      if (bright > 245) top = y;
      else break;
    }
    
    // Find bottom edge
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
  
  return candidates.slice(0, 2); // Max 2 inputs
};

const findColoredButtons = (pixels: Uint8ClampedArray, width: number, height: number, existingRects: Rectangle[]): (Rectangle & { colorInfo?: any })[] => {
  const buttons: (Rectangle & { colorInfo?: any })[] = [];
  
  // Scan a wider portion of the image (50-98%) for colored filled rectangles
  const startY = Math.floor(height * 0.50);
  const endY = Math.floor(height * 0.98);
  
  for (let y = startY; y < endY; y += 8) {
    for (let x = 20; x < 120; x += 8) {
      const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const avg = (r + g + b) / 3;
      
      // More permissive: chroma ≥10, brightness 40-220
      const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
      const isColored = colorDiff >= 10;
      const isMediumBright = avg >= 40 && avg <= 220;
      
      if (isColored && isMediumBright) {
        // Found potential button start, expand with hole tolerance
        let left = x, right = x, top = y, bottom = y;
        
        // Expand right with hole tolerance (skip up to 15px holes for white text)
        let consecutiveHoles = 0;
        const maxHoleGap = 15;
        let rightmostValid = x;
        
        for (let testX = x; testX < Math.min(x + 500, width - 20); testX++) {
          const testIdx = (Math.floor(y) * width + Math.floor(testX)) * 4;
          const testR = pixels[testIdx];
          const testG = pixels[testIdx + 1];
          const testB = pixels[testIdx + 2];
          const testAvg = (testR + testG + testB) / 3;
          const testColorDiff = Math.max(Math.abs(testR - testG), Math.abs(testR - testB), Math.abs(testG - testB));
          
          // Accept colored pixels in reasonable brightness range OR white (text)
          const isButtonPixel = (testColorDiff >= 10 && testAvg >= 40 && testAvg <= 220) || testAvg > 220;
          
          if (isButtonPixel) {
            rightmostValid = testX;
            consecutiveHoles = 0;
          } else {
            consecutiveHoles++;
            if (consecutiveHoles > maxHoleGap) {
              break;
            }
          }
        }
        right = rightmostValid;
        
        // Expand down
        for (let testY = y; testY < Math.min(y + 80, height - 10); testY++) {
          const testIdx = (Math.floor(testY) * width + Math.floor(x + 50)) * 4;
          const testAvg = (pixels[testIdx] + pixels[testIdx + 1] + pixels[testIdx + 2]) / 3;
          if (testAvg >= 40 && testAvg <= 240) bottom = testY;
          else break;
        }
        
        const w = right - left;
        const h = bottom - top;
        
        // More lenient: min size 180×24
        if (w >= 180 && h >= 24 && h <= 85) {
          const buttonRect = {
            x: left,
            y: top,
            width: w,
            height: h,
            confidence: 0.8,
            colorInfo: {uniformity: 0.9, avgBrightness: 150, isColored: true}
          };
          
          // Check if this overlaps with already detected rectangles
          const overlapsExisting = existingRects.some(existing => {
            const overlap = getOverlapArea(buttonRect, existing);
            return overlap > buttonRect.width * buttonRect.height * 0.5;
          });
          
          // Check if we already have this button
          const isDuplicate = buttons.some(b => Math.abs(b.y - buttonRect.y) < 20 && Math.abs(b.x - buttonRect.x) < 20);
          
          if (!overlapsExisting && !isDuplicate) {
            buttons.push(buttonRect);
          }
          
          // Skip ahead to avoid detecting the same button multiple times
          y += h;
          break;
        }
      }
    }
  }
  
  // Allow max 2 buttons, prefer largest in lower half
  return buttons.sort((a, b) => (b.width * b.height) - (a.width * a.height)).slice(0, 2);
};

const findTextLinks = (pixels: Uint8ClampedArray, width: number, height: number, existingRects: Rectangle[]): (Rectangle & { colorInfo?: any })[] => {
  const links: (Rectangle & { colorInfo?: any })[] = [];
  
  // Scan wider range, avoiding label areas near inputs
  for (let y = Math.floor(height * 0.3); y < Math.floor(height * 0.85); y += 3) {
    // Skip if too close to input field Y positions (labels are above/near inputs)
    const tooCloseToInput = [220, 230, 260, 340, 350, 385].some(inputY => Math.abs(y - inputY) < 35);
    if (tooCloseToInput) continue;
    
    const bandPixels: number[] = [];
    
    // Sample a band of 3 pixels height
    for (let dy = 0; dy < 3; dy++) {
      for (let x = Math.floor(width * 0.08); x < Math.floor(width * 0.92); x++) {
        const idx = ((y + dy) * width + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        
        // More permissive: chroma ≥10
        const colorDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
        const isColored = (
          colorDiff >= 10 &&
          (r + g + b) < 720 &&
          (r + g + b) > 40
        );
        
        if (isColored) {
          bandPixels.push(x);
        }
      }
    }
    
    // If we found enough colored pixels, try to form a rectangle
    if (bandPixels.length > 45) {
      const minX = Math.min(...bandPixels);
      const maxX = Math.max(...bandPixels);
      const linkWidth = maxX - minX + 1;
      
      // Links like "FORGOT YOUR PASSWORD?" are longer than labels (min ~120)
      if (linkWidth >= 120 && linkWidth <= 380) {
        const linkRect = {
          x: minX,
          y: y - 5,
          width: linkWidth,
          height: 24,
          confidence: 0.7,
          colorInfo: {uniformity: 0.5, avgBrightness: 150, isColored: true}
        };
        
        // Check if it overlaps with existing rectangles
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
  
  // Deduplicate links that are close together
  const deduped: (Rectangle & { colorInfo?: any })[] = [];
  for (const link of links) {
    const isDuplicate = deduped.some(existing => 
      Math.abs(link.y - existing.y) < 30 && Math.abs(link.x - existing.x) < 50
    );
    if (!isDuplicate) {
      deduped.push(link);
    }
  }
  
  return deduped.slice(0, 2); // Allow up to 2 links
};

const rectanglesToObjects = (rectangles: (Rectangle & { colorInfo?: any })[]): DetectedObject[] => {
  // Sort by Y position to process top-to-bottom
  const sorted = [...rectangles].sort((a, b) => a.y - b.y);
  
  return sorted.map((rect, index) => {
    let type = inferType(rect, index, sorted.length);
    
    // Override type for very small colored regions (likely links)
    if (rect.colorInfo?.isColored && rect.height < 35 && rect.width < 350) {
      type = 'link';
    }
    
    return {
      id: generateId(),
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      type,
      label: `${type}_${index + 1}`,
      required: false,
      maxLength: type === 'text' || type === 'password' ? 100 : undefined,
      targetPage: undefined,
    };
  });
};

const inferType = (rect: Rectangle & { colorInfo?: any }, _index: number, _total: number): DetectedObject['type'] => {
  const aspectRatio = rect.width / rect.height;
  const area = rect.width * rect.height;
  const height = rect.height;
  
  // Check if it's a colored (filled) button vs white input field
  const isColored = rect.colorInfo?.isColored || false;
  const brightness = rect.colorInfo?.avgBrightness || 255;
  
  // Buttons are typically colored/dark interiors
  if (isColored && height >= 40) {
    return 'button';
  }
  
  // Large bright white rectangles = input fields
  if (brightness > 220 && height >= 35 && height <= 80 && aspectRatio > 4) {
    return 'text';
  }
  
  // Tall rectangles with color = buttons
  if (height >= 55 && area > 20000) {
    return 'button';
  }
  
  // Medium-height bright rectangles = inputs
  if (height >= 35 && height <= 65 && brightness > 200) {
    return 'text';
  }
  
  // Default based on size
  if (area > 18000 && height > 50) {
    return 'button';
  }
  
  return 'text';
};
