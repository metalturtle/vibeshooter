import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";

console.log(uuidv4);
class GameServer {
  constructor(port = 8081) {
    this.wss = new WebSocketServer({ port });
    this.clients = new Map(); // clientId -> WebSocket
    this.players = new Map(); // clientId -> player state
    this.rooms = new Map(); // roomId -> Set of clientIds

    this.setupWebSocket();
    console.log(`Game server running on port ${port}`);
  }

  setupWebSocket() {
    this.wss.on("connection", (ws) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);
      this.players.set(clientId, {
        id: clientId,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        timestamp: Date.now(),
      });

      // Send initial state
      ws.send(
        JSON.stringify({
          type: "init",
          clientId: clientId,
          players: Array.from(this.players.values()),
        })
      );

      // Broadcast new player to others
      this.broadcast(
        {
          type: "playerJoined",
          player: this.players.get(clientId),
        },
        clientId
      );

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(clientId, data);
        } catch (e) {
          console.error("Error parsing message:", e);
        }
      });

      ws.on("close", () => {
        this.broadcast({
          type: "playerLeft",
          clientId: clientId,
        });
        this.clients.delete(clientId);
        this.players.delete(clientId);
      });
    });
  }

  handleMessage(clientId, data) {
    switch (data.type) {
      case "updateState":
        // Update player state
        this.players.set(clientId, {
          ...this.players.get(clientId),
          position: data.position,
          rotation: data.rotation,
          timestamp: Date.now(),
        });

        // Broadcast update to other clients
        this.broadcast(
          {
            type: "playerState",
            player: this.players.get(clientId),
          },
          clientId
        );
        break;

      case "shoot":
        // Broadcast shoot event
        this.broadcast({
          type: "playerShot",
          clientId: clientId,
          origin: data.origin,
          direction: data.direction,
        });
        break;
    }
  }

  broadcast(message, excludeClientId = null) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((ws, clientId) => {
      if (clientId !== excludeClientId && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }
}

new GameServer();
