// THREE is loaded globally from CDN
const THREE = window.THREE;

export class MovementSystem {
  update(entities, delta) {
    entities.forEach((entity) => {
      const pos = entity.components.get("PositionComponent");
      const vel = entity.components.get("VelocityComponent");
      if (pos && vel) {
        pos.x += vel.vx * delta;
        pos.y += vel.vy * delta;
        pos.z += vel.vz * delta;
      }
    });
  }
}

export class CollisionSystem {
  constructor() {
    this.interactions = new Map();
  }

  registerInteraction(typeA, typeB, fn) {
    this.interactions.set(`${typeA}-${typeB}`, fn);
  }

  update(entities) {
    for (let i = 0; i < entities.length; i++) {
      const entity1 = entities[i];
      const pos1 = entity1.components.get("PositionComponent");
      const col1 = entity1.components.get("CollisionComponent");

      if (!pos1 || !col1) continue;

      for (let j = i + 1; j < entities.length; j++) {
        const entity2 = entities[j];
        const pos2 = entity2.components.get("PositionComponent");
        const col2 = entity2.components.get("CollisionComponent");

        if (!pos2 || !col2) continue;

        if (this.checkAABB(pos1, col1, pos2, col2)) {
          // Handle collision
          if (entity1.type === "Player" || entity2.type === "Player") {
            // Push entities apart
            const push = 0.1;
            const dx = pos2.x - pos1.x;
            const dz = pos2.z - pos1.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > 0) {
              const pushX = (dx / dist) * push;
              const pushZ = (dz / dist) * push;
              if (entity1.type === "Player") {
                pos1.x -= pushX;
                pos1.z -= pushZ;
              } else {
                pos2.x += pushX;
                pos2.z += pushZ;
              }
            }
          }
        }
      }
    }
  }

  checkAABB(pos1, col1, pos2, col2) {
    return (
      Math.abs(pos1.x - pos2.x) < (col1.width + col2.width) / 2 &&
      Math.abs(pos1.y - pos2.y) < (col1.height + col2.height) / 2 &&
      Math.abs(pos1.z - pos2.z) < (col1.depth + col2.depth) / 2
    );
  }
}

export class RaycastSystem {
  constructor() {
    this.rays = [];
    this.interactions = new Map();
  }

  addRay(ray, sourceEntity) {
    this.rays.push({ ray, source: sourceEntity });
  }

  registerInteraction(targetType, callback) {
    this.interactions.set(targetType, callback);
  }

  update(entities) {
    const rays = this.rays;
    this.rays = [];

    rays.forEach(({ ray, source }) => {
      entities.forEach((target) => {
        if (target === source || !target.components.has("CollisionComponent")) return;

        const pos = target.components.get("PositionComponent");
        const col = target.components.get("CollisionComponent");

        // Create a box for intersection test
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
        if (ray.ray && ray.ray.intersectBox) {
          const intersection = new THREE.Vector3();
          const result = ray.ray.intersectBox(box, intersection);
          if (result) {
            const callback = this.interactions.get(target.type);
            if (callback) {
              callback(target);
            }
          }
        } else if (ray.intersectBox) {
          const intersection = new THREE.Vector3();
          const result = ray.intersectBox(box, intersection);
          if (result) {
            const callback = this.interactions.get(target.type);
            if (callback) {
              callback(target);
            }
          }
        } else {
          console.error(
            "Neither ray.ray.intersectBox nor ray.intersectBox exists!"
          );
        }
      });
    });
  }

  checkRay(start, end, entities) {
    const direction = end.clone().sub(start).normalize();
    const ray = new THREE.Raycaster(start, direction);
    entities.forEach((entity) => {
      const pos = entity.components.get("PositionComponent");
      const col = entity.components.get("CollisionComponent");
      if (pos && col) {
        // Create a box for intersection test
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
        if (ray.ray.intersectsBox(box)) {
          const callback = this.interactions.get(entity.type);
          if (callback) {
            callback(entity);
          }
        }
      }
    });
  }
}
