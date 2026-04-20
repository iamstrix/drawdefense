export const DOODLE_CLASSES = [
  'apple', 'banana', 'bird', 'boat', 'book', 'bottle', 'bridge', 'butterfly',
  'car', 'chair', 'clock', 'cloud', 'cup', 'dog', 'door', 'envelope', 'eye',
  'fish', 'flower', 'hat', 'heart', 'house', 'key', 'ladder', 'leaf',
  'lightning', 'moon', 'mountain', 'pants', 'pencil', 'potato', 'snake',
  'spoon', 'star', 'sun', 'sword', 'tree', 'umbrella', 'zigzag'
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
    this.spawnInterval = 5000; // ms (was 3000)

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

  spawnWord() {
    const wordText = DOODLE_CLASSES[Math.floor(Math.random() * DOODLE_CLASSES.length)];
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
      speed: 8 + Math.random() * 6, // pixels per second
      isEnemy: true,
      enemySpriteIndex: enemyIndex
    });
  }

  tryDestroyWord(predictedLabel) {
    const matchingWords = this.words.filter(w => w.text.toLowerCase() === predictedLabel.toLowerCase());
    if (matchingWords.length > 0) {
      this.words = this.words.filter(w => w.text.toLowerCase() !== predictedLabel.toLowerCase());
      this.score += 10;
      this.scoreEl.innerText = this.score;
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
      // progressively harder, but more slowly
      this.spawnInterval = Math.max(2000, this.spawnInterval - 30);
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
        // Draw enemy sprite
        const spriteSize = 60;
        this.ctx.drawImage(
          this.enemySprites[w.enemySpriteIndex],
          w.x - spriteSize / 2,
          w.y - spriteSize / 2,
          spriteSize,
          spriteSize
        );

        // Draw word text above the sprite
        this.ctx.font = 'bold 12px Outfit, sans-serif';
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
        this.ctx.fillText(w.text, w.x, w.y - spriteSize / 2 - 20);
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
    this.ctx.fillText("Refresh to restart", this.canvas.width / 2, this.canvas.height / 2 + 50);
  }
}
