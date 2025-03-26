import * as THREE from 'three';

export interface Component {
  type: string;
}

export interface PositionComponent extends Component {
  x: number;
  y: number;
  z: number;
}

export interface VelocityComponent extends Component {
  x: number;
  y: number;
  z: number;
}

export interface CollisionComponent extends Component {
  width: number;
  height: number;
  depth: number;
  active: boolean;
}

export interface RenderComponent extends Component {
  mesh: THREE.Mesh | THREE.Group;
}

export interface GunComponent extends Component {
  cooldown: number;
  recoilOffset: {
    y: number;
    z: number;
  };
}

export interface HealthComponent extends Component {
  value: number;
  maxValue: number;
}

export interface ScoreComponent extends Component {
  value: number;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  mouseX: number;
  mouseY: number;
  rotation: THREE.Quaternion;
}
