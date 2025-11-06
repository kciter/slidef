import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";
import express from "express";
import multer from "multer";
import chokidar from "chokidar";
import { convertPdfToImages } from "../utils/pdf.js";
import {
  loadSlides,
  saveSlideIndex,
  calculateFileHash,
  generateUniqueSlideName,
} from "../utils/file.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DevOptions {
  port?: number;
  slides?: string;
}

/**
 * Generate CSS for theme customization
 */
function generateThemeStyles(theme: any): string {
  const styles: string[] = [":root {"];

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

  styles.push("}");

  if (theme.fontFamily) {
    styles.push(`body { font-family: ${theme.fontFamily}; }`);
  }

  return styles.join("\n");
}

export async function devCommand(options: DevOptions) {
  const port = options.port || 3000;
  const cwd = process.cwd();

  const spinner = ora("Starting development server...").start();

  try {
    // Load config
    let config: any = {
      title: "Slide Presentations",
      subtitle: "View and manage your slide decks",
      baseUrl: "/",
      publishDir: "public",
      slidesDir: "slides",
    };

    try {
      const configPath = path.join(cwd, "slidef.config.json");
      const configData = await fs.readFile(configPath, "utf-8");
      config = { ...config, ...JSON.parse(configData) };
    } catch {
      // Config doesn't exist, use defaults
    }

    const slidesDir = path.resolve(
      options.slides || config.slidesDir || "slides"
    );

    // Ensure slides directory exists
    await fs.mkdir(slidesDir, { recursive: true });

    const app = express();

    // Middleware
    app.use(express.json());

    // Setup multer for file uploads
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        cb(null, slidesDir);
      },
      filename: (req, file, cb) => {
        cb(null, file.originalname);
      },
    });
    const upload = multer({ storage });

    // Serve viewer files from templates directory
    const templatesDir = path.join(__dirname, "../templates");
    app.use("/css", express.static(path.join(templatesDir, "css")));
    app.use("/js", express.static(path.join(templatesDir, "js")));

    // Serve slides directory directly (not from public)
    app.use("/slides", express.static(slidesDir));

    // Serve other static files from cwd (for user assets)
    app.use(express.static(cwd));

    // API: Get slides index
    app.get("/api/slides", async (req, res) => {
      try {
        const slides = await loadSlides(slidesDir);
        res.json({ slides });
      } catch (error) {
        res.status(500).json({ error: "Failed to load slides" });
      }
    });

    // API: Get config
    app.get("/api/config", async (req, res) => {
      res.json(config);
    });

    // API: Update config
    app.post("/api/config", async (req, res) => {
      try {
        const newConfig = { ...config, ...req.body };
        await fs.writeFile(
          path.join(cwd, "slidef.config.json"),
          JSON.stringify(newConfig, null, 2),
          "utf-8"
        );
        config = newConfig;
        res.json({ success: true, config: newConfig });
      } catch (error) {
        res.status(500).json({ error: "Failed to update config" });
      }
    });

    // API: Import PDF
    app.post("/api/import", upload.single("pdf"), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const pdfPath = req.file.path;

        // Calculate PDF hash
        const pdfHash = await calculateFileHash(pdfPath);

        const baseName =
          req.body.name || path.basename(req.file.originalname, ".pdf");

        // Generate unique normalized slide name
        const slideName = await generateUniqueSlideName(slidesDir, baseName);
        const scale = parseFloat(req.body.scale || "2");

        // Convert PDF to images
        const slideDir = path.join(slidesDir, slideName);
        const imagesDir = path.join(slideDir, "images");
        await fs.mkdir(imagesDir, { recursive: true });

        // Use relative path for PDF conversion
        const relativeImagesDir = path.relative(process.cwd(), imagesDir);
        const pageCount = await convertPdfToImages(
          pdfPath,
          relativeImagesDir,
          scale
        );

        // Save metadata
        // Use provided date or default to today
        const dateStr = req.body.createdAt ||
          new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

        const metadata = {
          name: slideName,
          title: req.body.title || baseName,
          pageCount,
          createdAt: dateStr,
          sha256: pdfHash,
        };

        await fs.writeFile(
          path.join(slideDir, "metadata.json"),
          JSON.stringify(metadata, null, 2),
          "utf-8"
        );

        // Remove uploaded PDF
        await fs.unlink(pdfPath);

        res.json({ success: true, metadata });
      } catch (error) {
        console.error("Import error:", error);
        res.status(500).json({ error: "Failed to import PDF" });
      }
    });

    // API: Remove slide
    app.delete("/api/slides/:name", async (req, res) => {
      try {
        const slideName = req.params.name;
        const slideDir = path.join(slidesDir, slideName);
        await fs.rm(slideDir, { recursive: true, force: true });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to remove slide" });
      }
    });

    // API: Update slide metadata
    app.put("/api/slides/:name", async (req, res) => {
      try {
        const slideName = req.params.name;
        const slideDir = path.join(slidesDir, slideName);
        const metadataPath = path.join(slideDir, "metadata.json");

        const currentMetadata = JSON.parse(
          await fs.readFile(metadataPath, "utf-8")
        );
        const newMetadata = { ...currentMetadata, ...req.body };

        await fs.writeFile(
          metadataPath,
          JSON.stringify(newMetadata, null, 2),
          "utf-8"
        );

        res.json({ success: true, metadata: newMetadata });
      } catch (error) {
        res.status(500).json({ error: "Failed to update metadata" });
      }
    });

    // Serve index page
    app.get("/", async (req, res) => {
      const indexHtml = await fs.readFile(
        path.join(templatesDir, "index.html"),
        "utf-8"
      );
      const slides = await loadSlides(slidesDir);
      const slidesIndex = JSON.stringify({ slides });

      // Inject config and slides data
      let html = indexHtml
        .replace(
          "<title>Slidef - Slide Presentations</title>",
          `<title>Slidef - ${config.title}</title>`
        )
        .replace(
          '<h1 class="page-title">📚 Slide Presentations</h1>',
          `<h1 class="page-title">📚 ${config.title}</h1>`
        )
        .replace(
          '<p class="page-subtitle">View and manage your slide decks</p>',
          `<p class="page-subtitle">${config.subtitle}</p>`
        )
        .replace(
          "</body>",
          `<script>window.__SLIDES_DATA__ = ${slidesIndex};</script></body>`
        );

      // Inject theme customization
      if (config.theme) {
        const themeStyles = generateThemeStyles(config.theme);
        html = html.replace("</head>", `<style>${themeStyles}</style></head>`);
      }

      res.send(html);
    });

    // Serve viewer page with old URL for backwards compatibility
    app.get("/viewer.html", async (req, res) => {
      let html = await fs.readFile(
        path.join(templatesDir, "viewer.html"),
        "utf-8"
      );

      // Inject theme customization
      if (config.theme) {
        const themeStyles = generateThemeStyles(config.theme);
        html = html.replace("</head>", `<style>${themeStyles}</style></head>`);
      }

      res.send(html);
    });

    // Serve viewer page by slide name (e.g., /my-presentation)
    app.get("/:slideName", async (req, res, next) => {
      const slideName = req.params.slideName;

      // Skip if it's an API route or static file
      if (
        slideName.startsWith("api") ||
        slideName.startsWith("css") ||
        slideName.startsWith("js") ||
        slideName.startsWith("slides") ||
        slideName.includes(".")
      ) {
        return next();
      }

      // Check if slide exists
      const slideDir = path.join(slidesDir, slideName);
      try {
        await fs.access(slideDir);
        let html = await fs.readFile(
          path.join(templatesDir, "viewer.html"),
          "utf-8"
        );

        // Inject theme customization
        if (config.theme) {
          const themeStyles = generateThemeStyles(config.theme);
          html = html.replace(
            "</head>",
            `<style>${themeStyles}</style></head>`
          );
        }

        res.send(html);
      } catch {
        // Slide doesn't exist, continue to next handler
        next();
      }
    });

    // SSE endpoint for live reload
    const clients: express.Response[] = [];

    app.get("/api/live-reload", (req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Send initial connection message
      res.write('data: {"type":"connected"}\n\n');

      // Add client to list
      clients.push(res);

      // Remove client on disconnect
      req.on("close", () => {
        const index = clients.indexOf(res);
        if (index !== -1) {
          clients.splice(index, 1);
        }
      });
    });

    // Function to notify all clients
    const notifyClients = (event: string, data: any = {}) => {
      const message = `data: ${JSON.stringify({ type: event, ...data })}\n\n`;
      clients.forEach((client) => {
        try {
          client.write(message);
        } catch (error) {
          // Client disconnected, will be removed on 'close' event
        }
      });
    };

    // Setup file watcher
    const watcher = chokidar.watch(
      [slidesDir, templatesDir, path.join(cwd, "slidef.config.json")],
      {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 100,
        },
      }
    );

    watcher
      .on("add", (filepath) => {
        console.log(
          chalk.gray(`  File added: ${path.relative(cwd, filepath)}`)
        );
        notifyClients("reload", {
          reason: "file-added",
          file: path.relative(cwd, filepath),
        });
      })
      .on("change", (filepath) => {
        console.log(
          chalk.gray(`  File changed: ${path.relative(cwd, filepath)}`)
        );
        notifyClients("reload", {
          reason: "file-changed",
          file: path.relative(cwd, filepath),
        });
      })
      .on("unlink", (filepath) => {
        console.log(
          chalk.gray(`  File removed: ${path.relative(cwd, filepath)}`)
        );
        notifyClients("reload", {
          reason: "file-removed",
          file: path.relative(cwd, filepath),
        });
      });

    // Cleanup on process exit
    process.on("SIGINT", () => {
      console.log(chalk.yellow("\n\nShutting down..."));
      watcher.close();
      process.exit(0);
    });

    // Start server
    app.listen(port, () => {
      spinner.succeed(chalk.green("Development server started!"));
      console.log(chalk.cyan(`\n  ➜  Local:   http://localhost:${port}`));
      console.log(chalk.gray(`  ➜  Press Ctrl+C to stop\n`));
    });
  } catch (error) {
    spinner.fail(chalk.red("Failed to start server"));
    console.error(error);
    process.exit(1);
  }
}
