import * as fs from "fs/promises";
import * as path from "path";
import chalk from "chalk";
import type { SlideMetadata } from "../types.js";

export async function listCommand(): Promise<void> {
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

  const slidesDir = path.resolve(config.slidesDir || "slides");

  try {
    // Check if slides directory exists
    try {
      await fs.access(slidesDir);
    } catch {
      console.log(chalk.yellow("No slides directory found."));
      console.log(
        chalk.gray('Run "slidef import <pdf>" to import your first slide deck.')
      );
      return;
    }

    // Read all subdirectories in slides/
    const entries = await fs.readdir(slidesDir, { withFileTypes: true });
    const slideDirs = entries.filter((entry) => entry.isDirectory());

    if (slideDirs.length === 0) {
      console.log(chalk.yellow("No slide decks found."));
      console.log(
        chalk.gray('Run "slidef import <pdf>" to import your first slide deck.')
      );
      return;
    }

    console.log(chalk.bold(`\n📚 Slide Decks (${slideDirs.length})\n`));

    // Read metadata for each slide deck
    const slides: Array<{ name: string; metadata: SlideMetadata | null }> = [];

    for (const dir of slideDirs) {
      const metadataPath = path.join(slidesDir, dir.name, "metadata.json");
      let metadata: SlideMetadata | null = null;

      try {
        const content = await fs.readFile(metadataPath, "utf-8");
        metadata = JSON.parse(content);
      } catch {
        // Metadata file doesn't exist or is invalid
      }

      slides.push({ name: dir.name, metadata });
    }

    // Display each slide deck
    for (const slide of slides) {
      if (slide.metadata) {
        console.log(chalk.cyan(`  ${slide.name}`));
        console.log(chalk.gray(`    Pages: ${slide.metadata.pageCount}`));
        console.log(
          chalk.gray(
            `    Created: ${new Date(
              slide.metadata.createdAt
            ).toLocaleString()}`
          )
        );
        if (slide.metadata.title) {
          console.log(chalk.gray(`    Title: ${slide.metadata.title}`));
        }
      } else {
        console.log(chalk.cyan(`  ${slide.name}`));
        console.log(chalk.gray(`    (No metadata available)`));
      }
      console.log();
    }

    console.log(chalk.gray(`Total: ${slides.length} slide deck(s)\n`));
  } catch (error) {
    console.error(chalk.red("Failed to list slides"));
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}
