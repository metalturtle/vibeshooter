import * as THREE from 'three';
import {
  PositionComponent as IPositionComponent,
  VelocityComponent as IVelocityComponent,
  CollisionComponent as ICollisionComponent,
  RenderComponent as IRenderComponent,
  GunComponent as IGunComponent,
  HealthComponent as IHealthComponent,
  ScoreComponent as IScoreComponent
} from '../types';

export class PositionComponent implements IPositionComponent {
  type = "PositionComponent";
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}
}

export class VelocityComponent implements IVelocityComponent {
  type = "VelocityComponent";
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}
}

export class CollisionComponent implements ICollisionComponent {
  type = "CollisionComponent";
  constructor(
    public width: number = 1,
    public height: number = 1,
    public depth: number = 1,
    public active: boolean = true
  ) {}
}

export class RenderComponent implements IRenderComponent {
  type = "RenderComponent";
  constructor(public mesh: THREE.Mesh | THREE.Group) {}
}

export class GunComponent implements IGunComponent {
  type = "GunComponent";
  cooldown: number = 0;
  recoilOffset = {
    y: 0,
    z: 0
  };
}

export class HealthComponent implements IHealthComponent {
  type = "HealthComponent";
  constructor(
    public value: number = 100,
    public maxValue: number = 100
  ) {}
}

export class ScoreComponent implements IScoreComponent {
  type = "ScoreComponent";
  constructor(public value: number = 0) {}
}
