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

const detectRectangles = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Rectangle[] => {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const edgeMap = detectEdges(data, width, height);
  const rectangles = findFormComponents(edgeMap, data, width, height);
  const links = findTextLinks(data, width, height, rectangles);
  
  return [...rectangles, ...links];
};

const detectEdges = (data: Uint8ClampedArray, width: number, height: number): boolean[][] => {
  const edges: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
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

const findTextLinks = (pixels: Uint8ClampedArray, width: number, height: number, existingRects: Rectangle[]): (Rectangle & { colorInfo?: any })[] => {
  const links: (Rectangle & { colorInfo?: any })[] = [];
  const scanStep = 5;
  
  // Look for horizontal runs of colored pixels (potential link text)
  for (let y = height * 0.3; y < height * 0.8; y += scanStep) {
    let runStart = -1;
    let runLength = 0;
    let coloredCount = 0;
    
    for (let x = width * 0.1; x < width * 0.9; x++) {
      const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      
      // Check if this is a colored pixel (not black/white/gray)
      const isColored = (
        (Math.abs(r - g) > 15 || Math.abs(r - b) > 15 || Math.abs(g - b) > 15) &&
        (r + g + b) < 650 &&
        (r + g + b) > 50
      );
      
      if (isColored) {
        if (runStart === -1) {
          runStart = x;
        }
        runLength = x - runStart + 1;
        coloredCount++;
      } else if (runStart !== -1 && runLength > 10) {
        // Check if we've accumulated enough colored pixels
        if (coloredCount > runLength * 0.15 && runLength >= 100 && runLength <= 400) {
          // Found a potential link - check if it overlaps with existing rectangles
          const linkRect = {
            x: runStart,
            y: y - 10,
            width: runLength,
            height: 25,
            confidence: 0.7
          };
          
          const overlapsExisting = existingRects.some(existing => {
            const overlap = getOverlapArea(linkRect, existing);
            return overlap > linkRect.width * linkRect.height * 0.3;
          });
          
          if (!overlapsExisting) {
            links.push({
              ...linkRect,
              colorInfo: {uniformity: 0.5, avgBrightness: 100, isColored: true}
            });
          }
        }
        
        runStart = -1;
        runLength = 0;
        coloredCount = 0;
      } else if (x - runStart > 50) {
        runStart = -1;
        runLength = 0;
        coloredCount = 0;
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
  
  return deduped.slice(0, 2); // Max 2 links
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
