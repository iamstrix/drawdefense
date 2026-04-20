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
  
  // Wait a few seconds before spawning the first word
  // to let ml5 model load
  setTimeout(() => {
    gameEngine.spawnTimer = gameEngine.spawnInterval;
  }, 2000);
});
