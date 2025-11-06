import * as fs from "fs/promises";
import * as path from "path";
import chalk from "chalk";
import ora from "ora";
import { convertPdfToImages } from "../utils/pdf.js";
import {
  saveMetadata,
  fileExists,
  getBaseName,
  calculateFileHash,
  loadMetadata,
  generateUniqueSlideName,
} from "../utils/file.js";
import type { ConvertOptions, SlideMetadata } from "../types.js";

export async function importCommand(
  pdfFile: string,
  options: ConvertOptions
): Promise<void> {
  const spinner = ora("Importing PDF slides...").start();

  try {
    const cwd = process.cwd();

    // Load config
    let config: any = {
      slidesDir: "slides",
    };

    try {
      const configPath = path.join(cwd, "slidef.config.json");
      const configData = await fs.readFile(configPath, "utf-8");
      config = { ...config, ...JSON.parse(configData) };
    } catch {
      // Config doesn't exist, use defaults
    }

    // Check if PDF file exists
    const pdfPath = path.resolve(pdfFile);
    if (!(await fileExists(pdfPath))) {
      spinner.fail(chalk.red(`PDF file not found: ${pdfFile}`));
      process.exit(1);
    }

    // Calculate PDF hash
    spinner.text = "Calculating file hash...";
    const pdfHash = await calculateFileHash(pdfPath);

    // Determine slide name with normalization and unique name generation
    const baseName = options.name || getBaseName(pdfFile);
    const slidesDir = path.resolve(config.slidesDir || "slides");

    // Ensure slides directory exists
    await fs.mkdir(slidesDir, { recursive: true });

    // Generate unique normalized slide name
    const slideName = await generateUniqueSlideName(slidesDir, baseName);
    const outputDir = path.join(slidesDir, slideName);
    const imagesDir = path.join(outputDir, "images");

    spinner.text = `Converting ${chalk.cyan(pdfFile)} to images...`;

    // Parse scale option
    const scale = options.scale ? parseFloat(options.scale as any) : 2;
    if (isNaN(scale) || scale <= 0) {
      spinner.fail(chalk.red("Scale must be a positive number"));
      process.exit(1);
    }

    // Parse format option
    const format = (options.format as any) || "webp";
    if (!["png", "jpeg", "webp"].includes(format)) {
      spinner.fail(chalk.red("Format must be png, jpeg, or webp"));
      process.exit(1);
    }

    // Parse quality option
    const quality = options.quality ? parseInt(options.quality as any) : 85;
    if (isNaN(quality) || quality < 0 || quality > 100) {
      spinner.fail(chalk.red("Quality must be between 0 and 100"));
      process.exit(1);
    }

    // Convert PDF to images
    // Pass relative path to work around pdf-to-png-converter path handling
    const relativeImagesDir = path.relative(process.cwd(), imagesDir);
    const pageCount = await convertPdfToImages(pdfPath, relativeImagesDir, {
      scale,
      format: format as any,
      quality,
    });

    spinner.text = "Saving metadata...";

    // Create metadata
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format

    const metadata: SlideMetadata = {
      name: slideName,
      pageCount,
      createdAt: dateStr,
      sha256: pdfHash,
    };

    // Save metadata
    await saveMetadata(outputDir, metadata);

    spinner.succeed(
      chalk.green(
        `Successfully imported ${chalk.cyan(pageCount)} pages to ${chalk.cyan(
          outputDir
        )}`
      )
    );

    const ext = format === "jpeg" ? "jpg" : format;
    console.log(chalk.gray("\nOutput structure:"));
    console.log(chalk.gray(`  ${outputDir}/`));
    console.log(chalk.gray(`  ├── images/`));
    console.log(chalk.gray(`  │   ├── slide-001.${ext}`));
    console.log(chalk.gray(`  │   ├── slide-002.${ext}`));
    console.log(chalk.gray(`  │   └── ...`));
    console.log(chalk.gray(`  └── metadata.json`));
  } catch (error) {
    spinner.fail(chalk.red("Import failed"));
    console.error(
      chalk.red("\nError:"),
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}
