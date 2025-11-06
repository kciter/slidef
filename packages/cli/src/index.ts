#!/usr/bin/env node

// Import polyfills FIRST before any other imports
import "./polyfills.js";

import { Command } from "commander";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initCommand } from "./commands/init.js";
import { devCommand } from "./commands/dev.js";
import { importCommand } from "./commands/import.js";
import { publishCommand } from "./commands/publish.js";
import { listCommand } from "./commands/list.js";
import { removeCommand } from "./commands/remove.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8")
);

const program = new Command();

program
  .name("slidef")
  .description("CLI tool for converting PDF slides to web-viewable format")
  .version(packageJson.version);

program
  .command("init")
  .description("Initialize a new Slidef project")
  .option("-t, --title <title>", "Project title", "Slide Presentations")
  .option(
    "-s, --subtitle <subtitle>",
    "Project subtitle",
    "View and manage your slide decks"
  )
  .option(
    "-b, --base-url <url>",
    "Base URL for asset paths (e.g., '/' or '/talks/')",
    "/"
  )
  .action(initCommand);

program
  .command("dev")
  .description("Start development server with web UI")
  .option("-p, --port <number>", "Port number", "3000")
  .option("-s, --slides <dir>", "Slides directory", "slides")
  .action(devCommand);

program
  .command("import")
  .description("Import PDF file as slide deck")
  .argument("<pdf-file>", "PDF file path to import")
  .option("-n, --name <name>", "Slide name (defaults to PDF filename)")
  .option("-s, --scale <number>", "Scale factor for image resolution", "2")
  .option(
    "-f, --format <format>",
    "Image format: png, jpeg, or webp",
    "webp"
  )
  .option("-q, --quality <number>", "Image quality (0-100)", "85")
  .action(importCommand);

program
  .command("publish")
  .description("Generate static site for all slides")
  .option(
    "-o, --output <dir>",
    'Output directory (defaults to config.publishDir or "public")'
  )
  .option(
    "-s, --slides <dir>",
    'Slides directory (defaults to config.slidesDir or "slides")'
  )
  .action(publishCommand);

program.command("list").description("List all slide decks").action(listCommand);

program
  .command("remove")
  .description("Remove a slide deck")
  .argument("<slide-name>", "Name of the slide deck to remove")
  .action(removeCommand);

program.parse();
