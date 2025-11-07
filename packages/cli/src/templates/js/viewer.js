/**
 * Slidef Viewer
 * Handles slide navigation, progress bar, and thumbnail preview
 */

class SlidefViewer {
  constructor() {
    // Get slide info from URL
    const params = new URLSearchParams(window.location.search);
    // Support both /slide-name and viewer.html?slide=slide-name formats
    const pathParts = window.location.pathname.split('/').filter(p => p);
    this.slideName = pathParts[pathParts.length - 1] === 'viewer.html'
      ? params.get("slide") || ""
      : pathParts[pathParts.length - 1] || params.get("slide") || "";
    this.currentSlide = parseInt(params.get("page") || "1", 10);

    // State
    this.totalSlides = 0;
    this.slideImages = [];
    this.metadata = null;
    this.hideControlsTimer = null;
    this.wheelThrottleTimer = null;

    // DOM elements
    this.slidesWrapper = document.getElementById("slides-wrapper");
    this.slidePrev = document.getElementById("slide-prev");
    this.slideCurrent = document.getElementById("slide-current");
    this.slideNext = document.getElementById("slide-next");
    this.slideLoading = document.getElementById("slide-loading");
    this.navAreaPrev = document.getElementById("nav-area-prev");
    this.navAreaNext = document.getElementById("nav-area-next");
    this.closeButton = document.getElementById("close-button");
    this.scrollModeToggle = document.getElementById("scroll-mode-toggle");
    this.overviewButton = document.getElementById("overview-button");
    this.shareButton = document.getElementById("share-button");
    this.fullscreenToggle = document.getElementById("fullscreen-toggle");
    this.progressBar = document.getElementById("progress-bar");
    this.progressFill = document.getElementById("progress-fill");
    this.thumbnailPreview = document.getElementById("thumbnail-preview");
    this.thumbnailImage = document.getElementById("thumbnail-image");
    this.thumbnailNumber = document.getElementById("thumbnail-number");
    this.scrollContainer = document.getElementById("scroll-container");
    this.overviewModal = document.getElementById("overview-modal");
    this.overviewModalClose = document.getElementById("overview-modal-close");
    this.overviewGrid = document.getElementById("overview-grid");
    this.shareModal = document.getElementById("share-modal");
    this.shareModalClose = document.getElementById("share-modal-close");
    this.shareLinkInput = document.getElementById("share-link-input");
    this.shareEmbedInput = document.getElementById("share-embed-input");
    this.copyLinkButton = document.getElementById("copy-link-button");
    this.copyEmbedButton = document.getElementById("copy-embed-button");

    // Setup image load event handlers
    this.setupImageLoadHandlers();

    this.init();
  }

  setupImageLoadHandlers() {
    [this.slidePrev, this.slideCurrent, this.slideNext].forEach((img) => {
      img.addEventListener("load", () => {
        img.classList.remove("loading");
        this.checkAllImagesLoaded();
      });
      img.addEventListener("error", () => {
        img.classList.remove("loading");
        this.checkAllImagesLoaded();
      });
    });
  }

  checkAllImagesLoaded() {
    const anyLoading = [this.slidePrev, this.slideCurrent, this.slideNext].some(
      (img) => img.classList.contains("loading") && img.src
    );
    if (!anyLoading) {
      this.slideLoading.style.display = "none";
    }
  }

  async init() {
    try {
      await this.loadMetadata();
      this.setupEventListeners();
      this.showSlide(this.currentSlide);

      // Update URL if page query is missing
      const params = new URLSearchParams(window.location.search);
      if (!params.has("page")) {
        const url = new URL(window.location);
        url.searchParams.set("page", this.currentSlide);
        window.history.replaceState({}, "", url);
      }

      // Enable scroll mode by default on mobile or if mode=scroll in URL
      const mode = params.get("mode");
      if (window.innerWidth <= 768 || mode === "scroll") {
        this.toggleScrollMode();
      }

      // Show close button only if coming from list page
      const isFromList = params.get("from") === "list";
      if (!isFromList) {
        this.closeButton.parentElement.style.display = "none";
      }
    } catch (error) {
      console.error("Failed to initialize viewer:", error);
    }
  }

