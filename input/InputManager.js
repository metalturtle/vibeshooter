import * as THREE from 'three';

export class InputManager {
    constructor() {
        this.state = {
            keys: {},
            mouseX: 0,
            mouseY: 0,
            mouseDown: false,
            rotation: new THREE.Euler(0, 0, 0, 'YXZ')
        };

        window.addEventListener('keydown', e => this.state.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => this.state.keys[e.key.toLowerCase()] = false);
        window.addEventListener('mousemove', e => {
            if (document.pointerLockElement === document.body) {
                this.state.mouseX = e.movementX * 0.002;  // Reduced sensitivity
                this.state.mouseY = e.movementY * 0.002;
                
                // Update rotation
                this.state.rotation.y -= this.state.mouseX;
                this.state.rotation.x = Math.max(
                    -Math.PI / 2,
                    Math.min(Math.PI / 2, this.state.rotation.x - this.state.mouseY)
                );
            }
        });
        window.addEventListener('mousedown', () => {
            document.body.requestPointerLock();
            this.state.mouseDown = true;
        });
        window.addEventListener('mouseup', () => this.state.mouseDown = false);

        // Setup pointer lock
        document.body.requestPointerLock = document.body.requestPointerLock || 
                                         document.body.mozRequestPointerLock;
    }

    getState() {
        return {
            forward: this.state.keys['w'] || false,
            backward: this.state.keys['s'] || false,
            left: this.state.keys['a'] || false,
            right: this.state.keys['d'] || false,
            mouseX: this.state.mouseX,
            mouseY: this.state.mouseY,
            mouseDown: this.state.mouseDown,
            rotation: this.state.rotation.clone()
        };
    }
}
