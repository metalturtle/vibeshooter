import * as THREE from 'three';

class NetworkPlayer {
    constructor(id, scene) {
        this.id = id;
        this.positionBuffer = [];
        this.rotationBuffer = [];
        
        // Create visual representation
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);

        this.currentPosition = new THREE.Vector3();
        this.currentRotation = new THREE.Euler();
        this.targetPosition = new THREE.Vector3();
        this.targetRotation = new THREE.Euler();
    }

    addState(position, rotation, timestamp) {
        // Add state to buffer
        this.positionBuffer.push({ 
            position: new THREE.Vector3(position.x, position.y, position.z),
            timestamp 
        });
        this.rotationBuffer.push({ 
            rotation: new THREE.Euler(rotation.x, rotation.y, rotation.z),
            timestamp 
        });

        // Keep only last 1 second of states
        const now = Date.now();
        this.positionBuffer = this.positionBuffer.filter(state => 
            now - state.timestamp < 1000
        );
        this.rotationBuffer = this.rotationBuffer.filter(state => 
            now - state.timestamp < 1000
        );
    }

    update(renderTimestamp) {
        // Interpolation time is 200ms behind render time
        const interpolationTime = renderTimestamp - 200;

        // Find position states to interpolate between
        let beforePos = null;
        let afterPos = null;
        for (let i = 0; i < this.positionBuffer.length; i++) {
            if (this.positionBuffer[i].timestamp >= interpolationTime) {
                afterPos = this.positionBuffer[i];
                beforePos = this.positionBuffer[i - 1];
                break;
            }
        }

        // Find rotation states to interpolate between
        let beforeRot = null;
        let afterRot = null;
        for (let i = 0; i < this.rotationBuffer.length; i++) {
            if (this.rotationBuffer[i].timestamp >= interpolationTime) {
                afterRot = this.rotationBuffer[i];
                beforeRot = this.rotationBuffer[i - 1];
                break;
            }
        }

        // Interpolate position
        if (beforePos && afterPos) {
            const alpha = (interpolationTime - beforePos.timestamp) / 
                         (afterPos.timestamp - beforePos.timestamp);
            this.mesh.position.lerpVectors(beforePos.position, afterPos.position, alpha);
        } else if (afterPos) {
            this.mesh.position.copy(afterPos.position);
        }

        // Interpolate rotation
        if (beforeRot && afterRot) {
            const alpha = (interpolationTime - beforeRot.timestamp) / 
                         (afterRot.timestamp - beforeRot.timestamp);
            this.mesh.rotation.x = THREE.MathUtils.lerp(
                beforeRot.rotation.x, afterRot.rotation.x, alpha
            );
            this.mesh.rotation.y = THREE.MathUtils.lerp(
                beforeRot.rotation.y, afterRot.rotation.y, alpha
            );
            this.mesh.rotation.z = THREE.MathUtils.lerp(
                beforeRot.rotation.z, afterRot.rotation.z, alpha
            );
        } else if (afterRot) {
            this.mesh.rotation.copy(afterRot.rotation);
        }
    }

    destroy() {
        this.mesh.parent.remove(this.mesh);
    }
}

export class NetworkManager {
    constructor(scene) {
        this.scene = scene;
        this.ws = null;
        this.clientId = null;
        this.players = new Map(); // playerId -> NetworkPlayer
        this.updateRate = 50; // Send updates every 50ms
        this.lastUpdateTime = 0;
    }

    connect() {
        this.ws = new WebSocket('ws://localhost:8081');

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
            // Clean up players
            this.players.forEach(player => player.destroy());
            this.players.clear();
        };
    }

    handleMessage(data) {
        switch (data.type) {
            case 'init':
                this.clientId = data.clientId;
                // Create players for existing players
                data.players.forEach(playerData => {
                    if (playerData.id !== this.clientId) {
                        this.addPlayer(playerData);
                    }
                });
                break;

            case 'playerJoined':
                if (data.player.id !== this.clientId) {
                    this.addPlayer(data.player);
                }
                break;

            case 'playerLeft':
                this.removePlayer(data.clientId);
                break;

            case 'playerState':
                if (data.player.id !== this.clientId) {
                    this.updatePlayerState(data.player);
                }
                break;

            case 'playerShot':
                if (data.clientId !== this.clientId) {
                    // Handle remote player shooting
                    const origin = new THREE.Vector3(
                        data.origin.x, 
                        data.origin.y, 
                        data.origin.z
                    );
                    const direction = new THREE.Vector3(
                        data.direction.x,
                        data.direction.y,
                        data.direction.z
                    );
                    // Trigger shoot effect
                    this.onRemotePlayerShot?.(origin, direction);
                }
                break;
        }
    }

    addPlayer(playerData) {
        const player = new NetworkPlayer(playerData.id, this.scene);
        this.players.set(playerData.id, player);
        player.addState(playerData.position, playerData.rotation, Date.now());
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            player.destroy();
            this.players.delete(playerId);
        }
    }

    updatePlayerState(playerData) {
        const player = this.players.get(playerData.id);
        if (player) {
            player.addState(
                playerData.position,
                playerData.rotation,
                playerData.timestamp
            );
        }
    }

    sendPlayerState(position, rotation) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const now = Date.now();
        if (now - this.lastUpdateTime >= this.updateRate) {
            this.ws.send(JSON.stringify({
                type: 'updateState',
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z
                },
                rotation: {
                    x: rotation.x,
                    y: rotation.y,
                    z: rotation.z
                }
            }));
            this.lastUpdateTime = now;
        }
    }

    sendShot(origin, direction) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        this.ws.send(JSON.stringify({
            type: 'shoot',
            origin: {
                x: origin.x,
                y: origin.y,
                z: origin.z
            },
            direction: {
                x: direction.x,
                y: direction.y,
                z: direction.z
            }
        }));
    }

    update(timestamp) {
        // Update all players
        this.players.forEach(player => player.update(timestamp));
    }
}
