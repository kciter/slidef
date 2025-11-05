#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import prompts from 'prompts';
import ora from 'ora';

interface PackageManager {
  name: string;
  installCmd: string;
  execCmd: string;
}

const packageManagers: Record<string, PackageManager> = {
  npm: {
    name: 'npm',
    installCmd: 'npm install',
    execCmd: 'npx',
  },
  pnpm: {
    name: 'pnpm',
    installCmd: 'pnpm install',
    execCmd: 'pnpm',
  },
  yarn: {
    name: 'yarn',
    installCmd: 'yarn',
    execCmd: 'yarn',
  },
};

async function detectPackageManager(): Promise<PackageManager> {
  // Check if running via npm init/create
  const userAgent = process.env.npm_config_user_agent;

  if (userAgent) {
    if (userAgent.startsWith('pnpm')) return packageManagers.pnpm;
    if (userAgent.startsWith('yarn')) return packageManagers.yarn;
  }

  // Default to npm
  return packageManagers.npm;
}

async function directoryExists(dir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
        return;
      }
      resolve();
    });

    child.on('error', reject);
  });
}

async function main() {
  console.log(chalk.cyan.bold('\n✨ Create Slidef Project\n'));

  const args = process.argv.slice(2);
  let projectName = args[0];

  // Prompt for project name if not provided
  if (!projectName) {
    const response = await prompts({
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-slides',
      validate: (value) =>
        value.trim().length === 0 ? 'Project name is required' : true,
    });

    if (!response.projectName) {
      console.log(chalk.red('\n✖ Project creation cancelled'));
      process.exit(1);
    }

    projectName = response.projectName;
  }

  const targetDir = path.resolve(process.cwd(), projectName);

  // Check if directory already exists
  if (await directoryExists(targetDir)) {
    const response = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `Directory ${chalk.cyan(projectName)} already exists. Continue anyway?`,
      initial: false,
    });

    if (!response.overwrite) {
      console.log(chalk.red('\n✖ Project creation cancelled'));
      process.exit(1);
    }
  } else {
    // Create project directory
    await fs.mkdir(targetDir, { recursive: true });
  }

  console.log(chalk.gray(`\nCreating project in ${chalk.cyan(targetDir)}...\n`));

  // Detect package manager
  const pkgManager = await detectPackageManager();
  console.log(chalk.gray(`Using ${chalk.cyan(pkgManager.name)} as package manager\n`));

  // Create package.json
  const spinner = ora('Creating package.json...').start();

  const packageJson = {
    name: projectName,
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'slidef dev',
      build: 'slidef publish',
    },
    devDependencies: {
      '@slidef/cli': '^1.0.0',
    },
  };

  await fs.writeFile(
    path.join(targetDir, 'package.json'),
    JSON.stringify(packageJson, null, 2) + '\n',
    'utf-8'
  );

  spinner.succeed('Created package.json');

  // Install dependencies
  spinner.start('Installing dependencies...');

  try {
    await runCommand(
      pkgManager.installCmd.split(' ')[0],
      pkgManager.installCmd.split(' ').slice(1),
      targetDir
    );
    spinner.succeed('Dependencies installed');
  } catch (error) {
    spinner.fail('Failed to install dependencies');
    throw error;
  }

  // Run slidef init
  spinner.start('Initializing Slidef project...');

  try {
    const execArgs = pkgManager.execCmd === 'npx'
      ? ['slidef', 'init']
      : ['exec', 'slidef', 'init'];

    await runCommand(pkgManager.execCmd, execArgs, targetDir);
    spinner.succeed('Slidef project initialized');
  } catch (error) {
    spinner.fail('Failed to initialize project');
    throw error;
  }

  // Success message
  console.log(chalk.green.bold('\n✓ Project created successfully!\n'));
  console.log(chalk.gray('Next steps:\n'));
  console.log(chalk.cyan(`  cd ${projectName}`));
  console.log(chalk.cyan('  slidef import presentation.pdf'));
  console.log(chalk.cyan(`  ${pkgManager.name} run dev`));
  console.log();
}

main().catch((error) => {
  console.error(chalk.red('\n✖ Error creating project:'));
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