  async loadMetadata() {
    const baseUrl = window.BASE_URL || "";
    const response = await fetch(`${baseUrl}/slides/${this.slideName}/metadata.json`);
    if (!response.ok) {
      throw new Error("Failed to load metadata");
    }

    this.metadata = await response.json();
    this.totalSlides = this.metadata.pageCount;

    // Generate image paths
    const format = this.metadata.format || "webp";
    this.slideImages = Array.from({ length: this.totalSlides }, (_, i) => {
      const pageNum = String(i + 1).padStart(3, "0");
      return `${baseUrl}/slides/${this.slideName}/images/slide-${pageNum}.${format}`;
    });
  }

  setupEventListeners() {
    // Navigation areas
    this.navAreaPrev.addEventListener("click", () => this.previousSlide());
    this.navAreaNext.addEventListener("click", () => this.nextSlide());

    // Close button
    this.closeButton.addEventListener("click", () => {
      const baseUrl = window.BASE_URL || "";
      window.location.href = baseUrl ? `${baseUrl}/` : "/";
    });

    // Scroll mode toggle
    this.scrollModeToggle.addEventListener("click", () =>
      this.toggleScrollMode()
    );

    // Overview button
    this.overviewButton.addEventListener("click", () =>
      this.openOverviewModal()
    );

    // Share button
    this.shareButton.addEventListener("click", () => this.openShareModal());

    // Fullscreen toggle
    this.fullscreenToggle.addEventListener("click", () =>
      this.toggleFullscreen()
    );

    // Overview modal close
    this.overviewModalClose.addEventListener("click", () =>
      this.closeOverviewModal()
    );

    // Prevent wheel events from affecting overview modal scroll
    this.overviewModal.addEventListener(
      "wheel",
      (e) => {
        e.stopPropagation();
      },
      { passive: true }
    );

    // Prevent wheel events from affecting share modal scroll
    this.shareModal.addEventListener(
      "wheel",
      (e) => {
        e.stopPropagation();
      },
      { passive: true }
    );

    // Share modal close
    this.shareModalClose.addEventListener("click", () =>
      this.closeShareModal()
    );
    this.shareModal.addEventListener("click", (e) => {
      if (e.target === this.shareModal) {
        this.closeShareModal();
      }
    });

    // Copy buttons
    this.copyLinkButton.addEventListener("click", () =>
      this.copyToClipboard(this.shareLinkInput.value, "Link copied!")
    );
    this.copyEmbedButton.addEventListener("click", () =>
      this.copyToClipboard(this.shareEmbedInput.value, "Embed code copied!")
    );

    // Share mode radio buttons - update URLs when changed
    document.querySelectorAll('input[name="share-mode"]').forEach((radio) => {
      radio.addEventListener("change", () => this.updateShareURLs());
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => this.handleKeyPress(e));

    // Mouse wheel navigation (only in slide mode, not scroll mode)
    document.addEventListener("wheel", (e) => this.handleWheel(e), {
      passive: false,
    });

    // Progress bar click
    this.progressBar.addEventListener("click", (e) =>
      this.handleProgressClick(e)
    );

    // Progress bar hover for thumbnail
    this.progressBar.addEventListener("mousemove", (e) =>
      this.showThumbnail(e)
    );
    this.progressBar.addEventListener("mouseleave", () => this.hideThumbnail());

    // Prevent context menu on slide images
    this.slidePrev.addEventListener("contextmenu", (e) => e.preventDefault());
    this.slideCurrent.addEventListener("contextmenu", (e) =>
      e.preventDefault()
    );
    this.slideNext.addEventListener("contextmenu", (e) => e.preventDefault());

    // Update URL on slide change
    window.addEventListener("popstate", () => {
      const params = new URLSearchParams(window.location.search);
      const page = parseInt(params.get("page") || "1", 10);
      this.showSlide(page, false);
    });

    // Listen for fullscreen changes
    document.addEventListener("fullscreenchange", () => {
      this.updateFullscreenIcon(!!document.fullscreenElement);
    });
    document.addEventListener("webkitfullscreenchange", () => {
      this.updateFullscreenIcon(!!document.webkitFullscreenElement);
    });

    // Show/hide controls on mouse move
    document.addEventListener("mousemove", () => this.showControls());

    // Initial show
    this.showControls();
  }

  showControls() {
    document.body.classList.add("controls-visible");

    // Clear existing timer
    if (this.hideControlsTimer) {
      clearTimeout(this.hideControlsTimer);
    }

    // Hide after 3 seconds
    this.hideControlsTimer = setTimeout(() => {
      document.body.classList.remove("controls-visible");
    }, 3000);
  }

  handleKeyPress(e) {
    // Handle ESC key for closing modals
    if (e.key === "Escape") {
      if (!this.overviewModal.classList.contains("hidden")) {
        e.preventDefault();
        this.closeOverviewModal();
        return;
      }
      if (!this.shareModal.classList.contains("hidden")) {
        e.preventDefault();
        this.closeShareModal();
        return;
      }
    }

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        e.preventDefault();
        this.previousSlide();
        break;
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
      case " ":
        e.preventDefault();
        this.nextSlide();
        break;
      case "Home":
        e.preventDefault();
        this.goToSlide(1);
        break;
      case "End":
        e.preventDefault();
        this.goToSlide(this.totalSlides);
        break;
    }
  }

