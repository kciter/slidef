import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { getAllSlides, saveSlideIndex } from '../utils/file.js';
import type { PublishOptions } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate CSS for theme customization
 */
function generateThemeStyles(theme: any): string {
  const styles: string[] = [':root {'];

  if (theme.primaryColor) {
    styles.push(`  --primary-color: ${theme.primaryColor};`);
  }
  if (theme.backgroundColor) {
    styles.push(`  --bg-primary: ${theme.backgroundColor};`);
  }
  if (theme.textColor) {
    styles.push(`  --text-primary: ${theme.textColor};`);
  }
  if (theme.progressColor) {
    styles.push(`  --progress-fill: ${theme.progressColor};`);
  }
  if (theme.fontFamily) {
    styles.push(`  --font-family: ${theme.fontFamily};`);
  }

  styles.push('}');

  if (theme.fontFamily) {
    styles.push(`body { font-family: ${theme.fontFamily}; }`);
  }

  return styles.join('\n');
}

export async function publishCommand(options: PublishOptions): Promise<void> {
  const spinner = ora('Publishing slides...').start();

  try {
    const cwd = process.cwd();

    // Load config
    let config: any = {
      publishDir: 'public',
      slidesDir: 'slides',
    };

    try {
      const configPath = path.join(cwd, 'slidef.config.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      config = { ...config, ...JSON.parse(configData) };
    } catch {
      // Config doesn't exist, use defaults
    }

    const slidesDir = path.resolve(options.slides || config.slidesDir || 'slides');
    const outputDir = path.resolve(options.output || config.publishDir || 'public');

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    spinner.text = 'Scanning slides directory...';

    // Get all slides
    const slides = await getAllSlides(slidesDir);

    if (slides.length === 0) {
      spinner.warn(chalk.yellow('No slides found to publish'));
      console.log(chalk.gray(`\nRun ${chalk.cyan('slidef convert <pdf-file>')} to add slides first`));
      return;
    }

    spinner.text = 'Generating slide index...';

    // Save slide index
    await saveSlideIndex(outputDir, slides);

    spinner.text = 'Copying viewer files...';

    // Copy viewer files from viewer package
    const viewerDir = path.join(__dirname, '../../../viewer/src');

    // Copy HTML files
    await fs.copyFile(
      path.join(viewerDir, 'index.html'),
      path.join(outputDir, 'index.html')
    );
    await fs.copyFile(
      path.join(viewerDir, 'viewer.html'),
      path.join(outputDir, 'viewer.html')
    );

    // Copy CSS directory
    const cssOutputDir = path.join(outputDir, 'css');
    await fs.mkdir(cssOutputDir, { recursive: true });
    await copyDirectory(path.join(viewerDir, 'css'), cssOutputDir);

    // Copy JS directory
    const jsOutputDir = path.join(outputDir, 'js');
    await fs.mkdir(jsOutputDir, { recursive: true });
    await copyDirectory(path.join(viewerDir, 'js'), jsOutputDir);

    spinner.text = 'Copying slides...';

    // Ensure slides directory exists in output
    const outputSlidesDir = path.join(outputDir, 'slides');
    await fs.mkdir(outputSlidesDir, { recursive: true });

    // Copy slides directory if they're not already in output
    if (path.resolve(slidesDir) !== path.resolve(outputSlidesDir)) {
      // Copy all slide directories
      const entries = await fs.readdir(slidesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const srcDir = path.join(slidesDir, entry.name);
          const destDir = path.join(outputSlidesDir, entry.name);

          // Copy directory recursively
          await copyDirectory(srcDir, destDir);
        }
      }
    }

    spinner.text = 'Creating slide routes...';

    // Create directory for each slide with index.html (for clean URLs without .html)
    const viewerHtml = await fs.readFile(path.join(viewerDir, 'viewer.html'), 'utf-8');
    for (const slide of slides) {
      const slideRouteDir = path.join(outputDir, slide.name);
      await fs.mkdir(slideRouteDir, { recursive: true });
      const slideHtmlPath = path.join(slideRouteDir, 'index.html');
      await fs.writeFile(slideHtmlPath, viewerHtml, 'utf-8');
    }

    spinner.succeed(chalk.green(`Successfully published ${chalk.cyan(slides.length)} slide(s)`));

    console.log(chalk.gray('\nGenerated files:'));
    console.log(chalk.gray(`  ${outputDir}/`));
    console.log(chalk.gray(`  ├── index.html`));
    console.log(chalk.gray(`  ├── viewer.html`));
    console.log(chalk.gray(`  ├── css/`));
    console.log(chalk.gray(`  ├── js/`));
    console.log(chalk.gray(`  ├── slides-index.json`));
    console.log(chalk.gray(`  └── slides/`));

    console.log(chalk.green('\n✨ Your slides are ready!'));
    console.log(chalk.gray(`Open ${chalk.cyan(path.join(outputDir, 'index.html'))} in a browser to view`));
    console.log(chalk.gray('Or deploy to GitHub Pages for online access'));
  } catch (error) {
    spinner.fail(chalk.red('Publish failed'));
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Recursively copy directory
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
