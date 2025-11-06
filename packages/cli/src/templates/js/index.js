/**
 * Index page - Slide list with dev mode support
 */

class SlideIndex {
  constructor() {
    this.slidesContainer = document.getElementById("slides-container");
    this.emptyState = document.getElementById("empty-state");
    this.importBtn = document.getElementById("import-btn");
    this.importModal = document.getElementById("import-modal");
    this.importForm = document.getElementById("import-form");
    this.importProgress = document.getElementById("import-progress");
    this.progressMessage = document.getElementById("progress-message");
    this.editModal = document.getElementById("edit-modal");
    this.editForm = document.getElementById("edit-form");
    this.currentEditingSlide = null;
    this.isDevMode = false;

    this.init();
  }

  async init() {
    // Check if we're in dev mode
    await this.detectDevMode();

    // Setup event listeners
    this.setupEventListeners();

    // Connect to live reload in dev mode
    if (this.isDevMode) {
      this.connectLiveReload();
    }

    // Load and render slides
    try {
      const slides = await this.loadSlides();
      this.renderSlides(slides);
    } catch (error) {
      console.error("Failed to load slides:", error);
      this.showEmptyState();
    }
  }

  async detectDevMode() {
    // Check if API is available (dev mode)
    try {
      const response = await fetch("/api/slides");
      if (response.ok) {
        this.isDevMode = true;
        this.importBtn.classList.remove("hidden");
      }
    } catch {
      // Not in dev mode, API not available
      this.isDevMode = false;
    }
  }

