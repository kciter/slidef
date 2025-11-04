import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import type { SlideMetadata, SlideIndex } from '../types.js';

/**
 * Save metadata to JSON file
 */
export async function saveMetadata(
  outputDir: string,
  metadata: SlideMetadata
): Promise<void> {
  const metadataPath = path.join(outputDir, 'metadata.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

/**
 * Load metadata from JSON file
 */
export async function loadMetadata(slideDir: string): Promise<SlideMetadata | null> {
  const metadataPath = path.join(slideDir, 'metadata.json');
  try {
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Get all slide directories in the slides folder
 */
export async function getAllSlides(slidesDir: string): Promise<SlideMetadata[]> {
  try {
    const entries = await fs.readdir(slidesDir, { withFileTypes: true });
    const slides: SlideMetadata[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const metadata = await loadMetadata(path.join(slidesDir, entry.name));
        if (metadata) {
          slides.push(metadata);
        }
      }
    }

    return slides;
  } catch {
    return [];
  }
}

/**
 * Save slide index
 */
export async function saveSlideIndex(
  outputDir: string,
  slides: SlideMetadata[]
): Promise<void> {
  const index: SlideIndex = {
    slides,
    updatedAt: new Date().toISOString(),
  };

  const indexPath = path.join(outputDir, 'slides-index.json');
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get filename without extension
 */
export function getBaseName(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Calculate SHA256 hash of a file
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}
