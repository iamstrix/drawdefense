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
    this.projectiles = [];
    this.particles = [];
    this.fadingEnemies = [];
    this.spawnTimer = 0;
    this.spawnInterval = 5000;

    this.gameState = 'MENU'; // 'MENU', 'PLAYING', 'GAME_OVER', 'STAGE_CLEAR', 'WIN'
    this.gameMode = 'ENDLESS'; // 'ENDLESS', 'STORY'
    this.isPaused = false;
    this.storyStage = 0;
    this.maxUnlockedStage = 0;
    this.wordsSpawned = 0;
    this.wordsDestroyed = 0;
    this.targetWords = Infinity;
    this.onStageClear = null;

    this.debugClickClear = false;

    this.lastTime = performance.now();

    // Animation states
    this.damageTimer = 0;
    this.damageElapsed = 0;
    this.attackTimer = 0;
    this.playerIdleTimer = 0;
    this.playerAnimationFrame = 0;

    // Load player sprites
    this.playerSprite = new Image();
    this.playerSprite.src = './src/assets/cat.png';
    this.playerSpriteLoaded = false;
    this.playerSprite.onload = () => { this.playerSpriteLoaded = true; };

    this.attackSprite = new Image();
    this.attackSprite.src = './src/assets/cat_attack.png';
    this.attackSpriteLoaded = false;
    this.attackSprite.onload = () => { this.attackSpriteLoaded = true; };

    this.idleSprite = new Image();
    this.idleSprite.src = './src/assets/cat_idle.png';
    this.idleSpriteLoaded = false;
    this.idleSprite.onload = () => { this.idleSpriteLoaded = true; };

    // Load enemy sprites (2 frames per enemy)
    this.enemySprites = [];
    this.enemySpritesLoaded = 0;
    const totalEnemies = 3; 
    for (let i = 1; i <= totalEnemies; i++) {
        const enemyImg1 = new Image();
        enemyImg1.src = `./src/assets/enemy${i.toString().padStart(2, '0')}.png`;
        enemyImg1.onload = () => { this.enemySpritesLoaded++; };
        
        const enemyImg2 = new Image();
        const frame2Name = i === 1 ? 'enemy1_.png' : `enemy${i.toString().padStart(2, '0')}_.png`;
        enemyImg2.src = `./src/assets/${frame2Name}`;
        enemyImg2.onload = () => { this.enemySpritesLoaded++; };
        
        this.enemySprites.push([enemyImg1, enemyImg2]);
    }

    // Load background
    this.backgroundImage = new Image();
    this.backgroundLoaded = false;
    this.updateBackground();

    // Resize handler
    window.addEventListener('resize', () => this.resize());
    this.resize();

    // Start loop
    requestAnimationFrame((t) => this.loop(t));
  }

  updateBackground() {
    this.backgroundLoaded = false;
    const level = (this.gameMode === 'STORY') ? (this.storyStage + 1) : 1;
    this.backgroundImage.src = `./src/assets/l${level}.png`;
    this.backgroundImage.onload = () => { this.backgroundLoaded = true; };
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const size = Math.min(parent.clientWidth, parent.clientHeight) - 20;
    this.canvas.width = size;
    this.canvas.height = size;
  }

  startGame(mode, startStage = 0) {
    this.gameMode = mode;
    this.gameState = 'PLAYING';
    this.score = 0;
    this.health = 10;
    this.words = [];
    this.particles = [];
    this.fadingEnemies = [];
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
      this.targetWords = this.storyStage === 0 ? 10 : (this.storyStage === 1 ? 15 : 20);
      this.spawnInterval = this.storyStage === 0 ? 6000 : (this.storyStage === 1 ? 5000 : 4000);
      this.wordsLeftEl.innerText = this.targetWords;
    } else {
      this.wordsLeftContainer.style.display = 'none';
      this.levelContainer.style.display = 'none';
      this.targetWords = Infinity;
      this.spawnInterval = 5000;
    }
    this.updateBackground();
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
      this.targetWords = 15;
      this.spawnInterval = 5000;
      this.health = Math.min(10, this.health + 3);
    } else if (this.storyStage === 2) {
      this.targetWords = 20;
      this.spawnInterval = 4000;
      this.health = Math.min(10, this.health + 3);
    }
    this.healthEl.innerText = this.health;
    if (this.gameMode === 'STORY') this.wordsLeftEl.innerText = this.targetWords;
    this.updateBackground();
    this.spawnTimer = this.spawnInterval;
  }

  spawnWord() {
    if (this.wordsSpawned >= this.targetWords) return;

    let currentPool = (this.gameMode === 'STORY') ? (STORY_POOLS[this.storyStage] || STORY_POOLS[0]) : ENDLESS_POOL;
    const wordText = currentPool[Math.floor(Math.random() * currentPool.length)];
    const enemyIndex = Math.floor(Math.random() * this.enemySprites.length);

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(this.canvas.width, this.canvas.height) / 2 + 50;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    this.words.push({
      text: wordText,
      x: cx + Math.cos(angle) * distance,
      y: cy + Math.sin(angle) * distance,
      speed: 12 + Math.random() * 9,
      isEnemy: true,
      enemySpriteIndex: enemyIndex,
      animationTimer: 0,
      animationFrame: 0,
      spawnTime: Date.now() + Math.random() // Tiny random to prevent exact same ms collision
    });
    this.wordsSpawned++;
    if (this.gameMode === 'STORY') this.wordsLeftEl.innerText = this.targetWords - this.wordsSpawned;
  }

  tryDestroyWord(predictedLabel, sketchImage) {
    // Chronological priority: Target the oldest spawned entity first
    // Filter for matches, then sort by spawnTime, then take the first one that isn't already targeted
    const matchingWords = this.words
      .filter(w => w.text.toLowerCase() === predictedLabel.toLowerCase() && !w.isTargeted)
      .sort((a, b) => a.spawnTime - b.spawnTime);
    
    const targetWord = matchingWords[0];
    
    if (targetWord) {
      targetWord.isTargeted = true;
      
      // Spawn Projectile
      this.projectiles.push({
        image: sketchImage,
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        target: targetWord,
        speed: 600,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 10
      });

      this.attackTimer = 0.5; 
      return true;
    }
    return false;
  }

  spawnExplosion(x, y) {
    const particleCount = 30 + Math.floor(Math.random() * 20);
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 350;
        const size = 3 + Math.random() * 5;
        const gray = Math.floor(Math.random() * 256);
        this.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size,
            color: `rgb(${gray}, ${gray}, ${gray})`,
            life: 0.8 + Math.random() * 1.2
        });
    }
  }

  handleCanvasClick(e) {
    if (!this.debugClickClear || this.gameState !== 'PLAYING' || this.isPaused) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (const w of this.words) {
      const dist = Math.sqrt((x - w.x)**2 + (y - w.y)**2);
      if (dist < 45) {
        this.tryDestroyWord(w.text);
        return;
      }
    }
  }

  togglePause() {
    if (this.gameState === 'PLAYING') {
      this.isPaused = !this.isPaused;
      if (!this.isPaused) this.lastTime = performance.now();
    }
  }

  loop(currentTime) {
    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (this.isPaused) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 48px Outfit, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2);
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    if (this.gameState === 'MENU' || this.gameState === 'STAGE_CLEAR') {
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

    if (this.gameMode === 'STORY' && this.wordsSpawned >= this.targetWords && this.words.length === 0) {
      if (this.storyStage < 2) {
        this.gameState = 'STAGE_CLEAR';
        this.maxUnlockedStage = Math.max(this.maxUnlockedStage, this.storyStage + 1);
        if (this.onStageClear) this.onStageClear(this.wordsDestroyed);
      } else {
        this.gameState = 'WIN';
      }
      requestAnimationFrame((t) => this.loop(t));
      return;
    }

    this.spawnTimer += dt * 1000;
    if (this.spawnTimer > this.spawnInterval && this.wordsSpawned < this.targetWords) {
      this.spawnWord();
      this.spawnTimer = 0;
      this.spawnInterval = Math.max(1500, this.spawnInterval - 30);
    }

    this.update(dt);
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.damageTimer = Math.max(0, this.damageTimer - dt);
    this.damageElapsed += dt;
    this.attackTimer = Math.max(0, this.attackTimer - dt);

    // Update player idle animation
    if (this.attackTimer <= 0) {
      // Dynamic speed: Base 1000ms, -100ms per enemy, min 100ms
      const animInterval = Math.max(0.1, 1.0 - (this.words.length * 0.1));
      
      this.playerIdleTimer += dt;
      if (this.playerIdleTimer >= animInterval) {
        this.playerIdleTimer = 0;
        this.playerAnimationFrame = 1 - this.playerAnimationFrame;
      }
    } else {
      this.playerIdleTimer = 0;
      this.playerAnimationFrame = 0;
    }

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    // Update active words
    for (let i = this.words.length - 1; i >= 0; i--) {
      const w = this.words[i];
      
      // Update walk animation
      w.animationTimer += dt;
      if (w.animationTimer >= 0.5) {
        w.animationTimer = 0;
        w.animationFrame = 1 - w.animationFrame;
      }

      const dx = cx - w.x;
      const dy = cy - w.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 40) { 
        this.words.splice(i, 1);
        this.health -= 1;
        this.healthEl.innerText = this.health;
        this.damageTimer = 0.2;
      } else {
        const nx = dx / dist;
        const ny = dy / dist;
        w.x += nx * w.speed * dt;
        w.y += ny * w.speed * dt;
      }
    }

    // Update fading enemies
    for (let i = this.fadingEnemies.length - 1; i >= 0; i--) {
      const fe = this.fadingEnemies[i];
      fe.life -= dt;
      fe.opacity = Math.max(0, fe.life);
      if (fe.life <= 0) this.fadingEnemies.splice(i, 1);
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 40) {
        // Impact!
        this.spawnExplosion(p.target.x, p.target.y);
        this.fadingEnemies.push({ ...p.target, opacity: 1.0, life: 1.0 });
        
        // Remove word
        this.words = this.words.filter(w => w !== p.target);
        this.projectiles.splice(i, 1);
        
        // Update stats
        this.score += 10;
        this.wordsDestroyed++;
        this.scoreEl.innerText = this.score;
      } else {
        const nx = dx / dist;
        const ny = dy / dist;
        p.x += nx * p.speed * dt;
        p.y += ny * p.speed * dt;
        p.rotation += p.rotationSpeed * dt;
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    if (this.backgroundLoaded) {
      this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
    }

    const rootStyles = getComputedStyle(document.documentElement);
    const textColor = rootStyles.getPropertyValue('--text-color').trim() || '#000';
    const accentColor = rootStyles.getPropertyValue('--accent-color').trim() || '#000';
    const themeGalaxy = document.documentElement.classList.contains('theme-galaxy');

    // Draw Player
    let currentPlayerSprite = this.playerSprite;
    let playerLoaded = this.playerSpriteLoaded;

    if (this.attackTimer > 0) {
      currentPlayerSprite = this.attackSprite;
      playerLoaded = this.attackSpriteLoaded;
    } else {
      currentPlayerSprite = (this.playerAnimationFrame === 0) ? this.playerSprite : this.idleSprite;
      playerLoaded = (this.playerAnimationFrame === 0) ? this.playerSpriteLoaded : this.idleSpriteLoaded;
    }
    
    if (playerLoaded) {
      const spriteSize = 120;
      if (this.damageTimer > 0) {
        const pulse = Math.sin(this.damageElapsed * 20) * 0.5 + 0.5;
        this.ctx.filter = `sepia(${0.5 + pulse * 0.5}) hue-rotate(${-25 - pulse * 25}deg) saturate(${3 + pulse * 2})`;
      }
      this.ctx.drawImage(currentPlayerSprite, cx - spriteSize / 2, cy - spriteSize / 2, spriteSize, spriteSize);
      this.ctx.filter = 'none';
    }

    // Draw Words and Animated Enemies
    for (const w of this.words) {
      const spriteSize = 70;
      const currentSprite = this.enemySprites[w.enemySpriteIndex][w.animationFrame];
      if (currentSprite.complete) {
        this.ctx.drawImage(currentSprite, w.x - spriteSize/2, w.y - spriteSize/2, spriteSize, spriteSize);
      }

      // Text Box Logic
      this.ctx.font = 'bold 16px Outfit, sans-serif';
      const textWidth = this.ctx.measureText(w.text).width;
      const padding = 4;
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(w.x - textWidth/2 - padding, w.y - spriteSize/2 - 25, textWidth + padding*2, 20);
      
      this.ctx.fillStyle = '#000';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(w.text, w.x, w.y - spriteSize/2 - 10);
    }

    // Draw Fading Enemies
    for (const fe of this.fadingEnemies) {
      this.ctx.globalAlpha = fe.opacity;
      const spriteSize = 70;
      const currentSprite = this.enemySprites[fe.enemySpriteIndex][fe.animationFrame];
      if (currentSprite.complete) {
        this.ctx.drawImage(currentSprite, fe.x - spriteSize/2, fe.y - spriteSize/2, spriteSize, spriteSize);
      }
      this.ctx.globalAlpha = 1.0;
    }

    // Draw Particles
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.min(1, p.life * 1.5);
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    this.ctx.globalAlpha = 1.0;

    // Draw Projectiles
    for (const p of this.projectiles) {
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation);
        
        // Match drawing scale roughly to enemy size or slightly smaller
        const scale = 0.4;
        this.ctx.drawImage(p.image, -p.image.width * scale / 2, -p.image.height * scale / 2, p.image.width * scale, p.image.height * scale);
        this.ctx.restore();
    }
  }

  drawGameOver() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#ff0055';
    this.ctx.font = 'bold 48px Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
  }

  drawWin() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#ffdf00';
    this.ctx.font = 'bold 48px Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText("YOU WIN!", this.canvas.width / 2, this.canvas.height / 2);
  }
}