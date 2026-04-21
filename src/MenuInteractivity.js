export class MenuInteractivity {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.doodles = [];
    this.currentStroke = [];
    this.isDrawing = false;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.canvas.addEventListener('pointerdown', (e) => this.startDraw(e));
    
    // Bind methods for dynamic window listeners
    this._onPointerMove = this.draw.bind(this);
    this._onPointerUp = this.endDraw.bind(this);
    
    this.loop();
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  startDraw(e) {
    // PREVENT drawing if clicking a button or title (anything with auto pointer-events)
    if (e.target !== this.canvas) return;
    
    this.isDrawing = true;
    const pos = {x: e.clientX, y: e.clientY};
    this.currentStroke = [pos];

    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
  }
  
  draw(e) {
    if (!this.isDrawing) return;
    const pos = {x: e.clientX, y: e.clientY};
    this.currentStroke.push(pos);
  }
  
  endDraw() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);

    if (this.currentStroke.length < 5) {
      this.currentStroke = [];
      return;
    }
    
    this.createDoodle(this.currentStroke);
    this.currentStroke = [];
  }
  
  createDoodle(stroke) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    stroke.forEach(p => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    
    const padding = 10;
    const width = (maxX - minX) + padding * 2;
    const height = (maxY - minY) + padding * 2;
    
    if (width < 10 || height < 10) return;
    
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const octx = offscreen.getContext('2d');
    
    octx.beginPath();
    octx.moveTo(stroke[0].x - minX + padding, stroke[0].y - minY + padding);
    for(let i=1; i<stroke.length; i++) {
      octx.lineTo(stroke[i].x - minX + padding, stroke[i].y - minY + padding);
    }
    
    const themeGalaxy = document.documentElement.classList.contains('theme-galaxy');
    octx.strokeStyle = themeGalaxy ? '#00f3ff' : '#000';
    octx.lineWidth = themeGalaxy ? 3 : 2;
    octx.lineCap = 'round';
    octx.lineJoin = 'round';
    
    if (themeGalaxy) {
        octx.shadowBlur = 10;
        octx.shadowColor = '#00f3ff';
    }
    
    octx.stroke();
    
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

    // Draw current active stroke
    if (this.isDrawing && this.currentStroke.length > 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.currentStroke[0].x, this.currentStroke[0].y);
      for(let i=1; i<this.currentStroke.length; i++) {
        this.ctx.lineTo(this.currentStroke[i].x, this.currentStroke[i].y);
      }
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = 4;
      this.ctx.lineCap = 'round';
      if (themeGalaxy) {
          this.ctx.shadowBlur = 15;
          this.ctx.shadowColor = '#00f3ff';
      }
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }
    
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
