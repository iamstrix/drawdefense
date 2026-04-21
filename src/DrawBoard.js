import { VLMRecognizer } from './VLMRecognizer.js';

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

    // Setup model using Vite inject
    const apiKey = import.meta.env.VITE_GROQ_API_KEY || '';
    this.recognizer = new VLMRecognizer(apiKey);

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
    this.ctx.fillStyle = "#ffffff"; // VLM standard: white background and black stroke for optimal contrast
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
    if (this.gameEngine && this.gameEngine.isPaused) return;
    if (!this.recognizer.isReady) {
      this.predictionOutput.innerText = 'API Key Missing!';
      return;
    }
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
    }, 600); // Wait 0.6 seconds to see if user draws more (was 1s)
  }

  applyStyle() {
    const themeGalaxy = document.documentElement.classList.contains('theme-galaxy');

    // Note: To ensure optimal VLM recognition, the canvas state should 
    // maintain high contrast and clear stroke paths.
    // However, if we invert colors for Galaxy theme, prediction might fail.
    // For reliable prediction, we'll draw visibly according to theme, but 
    // wait - if we invert colors, ML might get confused. 
    // It's safer to always keep standard colors on an off-screen canvas if we do styling.
    // But for simplicity, we'll draw black on white in both modes, just applying a CSS filter for galaxy theme, 
    // We draw visibly according to theme, but maintain a clean signal for the VLM.
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

  getCroppedCanvas() {
    if (this.paths.length === 0) return null;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.paths.forEach(path => {
      path.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    });
    
    const padding = 20;
    const width = (maxX - minX) + padding * 2;
    const height = (maxY - minY) + padding * 2;
    
    if (width < 5 || height < 5) return null;

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const octx = offscreen.getContext('2d');
    
    // Draw paths onto this offscreen canvas with correct alignment
    this.paths.forEach(path => {
        if (path.length < 2) return;
        octx.beginPath();
        octx.moveTo(path[0].x - minX + padding, path[0].y - minY + padding);
        for (let i = 1; i < path.length; i++) {
          octx.lineTo(path[i].x - minX + padding, path[i].y - minY + padding);
        }
        
        // Re-apply style logic for the projectile look
        const themeGalaxy = document.documentElement.classList.contains('theme-galaxy');
        octx.lineCap = 'round';
        octx.lineJoin = 'round';
        octx.lineWidth = 12;
        octx.strokeStyle = themeGalaxy ? '#00f3ff' : '#000000';
        if (themeGalaxy) {
            octx.shadowBlur = 10;
            octx.shadowColor = '#00f3ff';
        }
        octx.stroke();
    });
    
    return offscreen;
  }

  setPaused(isPaused) {
    this.redrawAll();
    if (isPaused) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 48px Outfit, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2);
    }
  }

  predict() {
    console.log('[Telemetry] Predict requested. Number of paths:', this.paths.length);
    if (this.paths.length === 0) return;

    this.predictionOutput.innerText = "Analyzing...";

    // LATENCY OPTIMIZATION: Downscale and compress image
    // Most VLMs are optimized for ~448x448. Sending a giant PNG is slow.
    const maxDimension = 448;
    let width = this.canvas.width;
    let height = this.canvas.height;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    // Create off-screen canvas for resizing
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const octx = offscreen.getContext('2d');

    // Draw the main canvas onto the smaller offscreen canvas
    octx.drawImage(this.canvas, 0, 0, width, height);

    // Export as JPEG (usually much smaller than PNG for these sketches)
    const base64Image = offscreen.toDataURL('image/jpeg', 0.7);

    // Get active words
    const activeWords = this.gameEngine.words.map(w => w.text);

    // Capture the current sketch for the projectile *before* the API call
    // logic, because the user might clear the board while the API is thinking.
    const sketchImageForProjectile = this.getCroppedCanvas();

    // We send compressed/resized image to recognizer
    console.log(`[Telemetry] Calling VLM classify() with optimized image (${width}x${height}, JPEG)`);
    this.recognizer.classify(base64Image, activeWords, (result) => {
      // If board was cleared and no paths were captured, or API failed
      if (!sketchImageForProjectile) return; 

      if (result.error) {
        this.predictionOutput.innerText = 'Error: API Error';
        return;
      }

      console.log('[Telemetry] Received prediction:', result);
      const topLabels = result.topLabels || [];
      this.predictionOutput.innerText = `I see: ${topLabels.join(', ')}`;

      // Check against game engine
      let matched = false;
      
      for (const label of topLabels) {
        if (this.gameEngine.tryDestroyWord(label, sketchImageForProjectile)) {
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
    this.predictionOutput.innerText = "pencil ready...";
  }
}
