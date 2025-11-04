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
    this.hideControlsTimer = null;

    // DOM elements
    this.slideImage = document.getElementById('slide-image');
    this.navAreaPrev = document.getElementById('nav-area-prev');
    this.navAreaNext = document.getElementById('nav-area-next');
    this.closeButton = document.getElementById('close-button');
    this.overviewButton = document.getElementById('overview-button');
    this.shareButton = document.getElementById('share-button');
    this.fullscreenToggle = document.getElementById('fullscreen-toggle');
    this.progressBar = document.getElementById('progress-bar');
    this.progressFill = document.getElementById('progress-fill');
    this.currentSlideEl = document.getElementById('current-slide');
    this.thumbnailPreview = document.getElementById('thumbnail-preview');
    this.thumbnailImage = document.getElementById('thumbnail-image');
    this.thumbnailNumber = document.getElementById('thumbnail-number');
    this.overviewModal = document.getElementById('overview-modal');
    this.overviewModalClose = document.getElementById('overview-modal-close');
    this.overviewGrid = document.getElementById('overview-grid');
    this.shareModal = document.getElementById('share-modal');
    this.shareModalClose = document.getElementById('share-modal-close');
    this.shareLinkInput = document.getElementById('share-link-input');
    this.shareEmbedInput = document.getElementById('share-embed-input');
    this.copyLinkButton = document.getElementById('copy-link-button');
    this.copyEmbedButton = document.getElementById('copy-embed-button');

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

    // Generate image paths
    this.slideImages = Array.from({ length: this.totalSlides }, (_, i) => {
      const pageNum = String(i + 1).padStart(3, '0');
      return `slides/${this.slideName}/images/slide-${pageNum}.png`;
    });
  }

  setupEventListeners() {
    // Navigation areas
    this.navAreaPrev.addEventListener('click', () => this.previousSlide());
    this.navAreaNext.addEventListener('click', () => this.nextSlide());

    // Close button
    this.closeButton.addEventListener('click', () => {
      window.location.href = 'index.html';
    });

    // Overview button
    this.overviewButton.addEventListener('click', () => this.openOverviewModal());

    // Share button
    this.shareButton.addEventListener('click', () => this.openShareModal());

    // Fullscreen toggle
    this.fullscreenToggle.addEventListener('click', () => this.toggleFullscreen());

    // Overview modal close
    this.overviewModalClose.addEventListener('click', () => this.closeOverviewModal());
    this.overviewModal.addEventListener('click', (e) => {
      if (e.target === this.overviewModal) {
        this.closeOverviewModal();
      }
    });

    // Share modal close
    this.shareModalClose.addEventListener('click', () => this.closeShareModal());
    this.shareModal.addEventListener('click', (e) => {
      if (e.target === this.shareModal) {
        this.closeShareModal();
      }
    });

    // Copy buttons
    this.copyLinkButton.addEventListener('click', () => this.copyToClipboard(this.shareLinkInput.value, 'Link copied!'));
    this.copyEmbedButton.addEventListener('click', () => this.copyToClipboard(this.shareEmbedInput.value, 'Embed code copied!'));

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

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      this.updateFullscreenIcon(!!document.fullscreenElement);
    });
    document.addEventListener('webkitfullscreenchange', () => {
      this.updateFullscreenIcon(!!document.webkitFullscreenElement);
    });

    // Show/hide controls on mouse move
    document.addEventListener('mousemove', () => this.showControls());

    // Initial show
    this.showControls();
  }

  showControls() {
    document.body.classList.add('controls-visible');

    // Clear existing timer
    if (this.hideControlsTimer) {
      clearTimeout(this.hideControlsTimer);
    }

    // Hide after 3 seconds
    this.hideControlsTimer = setTimeout(() => {
      document.body.classList.remove('controls-visible');
    }, 3000);
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

    // Update navigation areas
    if (this.currentSlide === 1) {
      this.navAreaPrev.style.display = 'none';
    } else {
      this.navAreaPrev.style.display = 'block';
    }

    if (this.currentSlide === this.totalSlides) {
      this.navAreaNext.style.display = 'none';
    } else {
      this.navAreaNext.style.display = 'block';
    }

    // Update URL
    if (updateHistory) {
      const url = new URL(window.location);
      url.searchParams.set('page', this.currentSlide);
      window.history.pushState({}, '', url);
    }

    // Update document title
    document.title = `${this.metadata.title || this.metadata.name} - Slide ${this.currentSlide}`;
  }

  toggleFullscreen() {
    const elem = document.documentElement;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      // Enter fullscreen
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => {
          console.error('Failed to enter fullscreen:', err);
        });
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.error('Failed to exit fullscreen:', err);
        });
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  updateFullscreenIcon(isFullscreen) {
    const enterIcon = document.querySelector('.fullscreen-enter-icon');
    const exitIcon = document.querySelector('.fullscreen-exit-icon');

    if (isFullscreen) {
      enterIcon.classList.add('hidden');
      exitIcon.classList.remove('hidden');
    } else {
      enterIcon.classList.remove('hidden');
      exitIcon.classList.add('hidden');
    }
  }

  openShareModal() {
    // Generate share link (current URL)
    const shareLink = window.location.href;
    this.shareLinkInput.value = shareLink;

    // Generate embed code (Speaker Deck style)
    const embedCode = `<iframe class="slidef-iframe" frameborder="0" src="${shareLink}" title="${this.metadata.title || this.metadata.name}" allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>`;
    this.shareEmbedInput.value = embedCode;

    // Show modal
    this.shareModal.classList.remove('hidden');
  }

  closeShareModal() {
    this.shareModal.classList.add('hidden');
  }

  openOverviewModal() {
    // Clear existing grid
    this.overviewGrid.innerHTML = '';

    // Generate grid items for all slides
    for (let i = 1; i <= this.totalSlides; i++) {
      const slideItem = document.createElement('div');
      slideItem.className = 'overview-slide';
      if (i === this.currentSlide) {
        slideItem.classList.add('active');
      }

      const slideImg = document.createElement('img');
      slideImg.className = 'overview-slide-image';
      slideImg.src = this.slideImages[i - 1];
      slideImg.alt = `Slide ${i}`;
      slideImg.loading = 'lazy';

      const slideNumber = document.createElement('div');
      slideNumber.className = 'overview-slide-number';
      slideNumber.textContent = i;

      slideItem.appendChild(slideImg);
      slideItem.appendChild(slideNumber);

      // Click to navigate
      slideItem.addEventListener('click', () => {
        this.goToSlide(i);
        this.closeOverviewModal();
      });

      this.overviewGrid.appendChild(slideItem);
    }

    // Show modal
    this.overviewModal.classList.remove('hidden');
  }

  closeOverviewModal() {
    this.overviewModal.classList.add('hidden');
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
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  }
}

// Initialize viewer when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SlidefViewer());
} else {
  new SlidefViewer();
}
