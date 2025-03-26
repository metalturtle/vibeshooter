import * as THREE from 'three';
import { Entity } from './Entity.js';
import { InputState } from '../input/InputManager.js';

export class MovementSystem {
  update(entities: Entity[], inputState: InputState) {
    entities.forEach(entity => {
      const pos = entity.components.get("PositionComponent");
      const vel = entity.components.get("VelocityComponent");
      if (pos && vel) {
        pos.x += vel.x;
        pos.y += vel.y;
        pos.z += vel.z;
      }
    });
  }
}

export class CollisionSystem {
  update(entities: Entity[]) {
    for (let i = 0; i < entities.length; i++) {
      const entityA = entities[i];
      const collisionA = entityA.components.get("CollisionComponent");
      const posA = entityA.components.get("PositionComponent");

      if (!collisionA || !posA) continue;

      for (let j = i + 1; j < entities.length; j++) {
        const entityB = entities[j];
        const collisionB = entityB.components.get("CollisionComponent");
        const posB = entityB.components.get("PositionComponent");

        if (!collisionB || !posB) continue;

        // Simple AABB collision check
        if (this.checkCollision(
          posA, collisionA,
          posB, collisionB
        )) {
          this.handleCollision(entityA, entityB);
        }
      }
    }
  }

  private checkCollision(posA: any, collA: any, posB: any, collB: any): boolean {
    return (
      Math.abs(posA.x - posB.x) < (collA.width + collB.width) / 2 &&
      Math.abs(posA.y - posB.y) < (collA.height + collB.height) / 2 &&
      Math.abs(posA.z - posB.z) < (collA.depth + collB.depth) / 2
    );
  }

  private handleCollision(entityA: Entity, entityB: Entity) {
    // Handle different collision types
    if (entityA.type === "Bullet" || entityB.type === "Bullet") {
      const bullet = entityA.type === "Bullet" ? entityA : entityB;
      const target = entityA.type === "Bullet" ? entityB : entityA;
      
      if (target.components.has("HealthComponent")) {
        const health = target.components.get("HealthComponent");
        health.value -= 20; // Bullet damage
      }
    }
  }
}

export class RaycastSystem {
  private rays: Array<{
    origin: THREE.Vector3;
    direction: THREE.Vector3;
    source: Entity;
  }> = [];

  private processedRays: Array<{
    start: THREE.Vector3;
    point: THREE.Vector3;
  }> = [];

  addRay(origin: THREE.Vector3, direction: THREE.Vector3, source: Entity) {
    this.rays.push({ origin, direction, source });
  }

  getProcessedRays() {
    return this.processedRays;
  }

  update(entities: Entity[]) {
    this.processedRays = [];
    
    this.rays.forEach(ray => {
      const raycaster = new THREE.Raycaster(ray.origin, ray.direction);
      
      // Convert entities to meshes for raycasting
      const meshes = entities
        .filter(e => e !== ray.source && e.components.has("RenderComponent"))
        .map(e => e.components.get("RenderComponent").mesh);
      
      const intersects = raycaster.intersectObjects(meshes);
      
      if (intersects.length > 0) {
        this.processedRays.push({
          start: ray.origin,
          point: intersects[0].point
        });
      }
    });
    
    this.rays = []; // Clear rays after processing
  }
}

export class GunSystem {
  update(entities: Entity[], delta: number) {
    entities.forEach(entity => {
      const gun = entity.components.get("GunComponent");
      if (gun) {
        // Update cooldown
        if (gun.cooldown > 0) {
          gun.cooldown -= delta;
        }
        
        // Update recoil
        if (gun.recoilOffset.y > 0) {
          gun.recoilOffset.y *= 0.9;
        }
        if (gun.recoilOffset.z < 0) {
          gun.recoilOffset.z *= 0.9;
        }
      }
    });
  }

  shoot(entity: Entity, raycastSystem: RaycastSystem): boolean {
    const gun = entity.components.get("GunComponent");
    if (!gun || gun.cooldown > 0) return false;

    // Apply recoil
    gun.recoilOffset.y = 0.3;
    gun.recoilOffset.z = -0.2;
    gun.cooldown = 0.1; // 100ms cooldown

    return true;
  }
}

export class CloudSystem {
  private time: number = 0;

  update(delta: number = 0.016) {
    this.time += delta;
    // Cloud movement logic here
  }
}
