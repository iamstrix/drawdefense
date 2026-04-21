import './style.css';
import { ThemeManager } from './ThemeManager.js';
import { GameEngine } from './GameEngine.js';
import { DrawBoard } from './DrawBoard.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Theme System
  const themeManager = new ThemeManager();

  // Initialize Left Side (Game Engine)
  const gameEngine = new GameEngine('gameCanvas');

  // Initialize Right Side (Drawing Board + ML)
  const drawBoard = new DrawBoard('drawCanvas', gameEngine);

  // UI Elements
  const mainMenu = document.getElementById('main-menu');
  const levelSelectMenu = document.getElementById('level-select-menu');
  const stageClearMenu = document.getElementById('stage-clear-menu');
  const gameContainer = document.getElementById('game-container');

  const wordsClearedVal = document.getElementById('wordsClearedVal');
  const nextStageBtn = document.getElementById('nextStageBtn');
  const stageClearMenuBtn = document.getElementById('stageClearMenuBtn');

  const centerControls = document.getElementById('centerControls');
  const pauseBtn = document.getElementById('pauseBtn');
  const quitBtn = document.getElementById('quitBtn');

  const storyBtn = document.getElementById('storyModeBtn');
  const endlessBtn = document.getElementById('endlessModeBtn');
  const backToMenuBtn = document.getElementById('backToMenuBtn');

  const lvl0Btn = document.getElementById('lvl0Btn');
  const lvl1Btn = document.getElementById('lvl1Btn');
  const lvl2Btn = document.getElementById('lvl2Btn');
  const debugUnlockBtn = document.getElementById('debugUnlockBtn');
  const debugClearStageBtn = document.getElementById('debugClearStageBtn');

  function updateLevelButtons() {
    lvl0Btn.disabled = false;
    lvl1Btn.disabled = gameEngine.maxUnlockedStage < 1;
    lvl2Btn.disabled = gameEngine.maxUnlockedStage < 2;
  }

  function showLevelSelect() {
    mainMenu.classList.add('hidden');
    levelSelectMenu.classList.remove('hidden');
    updateLevelButtons();
  }

  function hideLevelSelect() {
    levelSelectMenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
  }

  function start(mode, stage = 0) {
    mainMenu.classList.add('hidden');
    levelSelectMenu.classList.add('hidden');
    gameContainer.style.display = 'flex';
    centerControls.style.display = 'flex';
    pauseBtn.innerText = "pause";
    gameEngine.startGame(mode, stage);

    // Resize canvases since they were display: none
    gameEngine.resize();
    drawBoard.resize();
    drawBoard.clear(); // Ensure fresh board

    // Manage visibility of in-game debug button
    debugClearStageBtn.style.display = (mode === 'STORY') ? 'block' : 'none';
  }

  storyBtn.addEventListener('click', () => showLevelSelect());
  endlessBtn.addEventListener('click', () => start('ENDLESS'));
  backToMenuBtn.addEventListener('click', () => hideLevelSelect());

  lvl0Btn.addEventListener('click', () => start('STORY', 0));
  lvl1Btn.addEventListener('click', () => start('STORY', 1));
  lvl2Btn.addEventListener('click', () => start('STORY', 2));

  debugUnlockBtn.addEventListener('click', () => {
    gameEngine.maxUnlockedStage = 2;
    updateLevelButtons();
  });

  debugClearStageBtn.addEventListener('click', () => {
    // Graceful fake-win logic to trick the game engine
    gameEngine.wordsDestroyed += (gameEngine.targetWords - gameEngine.wordsSpawned) + gameEngine.words.length;
    gameEngine.wordsSpawned = gameEngine.targetWords;
    gameEngine.words = [];
  });

  pauseBtn.addEventListener('click', () => {
    gameEngine.togglePause();
    pauseBtn.innerText = gameEngine.isPaused ? "resume" : "pause";
    drawBoard.setPaused(gameEngine.isPaused);
  });

  quitBtn.addEventListener('click', () => {
    gameContainer.style.display = 'none';
    centerControls.style.display = 'none';
    hideStageClearMenu();
    mainMenu.classList.remove('hidden');
    gameEngine.gameState = 'MENU';
    gameEngine.isPaused = false;
  });

  // --- STAGE CLEAR MENU LOGIC ---
  function hideStageClearMenu() {
    stageClearMenu.classList.add('hidden');
  }

  gameEngine.onStageClear = (wordsDestroyed) => {
    wordsClearedVal.innerText = wordsDestroyed;
    stageClearMenu.classList.remove('hidden');
    drawBoard.clear(); // Clear player's drawing
    gameEngine.ctx.clearRect(0, 0, gameEngine.canvas.width, gameEngine.canvas.height);
  };

  nextStageBtn.addEventListener('click', () => {
    hideStageClearMenu();
    gameEngine.nextStage();
    drawBoard.clear();
  });

  stageClearMenuBtn.addEventListener('click', () => {
    hideStageClearMenu();
    gameContainer.style.display = 'none';
    centerControls.style.display = 'none';
    showLevelSelect();
  });

  // Handle advancing or returning from legacy canvas screens (Win/Game Over)
  gameEngine.canvas.addEventListener('click', () => {
    if (gameEngine.gameState === 'GAME_OVER' || gameEngine.gameState === 'WIN') {
      gameContainer.style.display = 'none';
      centerControls.style.display = 'none';
      if (gameEngine.gameMode === 'STORY') {
        showLevelSelect();
      } else {
        mainMenu.classList.remove('hidden');
      }
    }
  });
});