  setupEventListeners() {
    if (!this.isDevMode) return;

    // Import button
    this.importBtn.addEventListener("click", () => this.openImportModal());

    // Modal close buttons
    document
      .getElementById("close-modal")
      .addEventListener("click", () => this.closeImportModal());
    document
      .getElementById("cancel-import")
      .addEventListener("click", () => this.closeImportModal());

    // Close modal on backdrop click
    this.importModal.addEventListener("click", (e) => {
      if (e.target === this.importModal) {
        this.closeImportModal();
      }
    });

    // Import form submit
    this.importForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleImport();
    });

    // Edit modal events
    document
      .getElementById("close-edit-modal")
      .addEventListener("click", () => this.closeEditModal());
    document
      .getElementById("cancel-edit")
      .addEventListener("click", () => this.closeEditModal());

    this.editModal.addEventListener("click", (e) => {
      if (e.target === this.editModal) {
        this.closeEditModal();
      }
    });

    this.editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleEditSubmit();
    });

    // Auto-fill slide name from PDF filename
    document.getElementById("pdf-file").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file && !document.getElementById("slide-name").value) {
        const name = file.name.replace(/\.pdf$/i, "");
        document.getElementById("slide-name").value = name;
      }
    });
  }

  async loadSlides() {
    if (this.isDevMode) {
      // Dev mode: use API
      const response = await fetch("/api/slides");
      if (response.ok) {
        const data = await response.json();
        return data.slides;
      }
      throw new Error("Failed to load slides from API");
    } else {
      // Static mode: check for preloaded data or index file
      if (window.__SLIDES_DATA__) {
        return window.__SLIDES_DATA__.slides;
      }

      // Try to load slides-index.json
      try {
        const response = await fetch("slides-index.json");
        if (response.ok) {
          const index = await response.json();
          return index.slides;
        }
      } catch (error) {
        console.log("slides-index.json not found");
      }

      return [];
    }
  }

  renderSlides(slides) {
    if (slides.length === 0) {
      this.showEmptyState();
      return;
    }

    this.emptyState.classList.add("hidden");
    this.slidesContainer.classList.remove("hidden");
    this.slidesContainer.innerHTML = "";

    slides.forEach((slide, index) => {
      const card = this.createSlideCard(slide);
      // Stagger animation delay for each card
      card.style.animationDelay = `${index * 0.1}s`;
      this.slidesContainer.appendChild(card);
    });
  }

  createSlideCard(slide) {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";

    const card = document.createElement("a");
    card.className = "slide-card";
    // Use clean URLs for both dev and static modes
    card.href = `${slide.name}?from=list`;

    const thumbnail = document.createElement("img");
    thumbnail.className = "slide-thumbnail";
    const format = slide.format || "webp";
    const baseUrl = window.BASE_URL || "";
    thumbnail.src = `${baseUrl}/slides/${slide.name}/images/slide-001.${format}`;
    thumbnail.alt = `${slide.title || slide.name} thumbnail`;
    thumbnail.loading = "lazy";
    thumbnail.onerror = () => {
      thumbnail.style.display = "none";
    };

    const info = document.createElement("div");
    info.className = "slide-info";

    const name = document.createElement("h3");
    name.className = "slide-name";
    name.textContent = slide.title || slide.name;

    const meta = document.createElement("div");
    meta.className = "slide-meta";

    const pages = document.createElement("div");
    pages.className = "slide-pages";
    pages.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H4z"/>
      </svg>
      ${slide.pageCount} slides
    `;

    const date = document.createElement("div");
    date.className = "slide-date";
    date.textContent = this.formatDate(slide.createdAt);

    meta.appendChild(pages);
    meta.appendChild(date);

    info.appendChild(name);
    info.appendChild(meta);

    card.appendChild(thumbnail);
    card.appendChild(info);

    // Add management controls in dev mode
    if (this.isDevMode) {
      const actions = this.createSlideActions(slide);
      card.appendChild(actions);
    }

    wrapper.appendChild(card);
    return wrapper;
  }

  createSlideActions(slide) {
    const actions = document.createElement("div");
    actions.className = "slide-actions";

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.className = "slide-action-btn edit";
    editBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5z"/>
      </svg>
    `;
    editBtn.title = "Edit slide";
    editBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleEditSlide(slide);
    });

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "slide-action-btn delete";
    deleteBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
      </svg>
    `;
    deleteBtn.title = "Delete slide";
    deleteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleDeleteSlide(slide);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    return actions;
  }

  formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

    return date.toLocaleDateString();
  }

  showEmptyState() {
    this.emptyState.classList.remove("hidden");
    this.slidesContainer.classList.add("hidden");
  }

  // Modal methods
  openImportModal() {
    this.importModal.classList.remove("hidden");
    this.importForm.classList.remove("hidden");
    this.importProgress.classList.add("hidden");
    this.importForm.reset();
  }

  closeImportModal() {
    this.importModal.classList.add("hidden");
  }

  async handleImport() {
    const formData = new FormData(this.importForm);

    // Show progress
    this.importForm.classList.add("hidden");
    this.importProgress.classList.remove("hidden");
    this.progressMessage.textContent = "Importing PDF...";

    // Disable live reload during import to prevent interruption
    this.isImporting = true;

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Import failed");
      }

      const result = await response.json();

      // Success
      this.progressMessage.textContent = "Import successful!";
      this.isImporting = false;

      // Close modal after a short delay
      setTimeout(() => {
        this.closeImportModal();
        // Reload slides
        this.reloadSlides();
      }, 1000);
    } catch (error) {
      console.error("Import error:", error);

      // Check if slides were actually created despite the error
      // (this can happen if the import succeeded but the response failed)
      this.progressMessage.textContent = "Checking import status...";

      setTimeout(async () => {
        try {
          const slides = await this.loadSlides();
          // If we have more slides than before, import likely succeeded
          this.renderSlides(slides);
          this.closeImportModal();
        } catch {
          // If we still can't load, show the error
          alert(`Import failed: ${error.message}`);
          this.importForm.classList.remove("hidden");
          this.importProgress.classList.add("hidden");
        }
        this.isImporting = false;
      }, 1000);
    }
  }

  async handleEditSlide(slide) {
    this.currentEditingSlide = slide;
    document.getElementById("edit-title").value = slide.title || slide.name;
    document.getElementById("edit-description").value = slide.description || "";

    // createdAt is already in YYYY-MM-DD format
    document.getElementById("edit-created-at").value = slide.createdAt;

    this.editModal.classList.remove("hidden");
  }

  closeEditModal() {
    this.editModal.classList.add("hidden");
    this.currentEditingSlide = null;
  }

  async handleEditSubmit() {
    if (!this.currentEditingSlide) return;

    const formData = new FormData(this.editForm);

    // Use date string directly (YYYY-MM-DD format)
    const updates = {
      title: formData.get("title"),
      description: formData.get("description"),
      createdAt: formData.get("createdAt"),
    };

    try {
      const response = await fetch(
        `/api/slides/${this.currentEditingSlide.name}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update slide");
      }

      this.closeEditModal();
      // Reload slides
      this.reloadSlides();
    } catch (error) {
      console.error("Edit error:", error);
      alert(`Failed to update slide: ${error.message}`);
    }
  }

  async handleDeleteSlide(slide) {
    if (
      !confirm(
        `Are you sure you want to delete "${slide.title || slide.name}"?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/slides/${slide.name}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete slide");
      }

      // Reload slides
      this.reloadSlides();
    } catch (error) {
      console.error("Delete error:", error);
      alert(`Failed to delete slide: ${error.message}`);
    }
  }

  async reloadSlides() {
    try {
      const slides = await this.loadSlides();
      this.renderSlides(slides);
    } catch (error) {
      console.error("Failed to reload slides:", error);
    }
  }

  connectLiveReload() {
    // Only connect in dev mode
    if (!this.isDevMode) {
      return;
    }

    const eventSource = new EventSource("/api/live-reload");

    eventSource.onopen = () => {
      console.log("🔄 Live reload connected");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          console.log("✅ Live reload ready");
        } else if (data.type === "reload") {
          // Skip reload if currently importing to avoid interrupting the request
          if (this.isImporting) {
            console.log("⏸️  Skipping reload: import in progress");
            return;
          }

          console.log(
            `🔄 Reloading: ${data.reason} (${data.file || "unknown"})`
          );
          // Reload the page after a short delay to ensure file writes are complete
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      } catch (error) {
        console.error("Failed to parse live reload message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("❌ Live reload connection error:", error);
      eventSource.close();

      // Try to reconnect after 3 seconds (only in dev mode)
      if (this.isDevMode) {
        setTimeout(() => {
          console.log("🔄 Attempting to reconnect live reload...");
          this.connectLiveReload();
        }, 3000);
      }
    };
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new SlideIndex());
} else {
  new SlideIndex();
}
