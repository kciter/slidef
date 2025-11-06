import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import ora from "ora";

interface InitOptions {
  title?: string;
  subtitle?: string;
  baseUrl?: string;
}

export async function initCommand(options: InitOptions) {
  const spinner = ora("Initializing Slidef project...").start();

  try {
    const cwd = process.cwd();

    // Check if already initialized
    const slidesDir = path.join(cwd, "slides");
    try {
      await fs.access(slidesDir);
      spinner.warn(
        chalk.yellow("Slidef project already exists in this directory")
      );
      return;
    } catch {
      // Directory doesn't exist, continue
    }

    // Create slides directory
    await fs.mkdir(slidesDir, { recursive: true });

    // Create config file
    const config = {
      title: options.title || "Slide Presentations",
      subtitle: options.subtitle || "View and manage your slide decks",
      baseUrl: options.baseUrl || "/",
      publishDir: "public",
      slidesDir: "slides",
      theme: {
        primaryColor: "#007bff",
        progressColor: "#A020F0",
        fontFamily: "system-ui, -apple-system, sans-serif",
      },
    };

    await fs.writeFile(
      path.join(cwd, "slidef.config.json"),
      JSON.stringify(config, null, 2),
      "utf-8"
    );

    // Create .gitignore
    const gitignore = `# Slidef
node_modules/
*.log
.DS_Store
`;
    await fs.writeFile(path.join(cwd, ".gitignore"), gitignore, "utf-8");

    spinner.succeed(chalk.green("Slidef project initialized!"));

    console.log(chalk.gray("\nProject structure:"));
    console.log(chalk.gray("  ./"));
    console.log(chalk.gray("  ├── slidef.config.json"));
    console.log(chalk.gray("  ├── slides/"));
    console.log(chalk.gray("  └── .gitignore"));

    console.log(chalk.green("\n✨ Next steps:"));
    console.log(
      chalk.gray(
        `  1. Import a PDF: ${chalk.cyan("slidef import presentation.pdf")}`
      )
    );
    console.log(
      chalk.gray(`  2. Start dev server: ${chalk.cyan("slidef dev")}`)
    );
    console.log(
      chalk.gray(`  3. Publish to static site: ${chalk.cyan("slidef publish")}`)
    );
  } catch (error) {
    spinner.fail(chalk.red("Initialization failed"));
    console.error(error);
    process.exit(1);
  }
}
