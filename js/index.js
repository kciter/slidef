/**
 * Index page - Slide list
 */

class SlideIndex {
  constructor() {
    this.slidesContainer = document.getElementById('slides-container');
    this.emptyState = document.getElementById('empty-state');

    this.init();
  }

  async init() {
    try {
      const slides = await this.loadSlides();
      this.renderSlides(slides);
    } catch (error) {
      console.error('Failed to load slides:', error);
      this.showEmptyState();
    }
  }

  async loadSlides() {
    // Load slides-index.json if it exists
    try {
      const response = await fetch('slides-index.json');
      if (response.ok) {
        const index = await response.json();
        return index.slides;
      }
    } catch (error) {
      // Fallback: scan slides directory
      console.log('slides-index.json not found, scanning directory...');
    }

    // If index doesn't exist, try to discover slides manually
    // This is a fallback and won't work in all environments
    return this.discoverSlides();
  }

  async discoverSlides() {
    // Try to read slides directory
    // Note: This won't work in a static site without a file listing
    // In production, slides-index.json should always be generated
    const slides = [];

    // Check if we have any slide directories
    // This is a best-effort approach for local development
    const slideDirs = ['test']; // Placeholder

    for (const dir of slideDirs) {
      try {
        const response = await fetch(`${dir}/metadata.json`);
        if (response.ok) {
          const metadata = await response.json();
          slides.push(metadata);
        }
      } catch (error) {
        // Skip this slide
      }
    }

    return slides;
  }

  renderSlides(slides) {
    if (slides.length === 0) {
      this.showEmptyState();
      return;
    }

    this.slidesContainer.classList.remove('hidden');

    slides.forEach((slide, index) => {
      const card = this.createSlideCard(slide);
      // Stagger animation delay for each card
      card.style.animationDelay = `${index * 0.1}s`;
      this.slidesContainer.appendChild(card);
    });
  }

  createSlideCard(slide) {
    const card = document.createElement('a');
    card.className = 'slide-card';
    card.href = `viewer.html?slide=${slide.name}&from=list`;

    const thumbnail = document.createElement('img');
    thumbnail.className = 'slide-thumbnail';
    thumbnail.src = `slides/${slide.name}/images/slide-001.png`;
    thumbnail.alt = `${slide.title || slide.name} thumbnail`;
    thumbnail.loading = 'lazy';
    thumbnail.onerror = () => {
      thumbnail.style.display = 'none';
    };

    const info = document.createElement('div');
    info.className = 'slide-info';

    const name = document.createElement('h3');
    name.className = 'slide-name';
    name.textContent = slide.title || slide.name;

    const meta = document.createElement('div');
    meta.className = 'slide-meta';

    const pages = document.createElement('div');
    pages.className = 'slide-pages';
    pages.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H4z"/>
      </svg>
      ${slide.pageCount} slides
    `;

    const date = document.createElement('div');
    date.className = 'slide-date';
    date.textContent = this.formatDate(slide.createdAt);

    meta.appendChild(pages);
    meta.appendChild(date);

    info.appendChild(name);
    info.appendChild(meta);

    card.appendChild(thumbnail);
    card.appendChild(info);

    return card;
  }

  formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

    return date.toLocaleDateString();
  }

  showEmptyState() {
    this.emptyState.classList.remove('hidden');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SlideIndex());
} else {
  new SlideIndex();
}
