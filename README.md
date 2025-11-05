# Slidef

Slidef is a CLI tool that converts your PDF presentations into a modern, web-based slide viewer. Perfect for sharing presentations, creating slide archives, or building your own slide hosting platform.

## Features

- **PDF to Images**: Automatically converts PDF slides to high-quality PNG images
- **Web Viewer**: Beautiful, responsive slide viewer with keyboard navigation
- **Dev Server**: Live development server with hot reload
- **Static Export**: Generate static sites for easy deployment (GitHub Pages, Netlify, etc.)
- **Slide Management**: Edit slide metadata, titles, descriptions, and dates via web UI
- **Theme Customization**: Customize colors and fonts to match your brand

## Installation

### Option 1: Quick Start with npm init (Recommended)

```bash
npm init slidef my-slides
cd my-slides
```

This will create a new project directory, install Slidef, and initialize the project automatically.

### Option 2: Global Installation

```bash
npm install -g @slidef/cli
# or
pnpm add -g @slidef/cli
```

## Quick Start

### Using npm init (if not already initialized)

```bash
npm init slidef my-slides
cd my-slides
```

### Using global installation

```bash
mkdir my-slides
cd my-slides
slidef init
```

This creates:
```
my-slides/
├── slidef.config.json
├── slides/
└── .gitignore
```

### 2. Import your first PDF

```bash
slidef import presentation.pdf
```

Your slides will be converted and saved to:
```
slides/
└── presentation/
    ├── images/
    │   ├── slide-001.png
    │   ├── slide-002.png
    │   └── ...
    └── metadata.json
```

### 3. Start the dev server

```bash
slidef dev
```

Open http://localhost:3000 to view your slides!

### 4. Publish as static site

```bash
slidef publish
```

Your static site will be generated in the `public/` directory, ready to deploy anywhere.

## Commands

### `slidef init`

Initialize a new Slidef project in the current directory.

**Options:**
- `--title <title>` - Set the project title (default: "Slide Presentations")
- `--subtitle <subtitle>` - Set the project subtitle

**Example:**
```bash
slidef init --title "My Presentations" --subtitle "Conference talks and workshops"
```

### `slidef import <pdf-file>`

Import and convert a PDF file to slides.

**Options:**
- `--name <name>` - Custom name for the slide deck (default: PDF filename)
- `--scale <number>` - Image resolution scale factor (default: 2)

**Example:**
```bash
slidef import talk.pdf --name "my-conference-talk" --scale 3
```

### `slidef dev`

Start a development server with live reload.

**Options:**
- `--port <port>` - Server port (default: 3000)
- `--slides <dir>` - Slides directory (default: "slides")

**Example:**
```bash
slidef dev --port 8080
```

**Features:**
- Web-based slide management (import, edit, delete)
- Live reload on file changes
- Theme preview

### `slidef publish`

Generate a static site for deployment.

**Options:**
- `--output <dir>` - Output directory (default: "public")
- `--slides <dir>` - Slides directory (default: "slides")

**Example:**
```bash
slidef publish --output dist
```

## Configuration

The `slidef.config.json` file allows you to customize your slide viewer:

```json
{
  "title": "My Slide Presentations",
  "subtitle": "View and manage your slide decks",
  "publishDir": "public",
  "slidesDir": "slides",
  "theme": {
    "primaryColor": "#007bff",
    "progressColor": "#A020F0",
    "fontFamily": "system-ui, -apple-system, sans-serif"
  }
}
```

### Theme Options

- `primaryColor` - Primary accent color for buttons and links
- `backgroundColor` - Background color for the viewer
- `textColor` - Primary text color
- `progressColor` - Progress bar color
- `fontFamily` - Font family for the entire UI

## Slide Metadata

Each slide deck has a `metadata.json` file with the following structure:

```json
{
  "name": "presentation",
  "filename": "presentation.pdf",
  "title": "My Awesome Presentation",
  "description": "A talk about something interesting",
  "pageCount": 42,
  "createdAt": "2025-11-05",
  "sha256": "abc123..."
}
```

You can edit `title`, `description`, and `createdAt` through the web UI in dev mode.

## Deployment

### GitHub Pages

1. Publish your slides:
   ```bash
   slidef publish --output docs
   ```

2. Push to GitHub and enable GitHub Pages from the `docs` folder in repository settings.

### Netlify / Vercel

1. Publish your slides:
   ```bash
   slidef publish
   ```

2. Deploy the `public/` directory using Netlify or Vercel.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
