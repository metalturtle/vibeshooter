import * as THREE from "three";

export class RainSystem {
  constructor(renderer) {
    this.scene = renderer.scene;
    this.camera = renderer.camera;

    // Rain parameters - increased count and area for heavy rain
    this.rainCount = 15000;
    this.rainGeometry = new THREE.BufferGeometry();
    this.rainPositions = new Float32Array(this.rainCount * 3);
    this.rainVelocities = new Float32Array(this.rainCount);
    this.rainSizes = new Float32Array(this.rainCount);
    this.timeOffsets = new Float32Array(this.rainCount);

    // Create rain drops with varied sizes and speeds
    for (let i = 0; i < this.rainCount * 3; i += 3) {
      // Random position in a smaller area around camera for denser effect
      this.rainPositions[i] = Math.random() * 200 - 100;
      this.rainPositions[i + 1] = Math.random() * 200 + 50;
      this.rainPositions[i + 2] = Math.random() * 200 - 100;
      
      // Varied velocities for more dynamic rain
      this.rainVelocities[i / 3] = 1.2 + Math.random() * 0.8;
      
      // Varied drop sizes
      this.rainSizes[i / 3] = 0.15 + Math.random() * 0.15;
      
      // Time offset for staggered movement
      this.timeOffsets[i / 3] = Math.random() * Math.PI * 2;
    }

    this.rainGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.rainPositions, 3)
    );
    this.rainGeometry.setAttribute(
      "size",
      new THREE.BufferAttribute(this.rainSizes, 1)
    );

    // Create rain material with custom shader for stretched drops
    const rainVertexShader = `
      attribute float size;
      varying float vAlpha;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Size attenuation
        float dist = length(mvPosition.xyz);
        gl_PointSize = size * (300.0 / dist);
        
        // Fade out based on distance
        vAlpha = smoothstep(300.0, 50.0, dist);
      }
    `;

    const rainFragmentShader = `
      varying float vAlpha;
      void main() {
        // Elongated raindrop shape
        vec2 center = gl_PointCoord - vec2(0.5);
        float dropShape = 1.0 - smoothstep(0.0, 0.5, length(center) / 0.5);
        
        // Vertical stretching
        dropShape *= smoothstep(0.5, 0.0, abs(center.y));
        
        gl_FragColor = vec4(0.7, 0.72, 0.75, dropShape * vAlpha * 0.6);
      }
    `;

    this.rainMaterial = new THREE.ShaderMaterial({
      vertexShader: rainVertexShader,
      fragmentShader: rainFragmentShader,
      transparent: true,
      depthWrite: false,
      fog: true,
      blending: THREE.AdditiveBlending
    });

    // Create rain particle system
    this.rain = new THREE.Points(this.rainGeometry, this.rainMaterial);
    this.scene.add(this.rain);
    
    // Add a second layer of rain for more density
    this.rain2 = new THREE.Points(this.rainGeometry.clone(), this.rainMaterial);
    this.rain2.position.set(50, 0, 50); // Offset for variation
    this.scene.add(this.rain2);
  }

  update() {
    const positions = this.rainGeometry.attributes.position.array;
    const time = performance.now() * 0.001;

    // Update each raindrop
    for (let i = 0; i < positions.length; i += 3) {
      // Move raindrop down with slight wobble
      positions[i + 1] -= this.rainVelocities[i / 3];
      positions[i] += Math.sin(time + this.timeOffsets[i / 3]) * 0.1;
      
      // Reset raindrop to top when it falls below ground
      if (positions[i + 1] < 0) {
        positions[i] = Math.random() * 200 - 100 + this.camera.position.x;
        positions[i + 1] = 200;
        positions[i + 2] = Math.random() * 200 - 100 + this.camera.position.z;
      }
      
      // Keep rain centered around camera with smooth transition
      const distX = positions[i] - this.camera.position.x;
      const distZ = positions[i + 2] - this.camera.position.z;
      if (Math.abs(distX) > 100) {
        positions[i] = this.camera.position.x + (distX > 0 ? 100 : -100);
      }
      if (Math.abs(distZ) > 100) {
        positions[i + 2] = this.camera.position.z + (distZ > 0 ? 100 : -100);
      }
    }

    this.rainGeometry.attributes.position.needsUpdate = true;
    
    // Update second rain layer
    this.rain2.position.x = this.camera.position.x + 50;
    this.rain2.position.z = this.camera.position.z + 50;
  }

  dispose() {
    this.rainGeometry.dispose();
    this.rainMaterial.dispose();
    this.scene.remove(this.rain);
    this.scene.remove(this.rain2);
  }
}
