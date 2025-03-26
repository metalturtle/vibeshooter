// THREE is loaded globally from CDN
import * as THREE from "three";

export class MovementSystem {
  update(entities, delta) {
    entities.forEach((entity) => {
      if (
        entity.components.has("PositionComponent") &&
        entity.components.has("VelocityComponent")
      ) {
        const pos = entity.components.get("PositionComponent");
        const vel = entity.components.get("VelocityComponent");

        // Create movement vector from velocity
        const movement = new THREE.Vector3(vel.x, vel.y, vel.z);
        movement.multiplyScalar(delta); // Apply time delta

        // console.log("pos", pos.x, pos.y, pos.z);
        // Only apply movement if there is any
        // if (movement.length() > 0) {
        //   pos.x += movement.x;
        //   pos.y += movement.y;
        //   pos.z += movement.z;
        // }
      }
    });
  }
}

export class CollisionSystem {
  checkCollision(box1, pos1, box2, pos2) {
    return (
      Math.abs(pos1.x - pos2.x) * 2 < box1.width + box2.width &&
      Math.abs(pos1.y - pos2.y) * 2 < box1.height + box2.height &&
      Math.abs(pos1.z - pos2.z) * 2 < box1.depth + box2.depth
    );
  }

  // Returns the movement vector after resolving collisions
  resolveCollision(entity, movement, entities) {
    const pos = entity.components.get("PositionComponent");
    const box = entity.components.get("CollisionComponent");
    if (!pos || !box) return movement;

    const newPos = {
      x: pos.x + movement.x,
      y: pos.y + movement.y,
      z: pos.z + movement.z,
    };

    let finalMovement = { ...movement };

    entities.forEach((other) => {
      if (other === entity) return;

      const otherPos = other.components.get("PositionComponent");
      const otherBox = other.components.get("CollisionComponent");

      if (!otherPos || !otherBox || !otherBox.solid) return;

      // Check collision with new position
      if (this.checkCollision(box, newPos, otherBox, otherPos)) {
        // Calculate overlap in each axis
        const overlapX =
          (box.width + otherBox.width) / 2 - Math.abs(newPos.x - otherPos.x);
        const overlapY =
          (box.height + otherBox.height) / 2 - Math.abs(newPos.y - otherPos.y);
        const overlapZ =
          (box.depth + otherBox.depth) / 2 - Math.abs(newPos.z - otherPos.z);

        // Find smallest overlap to determine push direction
        if (overlapX < overlapY && overlapX < overlapZ) {
          finalMovement.x = 0;
          newPos.x = pos.x;
        } else if (overlapY < overlapZ) {
          finalMovement.y = 0;
          newPos.y = pos.y;
        } else {
          finalMovement.z = 0;
          newPos.z = pos.z;
        }
      }
    });

    return finalMovement;
  }

  update(entities) {
    entities.forEach((entity) => {
      const pos = entity.components.get("PositionComponent");
      const vel = entity.components.get("VelocityComponent");
      const box = entity.components.get("CollisionComponent");

      if (!pos || !box) return;

      if (vel) {
        // For entities with velocity, resolve their movement
        const movement = { x: vel.x, y: vel.y, z: vel.z };
        const resolvedMovement = this.resolveCollision(
          entity,
          movement,
          entities
        );
        pos.x += resolvedMovement.x;
        pos.y += resolvedMovement.y;
        pos.z += resolvedMovement.z;
      }
    });
  }
}

export class RaycastSystem {
  constructor() {
    this.interactions = new Map();
    this.pendingRays = []; // Store rays that need processing
    this.processedRays = []; // Store processed ray results
  }

  registerInteraction(type, callback) {
    this.interactions.set(type, callback);
  }

  addRay(start, direction, sourceEntity = null) {
    this.pendingRays.push({
      start: start.clone(),
      direction: direction.normalize(),
      sourceEntity,
      maxDistance: 100, // Default max distance
    });
  }