  handleWheel(e) {
    // Don't handle wheel in scroll mode or when modal is open
    if (
      document.body.classList.contains("scroll-mode") ||
      !this.overviewModal.classList.contains("hidden")
    ) {
      return;
    }

    // Prevent default scroll behavior
    e.preventDefault();

    // Throttle wheel events to avoid too rapid navigation
    if (this.wheelThrottleTimer) {
      return;
    }

    this.wheelThrottleTimer = setTimeout(() => {
      this.wheelThrottleTimer = null;
    }, 300);

    // Navigate based on wheel direction
    if (e.deltaY > 0) {
      // Scroll down = next slide
      this.nextSlide();
    } else if (e.deltaY < 0) {
      // Scroll up = previous slide
      this.previousSlide();
    }
  }

  handleProgressClick(e) {
    const rect = this.progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const targetSlide = Math.max(
      1,
      Math.min(this.totalSlides, Math.ceil(percentage * this.totalSlides))
    );
    this.goToSlide(targetSlide);
  }

  showThumbnail(e) {
    const rect = this.progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const targetSlide = Math.max(
      1,
      Math.min(this.totalSlides, Math.ceil(percentage * this.totalSlides))
    );

    // Position thumbnail
    this.thumbnailPreview.style.left = `${e.clientX}px`;
    this.thumbnailPreview.style.transform = "translateX(-50%)";

    // Update thumbnail
    this.thumbnailImage.src = this.slideImages[targetSlide - 1];
    this.thumbnailNumber.textContent = `${targetSlide} / ${this.totalSlides}`;
    this.thumbnailPreview.classList.remove("hidden");
  }

  hideThumbnail() {
    this.thumbnailPreview.classList.add("hidden");
  }

  previousSlide() {
    if (this.currentSlide > 1) {
      this.goToSlide(this.currentSlide - 1);
    }
  }

  nextSlide() {
    if (this.currentSlide < this.totalSlides) {
      this.goToSlide(this.currentSlide + 1);
    }
  }

  goToSlide(slideNumber) {
    this.showSlide(slideNumber, true);
  }

