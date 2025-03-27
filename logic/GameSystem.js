import { Entity } from "./Entity.js";
import {
  PositionComponent,
  VelocityComponent,
  CollisionComponent,
  RenderComponent,
  GunComponent,
  HealthComponent,
  ScoreComponent,
} from "./Components.js";
import * as THREE from "three";
import { RaycastSystem } from "./Systems";
import { NetworkManager } from "../networking/NetworkManager";

export class GameSystem {
  constructor(renderer, assetLoader) {
    this.renderer = renderer;
    this.assetLoader = assetLoader;
    this.entities = [];
    this.player = null;
    this.raycastSystem = new RaycastSystem();

    // Initialize network manager
    this.networkManager = new NetworkManager(this.renderer.scene);
    this.networkManager.onRemotePlayerShot = (origin, direction) => {
      this.raycastSystem.addRay(origin, direction, null);
    };
    this.networkManager.connect();

    // Recoil animation state
    this.recoilState = {
      active: false,
      startTime: 0,
      duration: 100, // 100ms recoil animation
      returnDuration: 200, // 200ms return animation
    };

    // Bind shoot handler to mouse click
    document.addEventListener("click", () => this.handleShoot());
  }

  async setupPlayer() {
    const player = new Entity("player", "Player");
    const playerMesh = await this.assetLoader.getModel("player");
    player.addComponent(
      new PositionComponent(40, 20, 0),
      new VelocityComponent(0, 0, 0),
      new CollisionComponent(8, 8, 8, true),
      new RenderComponent(playerMesh),
      new GunComponent()
    );
    this.renderer.addToScene(playerMesh);

    // Load and add rifle
    try {
      player.rifle = await this.assetLoader.getModel("rifle");
      player.rifle.scale.set(0.07, 0.1, 0.1);
      this.renderer.addToScene(player.rifle);
    } catch (error) {
      console.error("Failed to load rifle:", error);
    }

    this.entities.push(player);
    this.player = player;
    return player;
  }

  async setupEnemies() {
    const enemyPositions = [
      { x: 0, y: 10, z: -20 },
      { x: 20, y: 10, z: -40 },
      { x: -20, y: 10, z: -30 },
    ];

    for (const pos of enemyPositions) {
      const enemy = new Entity("enemy", "Enemy");
      const enemyMesh = await this.assetLoader.getModel("enemy");
      enemy.addComponent(
        new PositionComponent(pos.x, pos.y, pos.z),
        new VelocityComponent(0, 0, 0),
        new CollisionComponent(8, 8, 8, true),
        new RenderComponent(enemyMesh),
        new HealthComponent(100)
      );
      this.renderer.addToScene(enemyMesh);
      this.entities.push(enemy);
    }
  }

  async setupEnvironment() {
    const cityModel = await this.assetLoader.getModel("city");
    this.renderer.addToScene(cityModel);
  }

  getEntities() {
    return this.entities;
  }

