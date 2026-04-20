export class ThemeManager {
  constructor() {
    this.isGalaxy = false;
    this.toggleBtn = document.getElementById('themeToggleBtn');
    
    this.toggleBtn.addEventListener('click', () => {
      this.toggleTheme();
    });
  }

  toggleTheme() {
    this.isGalaxy = !this.isGalaxy;
    const root = document.documentElement;
    if (this.isGalaxy) {
      root.classList.add('theme-galaxy');
      this.toggleBtn.innerText = 'Galaxy Theme: ON';
    } else {
      root.classList.remove('theme-galaxy');
      this.toggleBtn.innerText = 'Galaxy Theme: OFF';
    }
    
    // Dispatch an event so canvases can redraw if needed
    window.dispatchEvent(new Event('themeToggled'));
  }

  isGalaxyTheme() {
    return this.isGalaxy;
  }
}
