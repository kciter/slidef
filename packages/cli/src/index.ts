#!/usr/bin/env node

import { Command } from 'commander';
import { importCommand } from './commands/import.js';
import { publishCommand } from './commands/publish.js';
import { listCommand } from './commands/list.js';
import { removeCommand } from './commands/remove.js';

const program = new Command();

program
  .name('slidef')
  .description('CLI tool for converting PDF slides to web-viewable format')
  .version('0.0.1');

program
  .command('import')
  .description('Import PDF file as slide deck')
  .argument('<pdf-file>', 'PDF file path to import')
  .option('-n, --name <name>', 'Slide name (defaults to PDF filename)')
  .option('-s, --scale <number>', 'Scale factor for image resolution', '2')
  .action(importCommand);

program
  .command('publish')
  .description('Generate static site for all slides')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('-s, --slides <dir>', 'Slides directory', 'slides')
  .action(publishCommand);

program
  .command('list')
  .description('List all slide decks')
  .action(listCommand);

program
  .command('remove')
  .description('Remove a slide deck')
  .argument('<slide-name>', 'Name of the slide deck to remove')
  .action(removeCommand);

program.parse();
