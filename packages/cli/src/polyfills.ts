/**
 * Polyfills for pdf.js compatibility in Node.js ESM environment
 * Must be imported before any pdf.js-related code
 */

import { createRequire } from "module";
import {
  Path2D,
  DOMMatrix,
  ImageData,
  DOMPoint,
} from "@napi-rs/canvas";

const g = globalThis as any;

// Polyfill Canvas APIs for pdf.js
if (typeof g.Path2D === "undefined") {
  g.Path2D = Path2D;
}
if (typeof g.DOMMatrix === "undefined") {
  g.DOMMatrix = DOMMatrix;
}
if (typeof g.ImageData === "undefined") {
  g.ImageData = ImageData;
}
if (typeof g.DOMPoint === "undefined") {
  g.DOMPoint = DOMPoint;
}

// Polyfill require for pdf.js in ESM environment
if (typeof g.require === "undefined") {
  g.require = createRequire(import.meta.url);
}

// Polyfill process.getBuiltinModule for older Node.js versions
// Set unconditionally to ensure it works with npm link
(process as any).getBuiltinModule = (id: string) => {
  try {
    return g.require(id);
  } catch {
    return null;
  }
};