  removeEntity(entity) {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
      if (entity.components.has("RenderComponent")) {
        const renderComp = entity.components.get("RenderComponent");
        this.renderer.removeFromScene(renderComp.mesh);
      }
    }
  }

  handleShoot() {
    if (!this.player || !this.player.rifle) return;

    // Get current position for ray start
    const pos = this.player.components.get("PositionComponent");
    const rayStart = new THREE.Vector3(pos.x, pos.y + 1.7, pos.z);

    // Get direction from camera rotation
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyEuler(this.renderer.camera.rotation);

    // Add ray to raycast system
    this.raycastSystem.addRay(rayStart, direction, this.player);

    // Send shot to network
    this.networkManager.sendShot(rayStart, direction);

    // Start recoil animation
    this.recoilState.active = true;
    this.recoilState.startTime = performance.now();
  }

  update(delta, inputState) {
    if (!this.player) return;

    // Update player movement and rotation
    const pos = this.player.components.get("PositionComponent");
    const vel = this.player.components.get("VelocityComponent");

    // Reset velocity
    vel.x = 0;
    vel.y = 0;
    vel.z = 0;

    // Calculate movement direction based on player rotation
    if (inputState.rotation) {
      const speed = 2;
      const rotation = inputState.rotation.clone();
      // We only want yaw rotation (y-axis) for movement
      rotation.x = 0;
      rotation.z = 0;

      // Create direction vectors
      const forward = new THREE.Vector3(0, 0, -1);
      const right = new THREE.Vector3(1, 0, 0);
      forward.applyEuler(rotation);
      right.applyEuler(rotation);

      // Apply movement in the rotated directions
      if (inputState.forward) {
        vel.x += forward.x * speed;
        vel.z += forward.z * speed;
      }
      if (inputState.backward) {
        vel.x -= forward.x * speed;
        vel.z -= forward.z * speed;
      }
      if (inputState.left) {
        vel.x -= right.x * speed;
        vel.z -= right.z * speed;
      }
      if (inputState.right) {
        vel.x += right.x * speed;
        vel.z += right.z * speed;
      }
    }

    // Send position update to network
    if (inputState.rotation) {
      this.networkManager.sendPlayerState(pos, inputState.rotation);
    }

    // Update rifle position and rotation
    if (this.player.rifle) {
      // Position rifle relative to camera
      const cameraDirection = new THREE.Vector3(0, 0, -1);
      cameraDirection.applyEuler(inputState.rotation || new THREE.Euler());

      // Calculate rifle position
      const rifleOffset = new THREE.Vector3(
        5, // Right offset
        -4, // Down offset
        -10 // Forward offset
      );

      // Apply recoil animation
      if (this.recoilState.active) {
        const currentTime = performance.now();
        const elapsed = currentTime - this.recoilState.startTime;

        if (elapsed < this.recoilState.duration) {
          // Recoil back phase
          const progress = elapsed / this.recoilState.duration;
          rifleOffset.z += Math.sin(progress * Math.PI) * 2; // Move back by 2 units
          rifleOffset.y += Math.sin(progress * Math.PI) * 1; // Move up by 1 unit
        } else if (
          elapsed <
          this.recoilState.duration + this.recoilState.returnDuration
        ) {
          // Return phase
          const returnProgress =
            (elapsed - this.recoilState.duration) /
            this.recoilState.returnDuration;
          const smoothReturn = 1 - Math.pow(1 - returnProgress, 2); // Smooth easing
          rifleOffset.z += Math.sin((1 - smoothReturn) * Math.PI) * 2;
          rifleOffset.y += Math.sin((1 - smoothReturn) * Math.PI) * 1;
        } else {
          this.recoilState.active = false;
        }
      }

      rifleOffset.applyEuler(inputState.rotation || new THREE.Euler());

      this.player.rifle.position.set(
        pos.x + rifleOffset.x,
        pos.y + rifleOffset.y,
        pos.z + rifleOffset.z
      );

      if (inputState.rotation) {
        this.player.rifle.rotation.copy(inputState.rotation);
        this.player.rifle.rotateY(THREE.MathUtils.degToRad(-85));
      }
    }

    // Update camera position to follow player
    this.renderer.camera.position.set(pos.x, pos.y + 1.7, pos.z);
    if (inputState.rotation) {
      this.renderer.camera.rotation.copy(inputState.rotation);
    }

    // Update enemies
    this.entities.forEach((entity) => {
      if (entity.type === "Enemy") {
        this.updateEnemy(entity, delta);
      }
    });

    // Update raycast system
    this.raycastSystem.update(this.entities);

    // Draw ray effects for debug visualization
    this.raycastSystem.getProcessedRays().forEach((ray) => {
      this.renderer.createRayEffect(ray.start, ray.point);
    });

    // Update network manager with current timestamp
    this.networkManager.update(Date.now());
  }

  updateEnemy(enemy, delta) {
    // Add enemy behavior here (e.g., movement, targeting)
    const vel = enemy.components.get("VelocityComponent");
    if (Math.random() < 0.02) {
      vel.x = (Math.random() - 0.5) * 10;
      vel.z = (Math.random() - 0.5) * 10;
    }
  }
}
