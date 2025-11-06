import * as fs from "fs/promises";
import * as path from "path";
import chalk from "chalk";
import ora from "ora";

export async function removeCommand(slideName: string): Promise<void> {
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
  const slideDir = path.join(slidesDir, slideName);
  const spinner = ora(`Removing slide deck: ${chalk.cyan(slideName)}`).start();

  try {
    // Check if slide directory exists
    try {
      await fs.access(slideDir);
    } catch {
      spinner.fail(chalk.red(`Slide deck not found: ${slideName}`));
      console.log(
        chalk.gray('\nRun "slidef list" to see available slide decks.')
      );
      process.exit(1);
    }

    // Remove the directory and all its contents
    await fs.rm(slideDir, { recursive: true, force: true });

    spinner.succeed(
      chalk.green(`Successfully removed slide deck: ${chalk.cyan(slideName)}`)
    );
  } catch (error) {
    spinner.fail(chalk.red("Failed to remove slide deck"));
    console.error(
      chalk.red("\nError:"),
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}
