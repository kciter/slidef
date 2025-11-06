import * as fs from "fs/promises";
import * as path from "path";
import { Canvas } from "@napi-rs/canvas";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Canvas factory for Node.js environment
 * Matches pdf-to-png-converter implementation using @napi-rs/canvas
 */
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = new Canvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }

  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: any) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

export type ImageFormat = "png" | "jpeg" | "webp";

export interface ConvertOptions {
  scale?: number;
  format?: ImageFormat;
  quality?: number;
}

/**
 * Convert entire PDF to images using pdf.js directly
 */
export async function convertPdfToImages(
  pdfPath: string,
  outputDir: string,
  options: ConvertOptions = {}
): Promise<number> {
  const { scale = 2, format = "webp", quality = 85 } = options;
  // Dynamically import pdf.js
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Resolve local cMap path
  // dist/utils/pdf.js -> ../../node_modules/pdfjs-dist
  const nodeModulesPath = path.resolve(
    __dirname,
    "../../node_modules/pdfjs-dist"
  );
  const cMapUrl = path.join(nodeModulesPath, "cmaps") + "/";
  const standardFontDataUrl =
    path.join(nodeModulesPath, "standard_fonts") + "/";

  // Load PDF
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const canvasFactory = new NodeCanvasFactory();

  const pdf = await getDocument({
    data,
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    enableXfa: true,
    disableFontFace: true, // Use standard fonts instead of embedded fonts
    useSystemFonts: true, // Try to use system fonts
  } as any).promise;

  const totalPages = pdf.numPages;

  // Convert each page
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const { canvas, context } = canvasFactory.create(
      viewport.width,
      viewport.height
    );

    // Render page - pdf-to-png-converter passes canvas AND context
    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    } as any).promise;

    // Determine file extension and buffer format
    const ext = format === "jpeg" ? "jpg" : format;
    const outputPath = path.join(
      outputDir,
      `slide-${String(i).padStart(3, "0")}.${ext}`
    );

    // Generate buffer based on format
    let buffer: Buffer;
    if (format === "webp") {
      buffer = canvas.toBuffer("image/webp", quality);
    } else if (format === "jpeg") {
      buffer = canvas.toBuffer("image/jpeg", quality);
    } else {
      buffer = canvas.toBuffer("image/png");
    }

    await fs.writeFile(outputPath, buffer);

    page.cleanup();
  }

  await pdf.cleanup();

  return totalPages;
}

/**
 * Get PDF page count without converting
 */
export async function getPdfPageCount(pdfPath: string): Promise<number> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(await fs.readFile(pdfPath));
  const pdf = await getDocument({
    data,
    useSystemFonts: true,
  } as any).promise;

  const pageCount = pdf.numPages;
  await pdf.cleanup();

  return pageCount;
}
