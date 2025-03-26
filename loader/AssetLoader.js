import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

export class AssetLoader {
  constructor() {
    this.fbxLoader = new FBXLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.modelCache = new Map();
  }

  async getModel(modelType) {
    // Return cached model if available
    if (this.modelCache.has(modelType)) {
      return this.modelCache.get(modelType).clone();
    }

    let model;
    switch (modelType) {
      case "city":
        model = await this.loadCity();
        break;
      case "rifle":
        model = await this.loadRifle();
        break;
      case "player":
        model = this.loadCube(2, 0xff0000);
        break;
      case "enemy":
        model = this.loadCube(2, 0x00ff00);
        break;
      default:
        throw new Error(`Unknown model type: ${modelType}`);
    }

    // Cache the original model
    this.modelCache.set(modelType, model);
    return model.clone();
  }

  async loadCity() {
    try {
      // Set the resource path for textures
      this.fbxLoader.setResourcePath("city/source/");
      const city = await this.fbxLoader.loadAsync("city/source/city.fbx");
      city.scale.set(0.1, 0.1, 0.1);

      // Enable shadows for all meshes
      city.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material) {
            if (Array.isArray(child.material)) {
              // If material is an array, clone each material
              child.material = child.material.map((mat) => {
                if (mat) {
                  const clonedMat = mat.clone();
                  clonedMat.side = THREE.DoubleSide;
                  return clonedMat;
                }
                return null;
              });
            } else {
              // Single material
              child.material = child.material.clone();
              child.material.side = THREE.DoubleSide;
            }
          }

          //   if (child.material) {
          //     child.material = new THREE.MeshStandardMaterial({
          //       map: child.material.map,
          //       color: child.material.color,
          //       metalness: 0.2,
          //       roughness: 0.8
          //     });
          //   }
        }
      });

      return city;
    } catch (error) {
      console.error("Error loading city:", error);
      // Fallback to a simple ground plane
      return this.loadPlane(100, 100, 0x808080);
    }
  }

  async loadRifle() {
    try {
      // Set the resource path for textures and load texture
      const texture = await this.textureLoader.loadAsync("@model/rifle.png");

      // Load the model
      console.log("before loading model");
      const rifle = await this.fbxLoader.loadAsync("@model/rifle.fbx");
      console.log("after loading model");
      rifle.scale.set(0.02, 0.02, 0.02);

      // Enable shadows for all meshes
      rifle.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material = child.material.map((mat) => {
                if (mat) {
                  const clonedMat = mat.clone();
                  clonedMat.map = texture;
                  return clonedMat;
                }
                return null;
              });
            } else {
              child.material = child.material.clone();
              child.material.map = texture;
            }
          }
          //   if (child.material) {
          //     child.material = new THREE.MeshStandardMaterial({
          //       map: child.material.map,
          //       color: child.material.color,
          //       metalness: 0.3,
          //       roughness: 0.7,
          //     });
          //   }
        }
      });

      return rifle;
    } catch (error) {
      console.error("Error loading rifle:", error);
      // Fallback to a simple cube
      return this.loadCube(1, 0x808080);
    }
  }

  loadCube(size = 1, color = 0xffffff) {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshPhongMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  }

  loadPlane(width = 1, height = 1, color = 0xffffff) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshPhongMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    return mesh;
  }
}
