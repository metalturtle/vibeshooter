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
    constructor(width, height, depth) {
        this.width = width;
        this.height = height;
        this.depth = depth;
    }
}

export class RenderComponent {
    constructor(mesh) {
        this.mesh = mesh;
    }
}

export class GunComponent {
    constructor() {
        this.cooldown = 0;
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
