export class ThemeManager {
  constructor() {
    this.isGalaxy = false;
    this.buttons = [document.getElementById('themeToggleBtn'), document.getElementById('modalThemeToggleBtn')];
    
    this.buttons.forEach(btn => {
      if (btn) btn.addEventListener('click', () => this.toggleTheme());
    });
  }

  toggleTheme() {
    this.isGalaxy = !this.isGalaxy;
    const root = document.documentElement;
    if (this.isGalaxy) {
      root.classList.add('theme-galaxy');
    } else {
      root.classList.remove('theme-galaxy');
    }
    this.updateButtons();
    
    // Dispatch an event so canvases can redraw if needed
    window.dispatchEvent(new Event('themeToggled'));
  }

  updateButtons() {
    this.buttons.forEach(btn => {
      if (btn) btn.innerText = this.isGalaxy ? 'ON' : 'OFF';
    });
  }

  isGalaxyTheme() {
    return this.isGalaxy;
  }
}
