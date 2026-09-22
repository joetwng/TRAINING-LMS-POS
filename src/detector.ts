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
  const rectangles = findRectangularRegions(edgeMap, width, height);
  
  return rectangles;
};

const detectEdges = (data: Uint8ClampedArray, width: number, height: number): boolean[][] => {
  const edges: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
  const threshold = 40;

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

const findRectangularRegions = (edges: boolean[][], width: number, height: number): Rectangle[] => {
  const rectangles: Rectangle[] = [];
  const minSize = 30;
  const maxSize = Math.min(width, height) * 0.8;
  const step = 10;

  for (let y = 0; y < height - minSize; y += step) {
    for (let x = 0; x < width - minSize; x += step) {
      for (let h = minSize; h < maxSize && y + h < height; h += step * 2) {
        for (let w = minSize; w < maxSize && x + w < width; w += step * 2) {
          const score = scoreRectangle(edges, x, y, w, h);
          if (score > 0.35) {
            rectangles.push({ x, y, width: w, height: h, confidence: score });
          }
        }
      }
    }
  }

  return filterAndMergeRectangles(rectangles);
};

const scoreRectangle = (edges: boolean[][], x: number, y: number, w: number, h: number): number => {
  let edgeCount = 0;
  let totalSamples = 0;

  const sampleDensity = 5;

  for (let i = 0; i < w; i += sampleDensity) {
    if (y >= 0 && y < edges.length && x + i >= 0 && x + i < edges[0].length) {
      if (edges[y][x + i]) edgeCount++;
      totalSamples++;
    }
    if (y + h >= 0 && y + h < edges.length && x + i >= 0 && x + i < edges[0].length) {
      if (edges[y + h][x + i]) edgeCount++;
      totalSamples++;
    }
  }

  for (let i = 0; i < h; i += sampleDensity) {
    if (y + i >= 0 && y + i < edges.length && x >= 0 && x < edges[0].length) {
      if (edges[y + i][x]) edgeCount++;
      totalSamples++;
    }
    if (y + i >= 0 && y + i < edges.length && x + w >= 0 && x + w < edges[0].length) {
      if (edges[y + i][x + w]) edgeCount++;
      totalSamples++;
    }
  }

  return totalSamples > 0 ? edgeCount / totalSamples : 0;
};

const filterAndMergeRectangles = (rectangles: Rectangle[]): Rectangle[] => {
  const sorted = rectangles.sort((a, b) => {
    const scoreA = b.confidence * Math.sqrt(b.width * b.height);
    const scoreB = a.confidence * Math.sqrt(a.width * a.height);
    return scoreA - scoreB;
  });
  const filtered: Rectangle[] = [];

  for (const rect of sorted) {
    const area = rect.width * rect.height;
    if (area < 1000 && rect.width < 100) {
      continue;
    }

    const overlaps = filtered.some(existing => {
      const overlapX = Math.max(0, Math.min(existing.x + existing.width, rect.x + rect.width) - Math.max(existing.x, rect.x));
      const overlapY = Math.max(0, Math.min(existing.y + existing.height, rect.y + rect.height) - Math.max(existing.y, rect.y));
      const overlapArea = overlapX * overlapY;
      const rectArea = rect.width * rect.height;
      return overlapArea > rectArea * 0.4;
    });

    if (!overlaps && filtered.length < 10) {
      filtered.push(rect);
    }
  }

  return filtered;
};

const rectanglesToObjects = (rectangles: Rectangle[]): DetectedObject[] => {
  return rectangles.map((rect, index) => {
    const type = inferType(rect);
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

const inferType = (rect: Rectangle): DetectedObject['type'] => {
  const aspectRatio = rect.width / rect.height;
  const area = rect.width * rect.height;

  if (area < 800) {
    return 'checkbox';
  }
  
  if (aspectRatio < 0.5) {
    return 'radio';
  }
  
  if (aspectRatio > 4 && rect.height < 50) {
    return 'text';
  }
  
  if (aspectRatio > 2.5 && area < 15000 && rect.height > 30 && rect.height < 80) {
    return 'button';
  }
  
  if (aspectRatio > 1.5 && area < 8000 && rect.height < 40) {
    return 'link';
  }

  return 'text';
};
