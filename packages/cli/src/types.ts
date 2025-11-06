/**
 * Metadata for a converted slide deck
 */
export interface SlideMetadata {
  /** Unique name/ID for the slide deck */
  name: string;
  /** Total number of pages/slides */
  pageCount: number;
  /** Date when converted (YYYY-MM-DD format) */
  createdAt: string;
  /** SHA256 hash of the PDF file */
  sha256: string;
  /** Optional title for the slide deck */
  title?: string;
  /** Optional description */
  description?: string;
  /** Image format used for slides (png, jpeg, webp) */
  format?: string;
}

/**
 * Configuration for slide conversion
 */
export interface ConvertOptions {
  /** Name for the slide deck */
  name?: string;
  /** Scale factor for image resolution (default: 2) */
  scale?: number;
  /** Image format: png, jpeg, or webp (default: webp) */
  format?: "png" | "jpeg" | "webp";
  /** Image quality for lossy formats (0-100, default: 85) */
  quality?: number;
}

/**
 * Configuration for publish command
 */
export interface PublishOptions {
  /** Output directory for static site */
  output: string;
  /** Directory containing slides */
  slides: string;
}

/**
 * Index file containing all slide decks
 */
export interface SlideIndex {
  /** List of all slide decks */
  slides: SlideMetadata[];
  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * Theme customization options
 */
export interface ThemeConfig {
  /** Primary color (e.g., #007bff) */
  primaryColor?: string;
  /** Background color (e.g., #ffffff) */
  backgroundColor?: string;
  /** Text color (e.g., #1a1a1a) */
  textColor?: string;
  /** Progress bar color (e.g., #A020F0) */
  progressColor?: string;
  /** Font family (e.g., 'Arial, sans-serif') */
  fontFamily?: string;
}

/**
 * Slidef project configuration
 */
export interface SlidefConfig {
  /** Project title */
  title?: string;
  /** Project subtitle */
  subtitle?: string;
  /** Output directory for publish command */
  publishDir?: string;
  /** Slides directory */
  slidesDir?: string;
  /** Theme customization */
  theme?: ThemeConfig;
}