  showSlide(slideNumber, updateHistory = true) {
    this.currentSlide = Math.max(1, Math.min(slideNumber, this.totalSlides));

    // Reset wrapper transform
    this.slidesWrapper.style.transform = "translateX(0)";
    this.slidesWrapper.style.transition = "none";

    // Show loading spinner
    this.slideLoading.style.display = "block";

    // Add loading class to images that will change
    this.slideCurrent.classList.add("loading");

    // Update current slide
    this.slideCurrent.src = this.slideImages[this.currentSlide - 1];

    // Update previous slide
    if (this.currentSlide > 1) {
      this.slidePrev.classList.add("loading");
      this.slidePrev.src = this.slideImages[this.currentSlide - 2];
      this.slidePrev.style.display = "block";
    } else {
      this.slidePrev.style.display = "none";
    }

    // Update next slide
    if (this.currentSlide < this.totalSlides) {
      this.slideNext.classList.add("loading");
      this.slideNext.src = this.slideImages[this.currentSlide];
      this.slideNext.style.display = "block";
    } else {
      this.slideNext.style.display = "none";
    }

    // Update progress
    const progress = (this.currentSlide / this.totalSlides) * 100;
    this.progressFill.style.width = `${progress}%`;

    // Update navigation areas
    if (this.currentSlide === 1) {
      this.navAreaPrev.style.display = "none";
    } else {
      this.navAreaPrev.style.display = "block";
    }

    if (this.currentSlide === this.totalSlides) {
      this.navAreaNext.style.display = "none";
    } else {
      this.navAreaNext.style.display = "block";
    }

    // Update URL
    if (updateHistory) {
      const url = new URL(window.location);
      url.searchParams.set("page", this.currentSlide);
      window.history.replaceState({}, "", url);
    }

    // Update document title
    document.title = `${this.metadata.title || this.metadata.name} - Slide ${
      this.currentSlide
    }`;
  }

