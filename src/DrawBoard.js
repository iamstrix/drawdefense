import { SketchRecognizer } from './SketchRecognizer.js';

export class DrawBoard {
  constructor(canvasId, gameEngine) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.gameEngine = gameEngine;
    
    this.isDrawing = false;
    this.paths = [];
    this.currentPath = [];
    
    this.predictionTimer = null;
    this.predictionOutput = document.getElementById('predictionOutput');
    this.clearBtn = document.getElementById('clearDrawBtn');
    
    // Setup model
    this.recognizer = new SketchRecognizer();
    
    // Bind events
    this.clearBtn.addEventListener('click', () => this.clear());
    
    this.canvas.addEventListener('pointerdown', (e) => this.startDraw(e));
    this.canvas.addEventListener('pointermove', (e) => this.draw(e));
    this.canvas.addEventListener('pointerup', (e) => this.endDraw(e));
    this.canvas.addEventListener('pointerleave', (e) => this.endDraw(e));
    
    // Resize handler
    window.addEventListener('resize', () => this.resize());
    // Also re-draw when theme is toggled because border changes but the actual line colors might need switching
    window.addEventListener('themeToggled', () => this.redrawAll());
    this.resize();
  }
  
  resize() {
    const parent = this.canvas.parentElement;
    const size = Math.min(parent.clientWidth, parent.clientHeight) - 20;
    this.canvas.width = size;
    this.canvas.height = size;
    
    // Re-fill white base background
    this.fillBackground();
    this.redrawAll();
  }
  
  fillBackground() {
    this.ctx.fillStyle = "#ffffff"; // DoodleNet expects white background and black stroke
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  startDraw(e) {
    if (!this.recognizer.isReady) return; // don't draw if not loaded
    this.isDrawing = true;
    const pos = this.getPointerPos(e);
    this.currentPath = [pos];
    
    if (this.predictionTimer) clearTimeout(this.predictionTimer);
  }

  draw(e) {
    if (!this.isDrawing) return;
    const pos = this.getPointerPos(e);
    this.currentPath.push(pos);
    
    // Draw segment
    const start = this.currentPath[this.currentPath.length - 2];
    const end = pos;
    
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    
    this.applyStyle();
    this.ctx.stroke();
  }

  endDraw(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.paths.push([...this.currentPath]);
    
    // Debounce prediction
    if (this.predictionTimer) clearTimeout(this.predictionTimer);
    this.predictionTimer = setTimeout(() => {
      this.predict();
    }, 1000); // Wait 1 second to see if user draws more
  }

  applyStyle() {
    const themeGalaxy = document.documentElement.classList.contains('theme-galaxy');
    
    // Note: To make sure DoodleNet predicts correctly, we actually want the internal 
    // canvas state to theoretically match DoodleNet training. But ml5 takes the canvas as is.
    // However, if we invert colors for Galaxy theme, prediction might fail.
    // For reliable prediction, we'll draw visibly according to theme, but 
    // wait - if we invert colors, ML might get confused. 
    // It's safer to always keep standard colors on an off-screen canvas if we do styling.
    // But for simplicity, we'll draw black on white in both modes, just applying a CSS filter for galaxy theme, 
    // OR we can rely on DoodleNet being somewhat robust.
    // Let's use black line on white bg for actual drawing, but CSS filter `invert(1)` on the canvas wrapper or keep standard drawing here and add glowing shadows.
    // For now, let's just make Galaxy drawing a black line with glowing cyan shadow!
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = 12;
    this.ctx.strokeStyle = '#000000';
    
    if (themeGalaxy) {
      // Glow effect behind the black line
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#00f3ff';
    } else {
      this.ctx.shadowBlur = 0;
    }
  }

  redrawAll() {
    this.fillBackground();
    this.paths.forEach(path => {
      if (path.length < 2) return;
      this.ctx.beginPath();
      this.ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        this.ctx.lineTo(path[i].x, path[i].y);
      }
      this.applyStyle();
      this.ctx.stroke();
    });
  }

  predict() {
    console.log('[Telemetry] Predict requested. Number of paths:', this.paths.length);
    if (this.paths.length === 0) return;
    
    this.predictionOutput.innerText = "Analyzing...";
    
    // 1. Calculate the bounding box of the drawing
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const path of this.paths) {
      for (const pt of path) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
    }
    
    // 2. Make it a perfect square with some padding
    const padding = 24; 
    const width = maxX - minX;
    const height = maxY - minY;
    const squareSize = Math.max(width, height) + padding * 2;
    
    // Center of the drawn bounds
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // 3. Create an offscreen canvas
    const offCanvas = document.createElement('canvas');
    offCanvas.width = squareSize;
    offCanvas.height = squareSize;
    const offCtx = offCanvas.getContext('2d');
    
    // Fill background with white
    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, squareSize, squareSize);
    
    // Setup drawing style for the AI (strictly white bg / black stroke)
    offCtx.lineCap = 'round';
    offCtx.lineJoin = 'round';
    offCtx.lineWidth = 12;
    offCtx.strokeStyle = '#000000';
    
    // 4. Redraw the paths onto the centered offscreen canvas
    for (const path of this.paths) {
      if (path.length < 2) continue;
      
      const shiftX = (squareSize / 2) - centerX;
      const shiftY = (squareSize / 2) - centerY;
      
      offCtx.beginPath();
      offCtx.moveTo(path[0].x + shiftX, path[0].y + shiftY);
      for (let i = 1; i < path.length; i++) {
        offCtx.lineTo(path[i].x + shiftX, path[i].y + shiftY);
      }
      offCtx.stroke();
    }
    
    // We send isolated bounded canvas to recognizer
    console.log('[Telemetry] Calling recognizer.classify() with cropped canvas size:', squareSize);
    this.recognizer.classify(offCanvas, (results) => {
      console.log('[Telemetry] Received results in DrawBoard:', results);
      const topPredictions = results;
      const topLabels = topPredictions.map(r => r.label);
      this.predictionOutput.innerText = `I see: ${topLabels.slice(0, 2).join(', ')}`;
      
      // Check against game engine
      let matched = false;
      for (const label of topLabels) {
        if (this.gameEngine.tryDestroyWord(label)) {
          matched = true;
          this.predictionOutput.innerText = `Matched + Destroyed: ${label}!`;
          break;
        }
      }
      
      if (matched) {
         // Auto clear
         setTimeout(() => {
           this.clear();
         }, 800);
      }
    });
  }

  clear() {
    this.paths = [];
    this.fillBackground();
    this.predictionOutput.innerText = "Pencil ready...";
  }
}
