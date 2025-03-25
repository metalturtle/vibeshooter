import { Renderer } from "./renderer/Renderer.js";
import {
  MovementSystem,
  CollisionSystem,
  RaycastSystem,
} from "./logic/Systems.js";
import { InputManager } from "./input/InputManager.js";
import { AssetLoader } from "./loader/AssetLoader.js";
import { Entity } from "./logic/Entity.js";
import {
  PositionComponent,
  VelocityComponent,
  CollisionComponent,
  RenderComponent,
  GunComponent,
  HealthComponent,
  ScoreComponent,
} from "./logic/Components.js";

const renderer = new Renderer();
const inputManager = new InputManager();
const assetLoader = new AssetLoader();
const movementSystem = new MovementSystem();
const collisionSystem = new CollisionSystem();
const raycastSystem = new RaycastSystem();
const entities = [];

async function setupDemoScene() {
  // Setup lighting
  const ambientLight = new THREE.AmbientLight(0x404040);
  renderer.addToScene(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, 1);
  renderer.addToScene(directionalLight);

  // Ground
  const floor = assetLoader.loadPlane(100, 100, 0x808080);
  floor.rotation.x = -Math.PI / 2;  // Make it horizontal
  floor.scale.set(3, 3, 3);  // Make ground bigger
  renderer.addToScene(floor);

  // Create player
  const player = new Entity("player", "Player");
  const playerMesh = assetLoader.loadCube(2, 0xff0000);  // Made player bigger
  player.addComponent(
    new PositionComponent(0, 2, 0),  // Raised player height
    new VelocityComponent(0, 0, 0),
    new CollisionComponent(1, 4, 1),  // Adjusted collision box
    new RenderComponent(playerMesh),
    new GunComponent(),
    new HealthComponent(100),
    new ScoreComponent(0)
  );
  renderer.addToScene(playerMesh);
  
  // Set initial camera position
  renderer.camera.position.set(0, 3.4, 0);  // Doubled eye height
  
  // Load and add rifle model
  try {
    const rifle = await assetLoader.loadRifle();
    rifle.scale.set(2, 2, 2);  // Made rifle bigger
    player.rifle = rifle;
    renderer.addToScene(rifle);
  } catch (error) {
    console.error('Failed to load rifle:', error);
  }

  entities.push(player);
  renderer.addEntity(player);

  // Create target cubes
  for (let i = 0; i < 5; i++) {
    const box = new Entity("box" + i, "Box");
    const x = Math.random() * 20 - 10;  // Spread boxes out more
    const z = Math.random() * 20 - 10;
    const boxMesh = assetLoader.loadCube(2, 0x0000ff);  // Made boxes bigger
    box.addComponent(
      new PositionComponent(x, 1, z),  // Raised box height
      new CollisionComponent(2, 2, 2),  // Adjusted collision box
      new RenderComponent(boxMesh)
    );
    renderer.addToScene(boxMesh);
    entities.push(box);
    renderer.addEntity(box);
  }

  // Create shooters
  for (let i = 0; i < 3; i++) {
    const shooter = new Entity("shooter" + i, "Shooter");
    const x = Math.random() * 40 - 20;  // Spread shooters out more
    const z = Math.random() * 40 - 20;
    const shooterMesh = assetLoader.loadCube(2, 0xffff00);  // Made shooters bigger
    shooter.addComponent(
      new PositionComponent(x, 1, z),  // Raised shooter height
      new VelocityComponent(Math.random() * 2 - 1, 0, Math.random() * 2 - 1),
      new CollisionComponent(2, 2, 2),  // Adjusted collision box
      new RenderComponent(shooterMesh),
      new GunComponent()
    );
    renderer.addToScene(shooterMesh);
    entities.push(shooter);
    renderer.addEntity(shooter);
  }

  // Register interactions
  raycastSystem.registerInteraction("Box", (target) => {
    const index = entities.indexOf(target);
    if (index !== -1) {
      renderer.removeEntity(target);  // This will also remove the mesh
      entities.splice(index, 1);
      const player = entities.find(e => e.type === "Player");
      if (player) {
        const score = player.components.get("ScoreComponent");
        if (score) score.points += 10;
      }
    }
  });
}

function updatePlayer(player, input) {
  const pos = player.components.get("PositionComponent");
  const speed = 5;  // Increased speed for larger scale

  // Get forward and right vectors from camera
  const forward = new THREE.Vector3(0, 0, -1);
  const right = new THREE.Vector3(1, 0, 0);
  forward.applyQuaternion(renderer.camera.quaternion);
  right.applyQuaternion(renderer.camera.quaternion);

  // Zero out y component to keep movement horizontal
  forward.y = 0;
  right.y = 0;
  forward.normalize();
  right.normalize();

  // Calculate movement direction
  const movement = new THREE.Vector3(0, 0, 0);
  if (input.keys["w"]) movement.add(forward);
  if (input.keys["s"]) movement.sub(forward);
  if (input.keys["d"]) movement.add(right);
  if (input.keys["a"]) movement.sub(right);

  // Normalize and apply speed
  if (movement.length() > 0) {
    movement.normalize();
    movement.multiplyScalar(speed);
    pos.x += movement.x;
    pos.z += movement.z;
  }

  // Update camera position and rotation
  renderer.camera.position.set(pos.x, pos.y + 3.4, pos.z);  // Doubled eye height
  renderer.camera.rotation.y -= input.mouseX * 0.5;
  
  // Update rifle position
  if (player.rifle) {
    // Position much further away from camera
    const offset = new THREE.Vector3(2, -1.5, -4);  // Moved much further right, down, and forward
    offset.applyQuaternion(renderer.camera.quaternion);
    player.rifle.position.copy(renderer.camera.position).add(offset);
    
    // Copy camera rotation and add rotation around Y axis
    player.rifle.quaternion.copy(renderer.camera.quaternion);
    player.rifle.rotateY(Math.PI / 2);  // Rotate around vertical axis
  }

  if (input.mouseDown) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera({ x: 0, y: 0 }, renderer.camera);
    const rayStart = renderer.camera.position.clone();
    const rayEnd = rayStart.clone().add(ray.ray.direction.multiplyScalar(20));
    
    // Create visual effect for the ray
    renderer.createRayEffect(rayStart, rayEnd);
    
    // Check for hits
    raycastSystem.checkRay(rayStart, rayEnd, entities);
  }
}

function updateShooter(shooter, player, raycastSystem) {
  if (Math.random() < 0.01) {
    const ray = new THREE.Raycaster();
    const pos = shooter.components.get("PositionComponent");
    ray.set(
      new THREE.Vector3(pos.x, pos.y, pos.z),
      new THREE.Vector3(
        Math.random() - 0.5,
        0,
        Math.random() - 0.5
      ).normalize()
    );
    raycastSystem.addRay(ray, shooter);
  }
}

function updateLogic(entities, delta, input) {
  // Update player
  const player = entities.find(e => e.type === "Player");
  if (player) {
    updatePlayer(player, input);
  }

  // Update shooters
  entities.filter(e => e.type === "Shooter").forEach(shooter => {
    updateShooter(shooter, player, raycastSystem);
  });
}

let lastTime = performance.now();
function gameLoop() {
  const currentTime = performance.now();
  const delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  const inputState = inputManager.getState();
  updateLogic(entities, delta, inputState);
  renderer.render();

  requestAnimationFrame(gameLoop);
}

// Initialize game
setupDemoScene().then(() => {
  gameLoop();
}).catch(error => {
  console.error('Failed to setup scene:', error);
});