  toggleFullscreen() {
    const elem = document.documentElement;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      // Enter fullscreen
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err) => {
          console.error("Failed to enter fullscreen:", err);
        });
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.error("Failed to exit fullscreen:", err);
        });
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  updateFullscreenIcon(isFullscreen) {
    const enterIcon = document.querySelector(".fullscreen-enter-icon");
    const exitIcon = document.querySelector(".fullscreen-exit-icon");

    if (isFullscreen) {
      enterIcon.classList.add("hidden");
      exitIcon.classList.remove("hidden");
    } else {
      enterIcon.classList.remove("hidden");
      exitIcon.classList.add("hidden");
    }
  }

  toggleScrollMode() {
    const isScrollMode = document.body.classList.toggle("scroll-mode");

    // Update icon
    const slideIcon = document.querySelector(".slide-mode-icon");
    const scrollIcon = document.querySelector(".scroll-mode-icon");

    if (isScrollMode) {
      slideIcon.classList.remove("hidden");
      scrollIcon.classList.add("hidden");
      this.enterScrollMode();
    } else {
      slideIcon.classList.add("hidden");
      scrollIcon.classList.remove("hidden");
      this.exitScrollMode();
    }
  }

  enterScrollMode() {
    // Clear scroll container
    this.scrollContainer.innerHTML = "";

    // Add all slides to scroll container
    for (let i = 1; i <= this.totalSlides; i++) {
      const slideImg = document.createElement("img");
      slideImg.className = "scroll-slide";
      slideImg.src = this.slideImages[i - 1];
      slideImg.alt = `Slide ${i}`;
      slideImg.loading = "lazy";
      this.scrollContainer.appendChild(slideImg);
    }

    this.scrollContainer.classList.remove("hidden");

    // Add scroll event listener to update progress bar
    this.scrollContainer.addEventListener("scroll", () =>
      this.updateScrollProgress()
    );

    // Scroll to current slide position
    this.scrollToCurrentSlide();
  }

  exitScrollMode() {
    // Calculate which slide is currently visible before exiting
    this.updateCurrentSlideFromScroll();

    this.scrollContainer.classList.add("hidden");

    // Remove scroll event listener
    this.scrollContainer.removeEventListener("scroll", () =>
      this.updateScrollProgress()
    );

    // Show the current slide in slide mode
    this.showSlide(this.currentSlide, true);
  }

  scrollToCurrentSlide() {
    // Calculate scroll position for current slide
    const slideElements =
      this.scrollContainer.querySelectorAll(".scroll-slide");
    if (slideElements.length > 0 && this.currentSlide > 0) {
      const targetSlide = slideElements[this.currentSlide - 1];
      if (targetSlide) {
        targetSlide.scrollIntoView({ behavior: "auto", block: "center" });
      }
    }
  }

  updateScrollProgress() {
    // Update current slide based on scroll position
    this.updateCurrentSlideFromScroll();

    // Update progress bar based on slide number, not scroll position
    const progress = (this.currentSlide / this.totalSlides) * 100;
    this.progressFill.style.width = `${progress}%`;
  }

  updateCurrentSlideFromScroll() {
    // Find which slide is currently most visible
    const slideElements =
      this.scrollContainer.querySelectorAll(".scroll-slide");
    const scrollTop = this.scrollContainer.scrollTop;
    const containerHeight = this.scrollContainer.clientHeight;
    const centerY = scrollTop + containerHeight / 2;

    let closestSlide = 1;
    let minDistance = Infinity;

    slideElements.forEach((slide, index) => {
      const slideTop = slide.offsetTop;
      const slideCenter = slideTop + slide.offsetHeight / 2;
      const distance = Math.abs(slideCenter - centerY);

      if (distance < minDistance) {
        minDistance = distance;
        closestSlide = index + 1;
      }
    });

    this.currentSlide = closestSlide;
  }

  openShareModal() {
    // Update share URLs when modal opens
    this.updateShareURLs();

    // Show modal
    this.shareModal.classList.remove("hidden");
  }

  updateShareURLs() {
    // Get current URL and remove 'from' parameter
    const url = new URL(window.location.href);
    url.searchParams.delete("from");

    // Get selected mode
    const selectedMode = document.querySelector(
      'input[name="share-mode"]:checked'
    ).value;

    // Add mode parameter if scroll mode is selected
    if (selectedMode === "scroll") {
      url.searchParams.set("mode", "scroll");
    } else {
      url.searchParams.delete("mode");
    }

    const shareLink = url.toString();
    this.shareLinkInput.value = shareLink;

    // Generate embed code (Speaker Deck style)
    const embedCode = `<iframe class="slidef-iframe" frameborder="0" src="${shareLink}" title="${
      this.metadata.title || this.metadata.name
    }" allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>`;
    this.shareEmbedInput.value = embedCode;
  }

  closeShareModal() {
    this.shareModal.classList.add("hidden");
  }

  openOverviewModal() {
    // Clear existing grid
    this.overviewGrid.innerHTML = "";

    // Generate grid items for all slides
    for (let i = 1; i <= this.totalSlides; i++) {
      const slideItem = document.createElement("div");
      slideItem.className = "overview-slide";
      if (i === this.currentSlide) {
        slideItem.classList.add("active");
      }

      const slideImg = document.createElement("img");
      slideImg.className = "overview-slide-image";
      slideImg.src = this.slideImages[i - 1];
      slideImg.alt = `Slide ${i}`;
      slideImg.loading = "lazy";

      const slideNumber = document.createElement("div");
      slideNumber.className = "overview-slide-number";
      slideNumber.textContent = i;

      slideItem.appendChild(slideImg);
      slideItem.appendChild(slideNumber);

      // Click to navigate
      slideItem.addEventListener("click", () => {
        this.goToSlide(i);
        this.closeOverviewModal();
      });

      this.overviewGrid.appendChild(slideItem);
    }

    // Show modal
    this.overviewModal.classList.remove("hidden");
  }

  closeOverviewModal() {
    this.overviewModal.classList.add("hidden");
  }

  async copyToClipboard(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      // Show temporary success feedback
      const button = event.target;
      const originalText = button.textContent;
      button.textContent = successMessage;
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy to clipboard");
    }
  }
}

// Initialize viewer when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new SlidefViewer());
} else {
  new SlidefViewer();
}