  update(entities) {
    // Process pending rays
    this.pendingRays.forEach((ray) => {
      const end = ray.start
        .clone()
        .add(ray.direction.multiplyScalar(ray.maxDistance));
      const hitInfo = this.checkRay(ray.start, end, entities, ray.sourceEntity);
      if (hitInfo) {
        this.processedRays.push(hitInfo);
      }
    });
    this.pendingRays = []; // Clear pending rays after processing
  }

  getProcessedRays() {
    const rays = this.processedRays;
    this.processedRays = []; // Clear after reading
    return rays;
  }

  checkRay(start, end, entities, sourceEntity = null) {
    const direction = end.clone().sub(start).normalize();
    const maxDistance = end.clone().sub(start).length();
    let closestHit = null;
    let closestDistance = maxDistance;

    entities.forEach((entity) => {
      if (entity === sourceEntity) return; // Skip source entity
      if (!entity.components.has("CollisionComponent")) return;

      const pos = entity.components.get("PositionComponent");
      const col = entity.components.get("CollisionComponent");

      // Create collision box
      const box = new THREE.Box3();
      box.min.set(
        pos.x - col.width / 2,
        pos.y - col.height / 2,
        pos.z - col.depth / 2
      );
      box.max.set(
        pos.x + col.width / 2,
        pos.y + col.height / 2,
        pos.z + col.depth / 2
      );

      // Check for intersection
      const ray = new THREE.Ray(start, direction);
      const intersection = ray.intersectBox(box, new THREE.Vector3());

      if (intersection) {
        const distance = intersection.distanceTo(start);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestHit = {
            entity: entity,
            point: intersection.clone(),
            distance: distance,
            start: start.clone(),
            sourceEntity,
          };
        }
      }
    });

    // Execute interaction if we have a hit
    if (closestHit && this.interactions.has(closestHit.entity.type)) {
      this.interactions.get(closestHit.entity.type)(closestHit.entity);
    }

    return closestHit;
  }
}

export class GunSystem {
  update(entities, delta) {
    entities.forEach((entity) => {
      const gun = entity.components.get("GunComponent");
      if (!gun) return;

      // Update recoil recovery
      if (gun.currentRecoil > 0) {
        gun.currentRecoil = Math.max(
          0,
          gun.currentRecoil - gun.recoilRecovery * delta
        );

        // Update recoil offset with emphasis on backward movement
        const recoilProgress = gun.currentRecoil / gun.recoilAmount;

        // Sharp initial backward movement that quickly recovers
        const recoilZ = Math.pow(recoilProgress, 0.7) * 1.2;

        // Slight upward movement
        // const recoilY = Math.sin(recoilProgress * Math.PI) * 0.2;
        const recoilY = 0;

        // Very slight sideways movement
        const recoilX = Math.sin(recoilProgress * Math.PI * 2) * 0.05;

        gun.recoilOffset = {
          x: recoilX,
          y: recoilY,
          z: recoilZ,
        };
      }
    });
  }

  canShoot(gun) {
    const now = performance.now();
    return now - gun.lastShotTime >= gun.cooldown;
  }

  shoot(entity, raycastSystem) {
    const gun = entity.components.get("GunComponent");
    if (!gun || !this.canShoot(gun)) return false;

    // Update last shot time
    gun.lastShotTime = performance.now();

    // Sharp initial recoil
    gun.currentRecoil = gun.recoilAmount;

    return true;
  }
}

export class CloudSystem {
  constructor() {
    this.cloudRotationSpeed = 0.00002;
    this.cloudTextureSpeed = 0.00004;
  }

  update(skyGroup, delta) {
    if (!skyGroup) return;

    // Find cloud layer (second child in the group)
    const cloudLayer = skyGroup.children[1];
    if (!cloudLayer) return;

    // Rotate the cloud texture
    if (cloudLayer.material.map) {
      cloudLayer.material.map.offset.x += this.cloudTextureSpeed * delta;
    }

    // Very slowly rotate the cloud layer
    cloudLayer.rotation.y += this.cloudRotationSpeed * delta;
  }
}
