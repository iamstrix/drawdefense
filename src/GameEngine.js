export const DOODLE_CLASSES = [
  'apple', 'banana', 'bridge', 'butterfly', 'car', 'cloud', 'cup', 
  'dog', 'door', 'envelope', 'eye', 'flower', 'house', 'key', 
  'ladder', 'leaf', 'lightning', 'mountain', 'pants', 'pencil', 
  'potato', 'snake', 'star', 'sun', 'sword', 'tree', 'umbrella', 'zigzag'
];

export class GameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    this.score = 0;
    this.health = 10;
    
    this.scoreEl = document.getElementById('scoreVal');
    this.healthEl = document.getElementById('healthVal');
    
    this.words = [];
    this.spawnTimer = 0;
    this.spawnInterval = 3000; // ms
    
    this.lastTime = performance.now();
    
    this.damageTimer = 0;
    this.damageElapsed = 0;
    
    // Load player sprite
    this.playerSprite = new Image();
    this.playerSprite.src = './src/assets/cat.png';
    this.playerSpriteLoaded = false;
    this.playerSprite.onload = () => {
      this.playerSpriteLoaded = true;
    };
    
    // Load attack sprite
    this.attackSprite = new Image();
    this.attackSprite.src = './src/assets/cat_attack.png';
    this.attackSpriteLoaded = false;
    this.attackSprite.onload = () => {
      this.attackSpriteLoaded = true;
    };
    
    // Load explosion sprite
    this.explosionSprite = new Image();
    this.explosionSprite.src = './src/assets/explode.png';
    this.explosionSpriteLoaded = false;
    this.explosionSprite.onload = () => {
      this.explosionSpriteLoaded = true;
    };
    
    this.attackTimer = 0;
    
    // Load enemy sprites (2 frames per enemy)
    this.enemySprites = [];
    this.enemySpritesLoaded = 0;
    const totalEnemies = 3;
    for (let i = 1; i <= totalEnemies; i++) {
      const enemyImg1 = new Image();
      enemyImg1.src = `./src/assets/enemy${i.toString().padStart(2, '0')}.png`;
      enemyImg1.onload = () => {
        this.enemySpritesLoaded++;
      };
      
      const enemyImg2 = new Image();
      const frame2Name = i === 1 ? 'enemy1_.png' : `enemy${i.toString().padStart(2, '0')}_.png`;
      enemyImg2.src = `./src/assets/${frame2Name}`;
      enemyImg2.onload = () => {
        this.enemySpritesLoaded++;
      };
      
      this.enemySprites.push([enemyImg1, enemyImg2]);
    }
    
    // Load background image
    this.backgroundImage = new Image();
    this.backgroundImage.src = './src/assets/l1.png';
    this.backgroundLoaded = false;
    this.backgroundImage.onload = () => {
      this.backgroundLoaded = true;
    };
    
    // Resize handler
    window.addEventListener('resize', () => this.resize());
    this.resize();
    
    // Start loop
    requestAnimationFrame((t) => this.loop(t));
  }
  
  resize() {
    const parent = this.canvas.parentElement;
    const size = Math.min(parent.clientWidth, parent.clientHeight) - 20; // 20px padding margin
    this.canvas.width = size;
    this.canvas.height = size;
  }
  
  spawnWord() {
    const wordText = DOODLE_CLASSES[Math.floor(Math.random() * DOODLE_CLASSES.length)];
    const enemyIndex = Math.floor(Math.random() * 3);
    
    // Spawn enemy from perimeter
    const side = Math.floor(Math.random() * 4);
    let startX, startY;
    if (side === 0) { // top
      startX = Math.random() * this.canvas.width;
      startY = 0;
    } else if (side === 1) { // bottom
      startX = Math.random() * this.canvas.width;
      startY = this.canvas.height;
    } else if (side === 2) { // left
      startX = 0;
      startY = Math.random() * this.canvas.height;
    } else { // right
      startX = this.canvas.width;
      startY = Math.random() * this.canvas.height;
    }
    
    this.words.push({
      text: wordText,
      x: startX,
      y: startY,
      speed: 30 + Math.random() * 15,
      enemySpriteIndex: enemyIndex,
      isEnemy: true,
      animationTimer: 0,
      animationFrame: 0,
      dying: false,
      fadeTimer: 0
    });
  }
  
  tryDestroyWord(predictedLabel) {
    const matchingWords = this.words.filter(w => w.text.toLowerCase() === predictedLabel.toLowerCase() && !w.dying);
    if (matchingWords.length > 0) {
      // Mark enemies as dying
      this.words.forEach(w => {
        if (w.text.toLowerCase() === predictedLabel.toLowerCase() && !w.dying) {
          w.dying = true;
          w.fadeTimer = 0.5; // fade over 0.5 seconds
        }
      });
      this.score += 10;
      this.scoreEl.innerText = this.score;
      // Trigger attack animation
      this.attackTimer = 1;
      return true;
    }
    return false;
  }
  
  loop(currentTime) {
    const dt = (currentTime - this.lastTime) / 1000; // delta time in seconds
    this.lastTime = currentTime;
    
    if (this.health <= 0) {
      this.drawGameOver();
      return;
    }
    
    // Spawning
    this.spawnTimer += dt * 1000;
    if (this.spawnTimer > this.spawnInterval) {
      this.spawnWord();
      this.spawnTimer = 0;
      // progressively harder
      this.spawnInterval = Math.max(1000, this.spawnInterval - 50); 
    }
    
    this.update(dt);
    this.draw();
    
    requestAnimationFrame((t) => this.loop(t));
  }
  
  update(dt) {
    this.damageTimer = Math.max(0, this.damageTimer - dt);
    this.damageElapsed += dt;
    
    // Update attack timer
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    
    for (let i = this.words.length - 1; i >= 0; i--) {
      const w = this.words[i];
      
      if (w.dying) {
        // Update fade timer
        w.fadeTimer -= dt;
        if (w.fadeTimer <= 0) {
          this.words.splice(i, 1);
          continue;
        }
      } else {
        // Update enemy animation
        w.animationTimer += dt;
        if (w.animationTimer >= 1.0) {
          w.animationTimer = 0;
          w.animationFrame = 1 - w.animationFrame;
        }
        
        const dx = cx - w.x;
        const dy = cy - w.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 100) { // reached player
          this.words.splice(i, 1);
          this.health -= 1;
          this.healthEl.innerText = this.health;
          this.damageTimer = 0.125;
          this.damageElapsed = 0.125;
        } else {
          const nx = dx / dist;
          const ny = dy / dist;
          w.x += nx * w.speed * dt;
          w.y += ny * w.speed * dt;
        }
      }
    }
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    // Draw background image
    if (this.backgroundLoaded) {
      this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
    }
    
    const rootStyles = getComputedStyle(document.documentElement);
    const textColor = rootStyles.getPropertyValue('--text-color').trim() || '#000';
    const accentColor = rootStyles.getPropertyValue('--accent-color').trim() || '#000';
    const themeGalaxy = document.documentElement.classList.contains('theme-galaxy');
    
    // Draw Player (Center Base)
    const currentPlayerSprite = (this.attackTimer > 0 && this.attackSpriteLoaded) ? this.attackSprite : this.playerSprite;
    const playerLoaded = (this.attackTimer > 0) ? this.attackSpriteLoaded : this.playerSpriteLoaded;
    if (playerLoaded) {
      const spriteSize = 200; // Adjust size as needed
      if (this.damageTimer > 0) {
        const pulse = Math.sin(this.damageElapsed * 20) * 0.5 + 0.5;
        this.ctx.filter = `sepia(${0.5 + pulse * 0.5}) hue-rotate(${-25 - pulse * 25}deg) saturate(${3 + pulse * 2}) brightness(1)`;
      }
      this.ctx.drawImage(
        currentPlayerSprite,
        cx - spriteSize / 2,
        cy - spriteSize / 2,
        spriteSize,
        spriteSize
      );
      this.ctx.filter = 'none';
    } else {
      // Fallback to circle while image loads
      if (this.damageTimer > 0) {
        const pulse = Math.sin(this.damageElapsed * 20) * 0.5 + 0.5;
        this.ctx.filter = `sepia(${0.5 + pulse * 0.5}) hue-rotate(${-25 - pulse * 25}deg) saturate(${3 + pulse * 2}) brightness(1)`;
      }
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      if (themeGalaxy) {
        this.ctx.fillStyle = '#111';
        this.ctx.fill();
        this.ctx.strokeStyle = accentColor;
        this.ctx.lineWidth = 3;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = accentColor;
        this.ctx.stroke();
      } else {
        this.ctx.fillStyle = textColor;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
      this.ctx.filter = 'none';
    }
    
    // Draw Words and Enemies
    this.ctx.font = 'bold 16px Outfit, sans-serif';
    this.ctx.fillStyle = '#fff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    for (const w of this.words) {
      if (w.isEnemy) {
        // Set alpha for dying enemies
        if (w.dying) {
          this.ctx.globalAlpha = w.fadeTimer / 0.5;
        }
        
        // Draw enemy sprite
        const spriteSize = 60;
        if (w.dying) {
          // Draw explosion sprite for dying enemies
          if (this.explosionSpriteLoaded) {
            this.ctx.drawImage(
              this.explosionSprite,
              w.x - spriteSize / 2,
              w.y - spriteSize / 2,
              spriteSize,
              spriteSize
            );
          }
        } else {
          // Draw normal enemy sprite
          const currentSprite = this.enemySprites[w.enemySpriteIndex][w.animationFrame];
          if (currentSprite.complete && currentSprite.naturalWidth > 0) {
            this.ctx.drawImage(
              currentSprite,
              w.x - spriteSize / 2,
              w.y - spriteSize / 2,
              spriteSize,
              spriteSize
            );
          }
        }
        
        // Draw word text above the sprite
        this.ctx.font = 'bold 16px Outfit, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Measure text for background box
        const textMetrics = this.ctx.measureText(w.text);
        const textWidth = textMetrics.width;
        const fontSize = 16;
        const padding = 4;
        const boxWidth = textWidth + 2 * padding;
        const boxHeight = fontSize + 2 * padding;
        const textX = w.x;
        const textY = w.y - spriteSize / 2 - 20;
        const boxX = textX - boxWidth / 2;
        const boxY = textY - boxHeight / 2;
        
        // Draw white background box
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw black text
        this.ctx.fillStyle = '#000';
        if (themeGalaxy) {
          this.ctx.shadowBlur = 10;
          this.ctx.shadowColor = accentColor;
        } else {
          this.ctx.shadowBlur = 0;
        }
        this.ctx.fillText(w.text, textX, textY);
        
        // Reset alpha
        this.ctx.globalAlpha = 1;
      }
    }
    
    // Reset filter and shadow for next frame
    this.ctx.filter = 'none';
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;
  }
  
  drawGameOver() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = '#ff0055';
    this.ctx.font = 'bold 48px Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText("GAME OVER", this.canvas.width/2, this.canvas.height/2);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '24px Outfit, sans-serif';
    this.ctx.fillText("Refresh to restart", this.canvas.width/2, this.canvas.height/2 + 50);
  }
}