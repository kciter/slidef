/**
 * Theme management
 * Handles dark/light mode toggle and persistence
 */

const THEME_KEY = "slidef-theme";
const THEME_DARK = "dark";
const THEME_LIGHT = "light";

class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.apply();
  }

  getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? THEME_DARK
      : THEME_LIGHT;
  }

  getStoredTheme() {
    return localStorage.getItem(THEME_KEY);
  }

  setStoredTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
  }

  apply() {
    document.documentElement.setAttribute("data-theme", this.currentTheme);
    this.updateIcons();
  }

  toggle() {
    this.currentTheme =
      this.currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    this.setStoredTheme(this.currentTheme);
    this.apply();
  }

  updateIcons() {
    const sunIcon = document.querySelector(".sun-icon");
    const moonIcon = document.querySelector(".moon-icon");

    if (sunIcon && moonIcon) {
      if (this.currentTheme === THEME_DARK) {
        sunIcon.classList.add("hidden");
        moonIcon.classList.remove("hidden");
      } else {
        sunIcon.classList.remove("hidden");
        moonIcon.classList.add("hidden");
      }
    }
  }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Listen for system theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
      themeManager.currentTheme = e.matches ? THEME_DARK : THEME_LIGHT;
      themeManager.apply();
    }
  });

// Export for use in other scripts
window.themeManager = themeManager;
