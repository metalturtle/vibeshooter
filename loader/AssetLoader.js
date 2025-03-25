// THREE is loaded globally from CDN
const THREE = window.THREE;

export class AssetLoader {
    constructor() {
        this.cache = new Map();
        this.fbxLoader = new THREE.FBXLoader();
    }

    loadCube(size, color) {
        const key = `cube_${size}_${color}`;
        if (this.cache.has(key)) {
            return this.cache.get(key).clone();
        }

        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshPhongMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);
        this.cache.set(key, mesh);
        return mesh.clone();
    }

    loadPlane(width, depth, color) {
        const key = `plane_${width}_${depth}_${color}`;
        if (this.cache.has(key)) {
            return this.cache.get(key).clone();
        }

        const geometry = new THREE.PlaneGeometry(width, depth);
        const material = new THREE.MeshPhongMaterial({ color, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2; // Y-up adjustment
        this.cache.set(key, mesh);
        return mesh.clone();
    }

    async loadRifle() {
        const key = 'rifle';
        if (this.cache.has(key)) {
            return this.cache.get(key).clone();
        }

        try {
            const rifle = await this.fbxLoader.loadAsync('/@model/rifle.fbx');
            // Apply texture if available
            const textureLoader = new THREE.TextureLoader();
            const texture = await textureLoader.loadAsync('/@model/rifle.png');
            rifle.traverse((child) => {
                if (child.isMesh) {
                    child.material.map = texture;
                    child.material.needsUpdate = true;
                }
            });
            
            // Scale and rotate appropriately
            rifle.scale.set(0.01, 0.01, 0.01);  // Adjust scale as needed
            rifle.rotation.y = Math.PI;  // Point forward
            
            this.cache.set(key, rifle);
            return rifle.clone();
        } catch (error) {
            console.error('Error loading rifle model:', error);
            // Return a placeholder cube if model fails to load
            return this.loadCube(0.3, 0xff0000);
        }
    }
}
