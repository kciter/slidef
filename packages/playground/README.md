# Slidef Playground

Test environment for Slidef CLI as if it were installed globally.

## Usage

From the playground directory:

```bash
# Initialize a new Slidef project
pnpm slidef init

# Import a PDF slide
pnpm slidef import path/to/presentation.pdf

# List all slide decks
pnpm slidef list

# Start development server
pnpm slidef dev

# Publish to static site
pnpm slidef publish

# Remove a slide deck
pnpm slidef remove slide-name
```

## Setup

Install dependencies from the root:

```bash
cd ../..
pnpm install
```

Build the CLI:

```bash
pnpm build
```

Now you can test the CLI commands in this playground directory!
