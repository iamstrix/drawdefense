export const STORY_POOLS = [
  ['circle', 'square', 'triangle', 'line', 'star', 'heart', 'moon', 'cloud', 'sun', 'lightning'], // Stage 1 (10 words)
  ['cup', 'book', 'hat', 'apple', 'potato', 'banana', 'spoon', 'tree', 'leaf', 'fish', 'bird', 'key', 'envelope', 'door', 'sword'], // Stage 2 (15 words)
  ['shoe', 'airplane', 'car', 'boat', 'umbrella', 'house', 'bridge', 'mountain', 'pencil', 'pants', 'snake', 'dog', 'clock', 'butterfly', 'chair', 'scissors', 'mushroom', 'eyeglasses', 'bed', 'bicycle'] // Stage 3 (20 words)
];

export const ENDLESS_POOL = [
  ...STORY_POOLS[0], ...STORY_POOLS[1], ...STORY_POOLS[2],
  'eye', 'ladder', 'zigzag' // Extras
];

export class GameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    this.score = 0;
    this.health = 10;

    this.scoreEl = document.getElementById('scoreVal');
    this.healthEl = document.getElementById('healthVal');
    this.wordsLeftEl = document.getElementById('wordsLeftVal');
    this.wordsLeftContainer = document.getElementById('wordsLeftContainer');
    this.levelEl = document.getElementById('levelVal');
    this.levelContainer = document.getElementById('levelContainer');

    this.words = [];
    this.spawnTimer = 0;
    this.spawnInterval = 5000; // ms (was 3000)

    this.gameState = 'MENU'; // 'MENU', 'PLAYING', 'GAME_OVER', 'STAGE_CLEAR', 'WIN'
    this.gameMode = 'ENDLESS'; // 'ENDLESS', 'STORY'
    this.isPaused = false;
    this.storyStage = 0;
    this.maxUnlockedStage = 0;
    this.wordsSpawned = 0;
    this.wordsDestroyed = 0;
    this.targetWords = Infinity;
    this.onStageClear = null;

    this.lastTime = performance.now();

    // Load player sprite
    this.playerSprite = new Image();
    this.playerSprite.src = './src/assets/cat.png';
    this.playerSpriteLoaded = false;
    this.playerSprite.onload = () => {
      this.playerSpriteLoaded = true;
    };

    // Load enemy sprites
    this.enemySprites = [];
    this.enemySpritesLoaded = 0;
    const totalEnemies = 6;
    for (let i = 1; i <= totalEnemies; i++) {
      const enemyImg = new Image();
      enemyImg.src = `./src/assets/enemy${i.toString().padStart(2, '0')}.png`;
      enemyImg.onload = () => {
        this.enemySpritesLoaded++;
      };
      this.enemySprites.push(enemyImg);
    }

    // // Load background image
    // this.backgroundImage = new Image();
    // this.backgroundImage.src = './src/assets/l3.jpg';
    // this.backgroundLoaded = false;
    // this.backgroundImage.onload = () => {
    //   this.backgroundLoaded = true;
    // };

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

  startGame(mode, startStage = 0) {
    this.gameMode = mode;
    this.gameState = 'PLAYING';
    this.score = 0;
    this.health = 10;
    this.words = [];
    this.spawnTimer = 0;
    this.wordsSpawned = 0;
    this.wordsDestroyed = 0;
    this.scoreEl.innerText = this.score;
    this.healthEl.innerText = this.health;
    this.isPaused = false;
    this.lastTime = performance.now();

    if (this.gameMode === 'STORY') {
      this.wordsLeftContainer.style.display = 'block';
      this.levelContainer.style.display = 'block';
      this.storyStage = startStage;
      this.levelEl.innerText = this.storyStage + 1;
      if (this.storyStage === 0) {
        this.targetWords = 10; // Stage 1
        this.spawnInterval = 6000;
      } else if (this.storyStage === 1) {
        this.targetWords = 15; // Stage 2
        this.spawnInterval = 5000;
      } else {
        this.targetWords = 20; // Stage 3
        this.spawnInterval = 4000;
      }
      this.wordsLeftEl.innerText = this.targetWords;
    } else {
      this.wordsLeftContainer.style.display = 'none';
      this.levelContainer.style.display = 'none';
      this.targetWords = Infinity;
      this.spawnInterval = 5000;
    }
    
    // Force immediate first spawn
    this.spawnTimer = this.spawnInterval;
  }

  nextStage() {
    this.storyStage++;
    this.gameState = 'PLAYING';
    this.isPaused = false;
    this.words = [];
    this.wordsSpawned = 0;
    this.wordsDestroyed = 0;
    this.lastTime = performance.now();
    this.levelEl.innerText = this.storyStage + 1;

    if (this.storyStage === 1) {
      this.targetWords = 15; // Stage 2
      this.spawnInterval = 5000;
      this.health = Math.min(10, this.health + 3); // Heal some health
    } else if (this.storyStage === 2) {
      this.targetWords = 20; // Stage 3
      this.spawnInterval = 4000;
      this.health = Math.min(10, this.health + 3);
    }
    this.healthEl.innerText = this.health;
    
    if (this.gameMode === 'STORY') {
      this.wordsLeftEl.innerText = this.targetWords;
    }
    
    // Force immediate first spawn
    this.spawnTimer = this.spawnInterval;
  }

  spawnWord() {
    if (this.wordsSpawned >= this.targetWords) return;

    let currentPool = ENDLESS_POOL;
    if (this.gameMode === 'STORY') {
      currentPool = STORY_POOLS[this.storyStage] || STORY_POOLS[0];
    }

    const wordText = currentPool[Math.floor(Math.random() * currentPool.length)];
    const enemyIndex = Math.floor(Math.random() * this.enemySprites.length);

    // Radial spawning logic
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(this.canvas.width, this.canvas.height) / 2 + 50; // starts outside
    
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    this.words.push({
      text: wordText,
      x: cx + Math.cos(angle) * distance,
      y: cy + Math.sin(angle) * distance,
      speed: 12 + Math.random() * 9, // pixels per second (50% faster)
      isEnemy: true,
      enemySpriteIndex: enemyIndex
    });
    this.wordsSpawned++;
    
    if (this.gameMode === 'STORY') {
      this.wordsLeftEl.innerText = this.targetWords - this.wordsSpawned;
    }
  }

  tryDestroyWord(predictedLabel) {
    const matchingWords = this.words.filter(w => w.text.toLowerCase() === predictedLabel.toLowerCase());
    if (matchingWords.length > 0) {
      this.words = this.words.filter(w => w.text.toLowerCase() !== predictedLabel.toLowerCase());
      this.score += 10;
      this.wordsDestroyed++;
      this.scoreEl.innerText = this.score;
      return true;
    }
    return false;
  }

  togglePause() {
    if (this.gameState === 'PLAYING') {
      this.isPaused = !this.isPaused;
      if (!this.isPaused) {
        this.lastTime = performance.now(); // Avoid a huge dt jump after pausing
      }
    }
  }

  loop(currentTime) {
    const dt = (currentTime - this.lastTime) / 1000; // delta time in seconds
    this.lastTime = currentTime;

    if (this.isPaused) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 48px Outfit, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2);
      this.lastTime = currentTime;
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    if (this.gameState === 'MENU') {
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    if (this.gameState === 'STAGE_CLEAR') {
      // Just idle, visual overlay is handled by main.js
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    if (this.gameState === 'WIN') {
      this.drawWin();
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    if (this.health <= 0) {
      this.gameState = 'GAME_OVER';
      this.drawGameOver();
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    // Check Win/Clear Conditions
    if (this.gameMode === 'STORY' && this.wordsSpawned >= this.targetWords && this.words.length === 0) {
      if (this.storyStage < 2) { // 3 stages total (0, 1, 2)
        this.gameState = 'STAGE_CLEAR';
        this.maxUnlockedStage = Math.max(this.maxUnlockedStage, this.storyStage + 1);
        if (this.onStageClear) this.onStageClear(this.wordsDestroyed);
      } else {
        this.gameState = 'WIN';
      }
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    // Spawning
    this.spawnTimer += dt * 1000;
    if (this.spawnTimer > this.spawnInterval && this.wordsSpawned < this.targetWords) {
      this.spawnWord();
      this.spawnTimer = 0;
      // progressively harder, but more slowly
      this.spawnInterval = Math.max(1500, this.spawnInterval - 30);
    }

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    for (let i = this.words.length - 1; i >= 0; i--) {
      const w = this.words[i];
      const dx = cx - w.x;
      const dy = cy - w.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 50) { // reached player
        this.words.splice(i, 1);
        this.health -= 1;
        this.healthEl.innerText = this.health;
      } else {
        const nx = dx / dist;
        const ny = dy / dist;
        w.x += nx * w.speed * dt;
        w.y += ny * w.speed * dt;
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    // // Draw background image
    // if (this.backgroundLoaded) {
    //   this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
    // }

    const rootStyles = getComputedStyle(document.documentElement);
    const textColor = rootStyles.getPropertyValue('--text-color').trim() || '#000';
    const accentColor = rootStyles.getPropertyValue('--accent-color').trim() || '#000';
    const themeGalaxy = document.documentElement.classList.contains('theme-galaxy');

    // Draw Player (Center Base)
    if (this.playerSpriteLoaded) {
      const spriteSize = 100; // Adjust size as needed
      this.ctx.drawImage(
        this.playerSprite,
        cx - spriteSize / 2,
        cy - spriteSize / 2,
        spriteSize,
        spriteSize
      );
    } else {
      // Fallback to circle while image loads
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
    }

    // Draw Words and Enemies
    this.ctx.font = 'bold 12px Outfit, sans-serif';
    this.ctx.fillStyle = '#fff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (const w of this.words) {
      if (w.isEnemy) {
        // Draw enemy sprite (largened by 50%: 60px -> 90px)
        const spriteSize = 90;
        this.ctx.drawImage(
          this.enemySprites[w.enemySpriteIndex],
          w.x - spriteSize / 2,
          w.y - spriteSize / 2,
          spriteSize,
          spriteSize
        );

        // Draw word text above the sprite
        this.ctx.font = 'bold 14px Outfit, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        if (themeGalaxy) {
          this.ctx.fillStyle = '#fff';
          this.ctx.shadowBlur = 10;
          this.ctx.shadowColor = accentColor;
        } else {
          this.ctx.fillStyle = textColor;
          this.ctx.shadowBlur = 0;
        }
        this.ctx.fillText(w.text, w.x, w.y - spriteSize / 2 - 25);
      }
    }

    // Reset shadow for next frame
    this.ctx.shadowBlur = 0;
  }

  drawGameOver() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ff0055';
    this.ctx.font = 'bold 48px Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '24px Outfit, sans-serif';
    this.ctx.fillText("Click here to return to menu", this.canvas.width / 2, this.canvas.height / 2 + 50);
  }

  drawStageClear() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#00f3ff';
    this.ctx.font = 'bold 48px Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText("STAGE CLEARED!", this.canvas.width / 2, this.canvas.height / 2);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '24px Outfit, sans-serif';
    this.ctx.fillText("Click here for Next Stage", this.canvas.width / 2, this.canvas.height / 2 + 50);
  }

  drawWin() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ffdf00';
    this.ctx.font = 'bold 48px Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText("YOU WIN!", this.canvas.width / 2, this.canvas.height / 2);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '24px Outfit, sans-serif';
    this.ctx.fillText("Click here to return to menu.", this.canvas.width / 2, this.canvas.height / 2 + 50);
  }
}
