import { settings } from './SettingsManager.js';

export class MenuInteractivity {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.doodles = [];
    this.currentStroke = [];
    this.accumulatedStrokes = [];
    this.isDrawing = false;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    window.addEventListener('pointerdown', (e) => this.startDraw(e));
    window.addEventListener('pointermove', (e) => this.draw(e));
    window.addEventListener('pointerup', (e) => this.endDraw(e));
    window.addEventListener('pointerleave', (e) => this.endDraw(e));
    
    window.addEventListener('keydown', (e) => {
      // Universal Clear Hotkey
      if (e.code === settings.eraseHotkey) {
        this.clear();
      }

      if (e.code === 'Space' && settings.isMultiStrokeMode && this.accumulatedStrokes.length > 0) {
        e.preventDefault();
        this.createDoodle(this.accumulatedStrokes);
        this.accumulatedStrokes = [];
      }
    });

    // Listen for settings change to immediately dump accumulated strokes if toggled off
    window.addEventListener('settingsChanged', () => {
      if (!settings.isMultiStrokeMode && this.accumulatedStrokes.length > 0) {
        this.createDoodle(this.accumulatedStrokes);
        this.accumulatedStrokes = [];
      }
    });
    
    this.loop();
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  clear() {
    this.doodles = [];
    this.currentStroke = [];
    this.accumulatedStrokes = [];
    this.isDrawing = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  startDraw(e) {
    // Only allow drawing if clicking the background (not UI)
    if (e.target !== this.canvas) return;
    
    this.isDrawing = true;
    const pos = {x: e.clientX, y: e.clientY};
    this.currentStroke = [pos];
  }
  
  draw(e) {
    if (!this.isDrawing) return;
    const pos = {x: e.clientX, y: e.clientY};
    this.currentStroke.push(pos);
  }
  
  endDraw() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    
    if (this.currentStroke.length < 5) {
      this.currentStroke = [];
      return;
    }
    
    if (settings.isMultiStrokeMode) {
      this.accumulatedStrokes.push(this.currentStroke);
      this.currentStroke = [];
    } else {
      this.createDoodle([this.currentStroke]);
      this.currentStroke = [];
    }
  }
  
  createDoodle(strokes) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    strokes.forEach(stroke => {
      stroke.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    });
    
    const padding = 10;
    const width = (maxX - minX) + padding * 2;
    const height = (maxY - minY) + padding * 2;
    
    if (width < 10 || height < 10) return;
    
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const octx = offscreen.getContext('2d');
    
    const themeGalaxy = document.documentElement.classList.contains('theme-galaxy');
    octx.strokeStyle = themeGalaxy ? '#00f3ff' : '#000';
    octx.lineWidth = themeGalaxy ? 3 : 2;
    octx.lineCap = 'round';
    octx.lineJoin = 'round';
    
    if (themeGalaxy) {
        octx.shadowBlur = 10;
        octx.shadowColor = '#00f3ff';
    }
    
    strokes.forEach(stroke => {
      octx.beginPath();
      octx.moveTo(stroke[0].x - minX + padding, stroke[0].y - minY + padding);
      for(let i=1; i<stroke.length; i++) {
        octx.lineTo(stroke[i].x - minX + padding, stroke[i].y - minY + padding);
      }
      octx.stroke();
    });
    
    this.doodles.push({
      canvas: offscreen,
      x: minX - padding,
      y: minY - padding,
      vx: (Math.random() - 0.5) * 5, // Random drift
      vy: (Math.random() - 0.5) * 5,
      rotation: 0,
      rv: (Math.random() - 0.5) * 0.05, // constant rotation
      opacity: 0.8
    });
  }
  
  loop() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.loop());
  }
  
  update() {
    // Only update if menu is visible (approximation: if doodles exist)
    const activeMenu = !document.getElementById('main-menu').classList.contains('hidden');
    if (!activeMenu && this.doodles.length === 0) return;

    for (let i = this.doodles.length - 1; i >= 0; i--) {
      const d = this.doodles[i];
      d.x += d.vx;
      d.y = (d.y || 0) + d.vy;
      d.rotation += d.rv;
      
      // Bounce off Left/Right
      if (d.x <= 0 || d.x + d.canvas.width >= window.innerWidth) {
        d.vx *= -1;
        d.x = Math.max(0, Math.min(d.x, window.innerWidth - d.canvas.width));
      }
      
      // Bounce off Top/Bottom
      if (d.y <= 0 || d.y + d.canvas.height >= window.innerHeight) {
        d.vy *= -1;
        d.y = Math.max(0, Math.min(d.y, window.innerHeight - d.canvas.height));
      }
    }
  }
  
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const themeGalaxy = document.documentElement.classList.contains('theme-galaxy');
    const strokeColor = themeGalaxy ? '#00f3ff' : '#000';

    // Set common styles for drawing
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';
    if (themeGalaxy) {
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00f3ff';
    }

    // Draw accumulated strokes
    this.accumulatedStrokes.forEach(stroke => {
      if (stroke.length > 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(stroke[0].x, stroke[0].y);
        for(let i=1; i<stroke.length; i++) {
          this.ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        this.ctx.stroke();
      }
    });

    // Draw current active stroke
    if (this.isDrawing && this.currentStroke.length > 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.currentStroke[0].x, this.currentStroke[0].y);
      for(let i=1; i<this.currentStroke.length; i++) {
        this.ctx.lineTo(this.currentStroke[i].x, this.currentStroke[i].y);
      }
      this.ctx.stroke();
    }
    this.ctx.shadowBlur = 0;
    
    // Draw all floating doodles
    this.doodles.forEach(d => {
      this.ctx.save();
      this.ctx.globalAlpha = d.opacity;
      this.ctx.translate(d.x + d.canvas.width/2, d.y + d.canvas.height/2);
      this.ctx.rotate(d.rotation);
      this.ctx.drawImage(d.canvas, -d.canvas.width/2, -d.canvas.height/2);
      this.ctx.restore();
    });
  }
}
