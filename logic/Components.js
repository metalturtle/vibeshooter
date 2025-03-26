export class PositionComponent {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

export class VelocityComponent {
  constructor(vx, vy, vz) {
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
  }
}

export class CollisionComponent {
  constructor(width, height, depth, solid = false) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.solid = solid; // Whether this object blocks movement
  }
}

export class RenderComponent {
  constructor(mesh) {
    this.mesh = mesh;
  }
}

export class GunComponent {
  constructor() {
    this.lastShotTime = 0;
    this.cooldown = 150; // 250ms between shots
    this.recoilAmount = 1.5; // Increased for more dramatic effect
    this.recoilRecovery = 5.95; // Faster recovery
    this.currentRecoil = 0;
    this.recoilOffset = { x: 0, y: 0, z: 0 };
  }
}

export class HealthComponent {
  constructor(hp) {
    this.hp = hp;
  }
}

export class ScoreComponent {
  constructor(points) {
    this.points = points;
  }
}
