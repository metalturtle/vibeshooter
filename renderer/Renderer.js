export class Renderer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.entityRenderList = new Set();  
    this.temporaryEffects = [];

    // Handle window resizing
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  render() {
    this.updateEntities();
    this.updateTemporaryEffects();
    this.renderer.render(this.scene, this.camera);
  }

  updateEntities() {
    this.entityRenderList.forEach((entity) => {
      if (!entity || !entity.components) return;  
      const renderComp = entity.components.get("RenderComponent");
      const posComp = entity.components.get("PositionComponent");
      if (renderComp && posComp) {
        renderComp.mesh.position.set(posComp.x, posComp.y, posComp.z);
      }
    });
  }

  updateTemporaryEffects() {
    const now = performance.now();
    this.temporaryEffects = this.temporaryEffects.filter((effect) => {
      if (now >= effect.endTime) {
        this.scene.remove(effect.object);
        return false;
      }
      return true;
    });
  }

  addToScene(object, isEntity = false) {
    this.scene.add(object);
    return object;
  }

  addEntity(entity) {
    if (entity && entity.components) {
      this.entityRenderList.add(entity);
    }
  }

  removeEntity(entity) {
    if (entity && entity.components) {
      const renderComp = entity.components.get("RenderComponent");
      if (renderComp && renderComp.mesh) {
        this.scene.remove(renderComp.mesh);
      }
      this.entityRenderList.delete(entity);
    }
  }

  addTemporaryEffect(object, duration) {
    this.scene.add(object);
    this.temporaryEffects.push({
      object,
      endTime: performance.now() + duration
    });
  }

  createDebugBox(position, color) {
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshBasicMaterial({ color });
    const box = new THREE.Mesh(geometry, material);
    box.position.copy(position);
    return box;
  }

  createRayEffect(start, end, color = 0xff0000) {
    const direction = end.clone().sub(start);
    const distance = direction.length();
    direction.normalize();

    // Create ray visual
    const geometry = new THREE.BoxGeometry(0.1, 0.1, distance);
    const material = new THREE.MeshBasicMaterial({ color });
    const ray = new THREE.Mesh(geometry, material);

    // Position ray
    ray.position.copy(start);
    ray.position.addScaledVector(direction, distance / 2);

    // Orient ray
    ray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

    // Add debug boxes
    const startBox = this.createDebugBox(start, 0x00ff00);
    const endBox = this.createDebugBox(end, 0x0000ff);

    // Group everything
    const group = new THREE.Group();
    group.add(ray);
    group.add(startBox);
    group.add(endBox);

    this.addTemporaryEffect(group, 100);  
    return group;
  }
}
