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
    const apiKey = import.meta.env.VITE_HF_API_KEY || '';
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
    
    // As Claude pointed out, since it is already a distinct canvas, 
    // we can just export it directly without the complex bounding box math!
    const base64Image = this.canvas.toDataURL('image/png');
    
    // Get active words
    const activeWords = this.gameEngine.words.map(w => w.text);

    // We send full canvas to recognizer
    console.log('[Telemetry] Calling VLM classify() with full canvas');
    this.recognizer.classify(base64Image, activeWords, (result) => {
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
