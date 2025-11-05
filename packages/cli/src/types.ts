/**
 * Metadata for a converted slide deck
 */
export interface SlideMetadata {
  /** Unique name/ID for the slide deck */
  name: string;
  /** Original PDF filename */
  filename: string;
  /** Total number of pages/slides */
  pageCount: number;
  /** Timestamp when converted */
  createdAt: string;
  /** SHA256 hash of the PDF file */
  sha256: string;
  /** Optional title for the slide deck */
  title?: string;
  /** Optional description */
  description?: string;
}

/**
 * Configuration for slide conversion
 */
export interface ConvertOptions {
  /** Name for the slide deck */
  name?: string;
  /** Scale factor for image resolution (default: 2) */
  scale?: number;
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
  /** Created timestamp */
  createdAt?: string;
}
