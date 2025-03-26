import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";

export class Renderer {
  constructor() {
    // Create main scene
    this.scene = new THREE.Scene();
    this.hasLoggedFirstFrame = false;

    // Add lighting
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    this.scene.add(ambientLight);

    // Directional light for shadows and directional illumination
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    this.scene.add(directionalLight);

    // Hemisphere light for sky/ground reflection
    const hemisphereLight = new THREE.HemisphereLight(0x7a8490, 0x000000, 0.5);
    this.scene.add(hemisphereLight);

    // Create gradient sky using a custom shader
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `;

    const uniforms = {
      topColor: { value: new THREE.Color(0x515a66) }, // Darker overcast for rain
      bottomColor: { value: new THREE.Color(0x7a8490) }, // Slightly lighter at horizon
      offset: { value: 33 },
      exponent: { value: 0.6 },
    };

    const skyGeo = new THREE.SphereGeometry(2000, 64, 15);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
      side: THREE.BackSide,
      fog: false,
    });

    this.sky = new THREE.Mesh(skyGeo, skyMat);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      //   alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Rainy day tone mapping
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9; // Darker for rain

    // Add sky to scene
    this.scene.add(this.sky);

    // Dense fog for rainy day - DISABLED FOR NOW
    // const fogColor = new THREE.Color(0x7a8490);
    // this.scene.fog = new THREE.Fog(fogColor, 1, 1000);

    // Add to DOM
    this.domElement = this.renderer.domElement;
    document.body.appendChild(this.domElement);

    // Initialize Stats
    this.stats = new Stats();
    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(this.stats.dom);
    this.stats.dom.style.position = "absolute";
    this.stats.dom.style.top = "0px";
    this.stats.dom.style.left = "0px";

    // Entity tracking
    this.entityRenderList = new Set();

    // Handle window resizing
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  addToScene(object) {
    this.scene.add(object);
  }

  removeFromScene(object) {
    this.scene.remove(object);
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
        this.removeFromScene(renderComp.mesh);
      }
      this.entityRenderList.delete(entity);
    }
  }

  render() {
    this.stats.begin();

    try {
      // Only log on first frame
      if (!this.hasLoggedFirstFrame) {
        console.log("=== First Frame Debug ===");

        // Check materials in detail
        this.scene.traverse((obj) => {
          try {
            if (obj.material) {
              const materials = Array.isArray(obj.material)
                ? obj.material
                : [obj.material];
              materials.forEach((mat) => {
                if (!mat) return;
                if (!mat.fog) {
                  console.log(
                    "Object with no fog:",
                    obj.type,
                    obj.name || obj.uuid
                  );
                  console.log("Material:", {
                    type: mat.type,
                    hasUniforms: !!mat.uniforms,
                    uniformKeys: mat.uniforms ? Object.keys(mat.uniforms) : [],
                  });
                }
              });
            }
          } catch (err) {
            console.error(
              "Error processing object:",
              obj.type,
              obj.name || obj.uuid,
              err
            );
          }
        });

        this.hasLoggedFirstFrame = true;
      }

      // Update entity positions
      this.entityRenderList.forEach((entity) => {
        if (!entity || !entity.components) return;
        const renderComp = entity.components.get("RenderComponent");
        const posComp = entity.components.get("PositionComponent");
        if (renderComp && posComp) {
          renderComp.mesh.position.set(posComp.x, posComp.y, posComp.z);
        }
      });

      // Render scene
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.error("Render error:", err);
      console.error("Error stack:", err.stack);
    }

    this.stats.end();
  }

  createRayEffect(start, end) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    // Remove the line after a short delay
    setTimeout(() => {
      this.scene.remove(line);
      geometry.dispose();
      material.dispose();
    }, 100);
  }
}
