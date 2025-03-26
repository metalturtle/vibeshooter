import { Renderer } from "./renderer/Renderer.js";
import {
  MovementSystem,
  CollisionSystem,
  RaycastSystem,
  GunSystem,
  CloudSystem,
} from "./logic/Systems.js";
import { InputManager } from "./input/InputManager.js";
import { AssetLoader } from "./loader/AssetLoader.js";
import { GameSystem } from "./logic/GameSystem.js";
import { RainSystem } from "./effects/RainSystem.js";

// Initialize core systems
const renderer = new Renderer();
const inputManager = new InputManager(renderer.domElement);
const assetLoader = new AssetLoader();
const gameSystem = new GameSystem(renderer, assetLoader);

// Initialize game systems
const movementSystem = new MovementSystem();
const collisionSystem = new CollisionSystem();
const raycastSystem = new RaycastSystem();
const gunSystem = new GunSystem();
const cloudSystem = new CloudSystem();
const rainSystem = new RainSystem(renderer);

async function initializeGame() {
  try {
    // Setup game environment and entities
    await gameSystem.setupEnvironment();
    await gameSystem.setupPlayer();
    await gameSystem.setupEnemies();
    
    // Start game loop
    requestAnimationFrame(gameLoop);
  } catch (error) {
    console.error("Failed to initialize game:", error);
  }
}

let lastTime = performance.now();
function gameLoop() {
  const currentTime = performance.now();
  const delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  // Get current input state
  const inputState = inputManager.getState();

  // Update all systems
  gameSystem.update(delta, inputState);
  movementSystem.update(gameSystem.getEntities(), inputState);
  collisionSystem.update(gameSystem.getEntities());
  gunSystem.update(gameSystem.getEntities(), delta);
  cloudSystem.update();
  rainSystem.update();

  // Render scene
  renderer.render();

  requestAnimationFrame(gameLoop);
}

// Initialize game
initializeGame();
