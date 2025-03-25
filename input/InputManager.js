export class InputManager {
    constructor() {
        this.state = {
            keys: {},
            mouseX: 0,
            mouseY: 0,
            mouseDown: false
        };

        window.addEventListener('keydown', e => this.state.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => this.state.keys[e.key.toLowerCase()] = false);
        window.addEventListener('mousemove', e => {
            if (document.pointerLockElement === document.body) {
                this.state.mouseX = e.movementX * 0.002;  // Reduced sensitivity
                this.state.mouseY = e.movementY * 0.002;
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
        const state = { ...this.state };
        // Reset mouse movement after reading
        this.state.mouseX = 0;
        this.state.mouseY = 0;
        return state;
    }
}
