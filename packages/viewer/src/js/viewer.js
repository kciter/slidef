/**
 * Slidef Viewer
 * Handles slide navigation, progress bar, and thumbnail preview
 */

class SlidefViewer {
  constructor() {
    // Get slide info from URL
    const params = new URLSearchParams(window.location.search);
    this.slideName = params.get('slide') || '';
    this.currentSlide = parseInt(params.get('page') || '1', 10);

    // State
    this.totalSlides = 0;
    this.slideImages = [];
    this.metadata = null;

    // DOM elements
    this.slideImage = document.getElementById('slide-image');
    this.slideTitle = document.getElementById('slide-title');
    this.prevButton = document.getElementById('prev-button');
    this.nextButton = document.getElementById('next-button');
    this.closeButton = document.getElementById('close-button');
    this.themeToggle = document.getElementById('theme-toggle');
    this.progressBar = document.getElementById('progress-bar');
    this.progressFill = document.getElementById('progress-fill');
    this.currentSlideEl = document.getElementById('current-slide');
    this.totalSlidesEl = document.getElementById('total-slides');
    this.thumbnailPreview = document.getElementById('thumbnail-preview');
    this.thumbnailImage = document.getElementById('thumbnail-image');
    this.thumbnailNumber = document.getElementById('thumbnail-number');

    this.init();
  }

  async init() {
    try {
      await this.loadMetadata();
      this.setupEventListeners();
      this.showSlide(this.currentSlide);
    } catch (error) {
      console.error('Failed to initialize viewer:', error);
      this.slideTitle.textContent = 'Error loading slides';
    }
  }

  async loadMetadata() {
    const response = await fetch(`slides/${this.slideName}/metadata.json`);
    if (!response.ok) {
      throw new Error('Failed to load metadata');
    }

    this.metadata = await response.json();
    this.totalSlides = this.metadata.pageCount;
    this.slideTitle.textContent = this.metadata.title || this.metadata.name;
    this.totalSlidesEl.textContent = this.totalSlides;

    // Generate image paths
    this.slideImages = Array.from({ length: this.totalSlides }, (_, i) => {
      const pageNum = String(i + 1).padStart(3, '0');
      return `slides/${this.slideName}/images/slide-${pageNum}.png`;
    });
  }

  setupEventListeners() {
    // Navigation buttons
    this.prevButton.addEventListener('click', () => this.previousSlide());
    this.nextButton.addEventListener('click', () => this.nextSlide());

    // Close button
    this.closeButton.addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    // Theme toggle
    this.themeToggle.addEventListener('click', () => {
      window.themeManager.toggle();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));

    // Progress bar click
    this.progressBar.addEventListener('click', (e) => this.handleProgressClick(e));

    // Progress bar hover for thumbnail
    this.progressBar.addEventListener('mousemove', (e) => this.showThumbnail(e));
    this.progressBar.addEventListener('mouseleave', () => this.hideThumbnail());

    // Prevent context menu on slide image
    this.slideImage.addEventListener('contextmenu', (e) => e.preventDefault());

    // Update URL on slide change
    window.addEventListener('popstate', () => {
      const params = new URLSearchParams(window.location.search);
      const page = parseInt(params.get('page') || '1', 10);
      this.showSlide(page, false);
    });
  }

  handleKeyPress(e) {
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        this.previousSlide();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        e.preventDefault();
        this.nextSlide();
        break;
      case 'Home':
        e.preventDefault();
        this.goToSlide(1);
        break;
      case 'End':
        e.preventDefault();
        this.goToSlide(this.totalSlides);
        break;
      case 'Escape':
        window.location.href = 'index.html';
        break;
    }
  }

  handleProgressClick(e) {
    const rect = this.progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const targetSlide = Math.max(1, Math.min(
      this.totalSlides,
      Math.ceil(percentage * this.totalSlides)
    ));
    this.goToSlide(targetSlide);
  }

  showThumbnail(e) {
    const rect = this.progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const targetSlide = Math.max(1, Math.min(
      this.totalSlides,
      Math.ceil(percentage * this.totalSlides)
    ));

    // Position thumbnail
    this.thumbnailPreview.style.left = `${e.clientX}px`;
    this.thumbnailPreview.style.transform = 'translateX(-50%)';

    // Update thumbnail
    this.thumbnailImage.src = this.slideImages[targetSlide - 1];
    this.thumbnailNumber.textContent = `${targetSlide} / ${this.totalSlides}`;
    this.thumbnailPreview.classList.remove('hidden');
  }

  hideThumbnail() {
    this.thumbnailPreview.classList.add('hidden');
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

    // Update image
    this.slideImage.src = this.slideImages[this.currentSlide - 1];

    // Update progress
    const progress = (this.currentSlide / this.totalSlides) * 100;
    this.progressFill.style.width = `${progress}%`;
    this.currentSlideEl.textContent = this.currentSlide;

    // Update navigation buttons
    this.prevButton.disabled = this.currentSlide === 1;
    this.nextButton.disabled = this.currentSlide === this.totalSlides;

    // Update URL
    if (updateHistory) {
      const url = new URL(window.location);
      url.searchParams.set('page', this.currentSlide);
      window.history.pushState({}, '', url);
    }

    // Update document title
    document.title = `${this.metadata.title || this.metadata.name} - Slide ${this.currentSlide}`;
  }
}

// Initialize viewer when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SlidefViewer());
} else {
  new SlidefViewer();
}
