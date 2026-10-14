import { CONFIG } from "../config.js";

/**
 * PeerJS WebRTC P2P Manager for multiplayer racing.
 * Uses direct data channels with <30ms latency without requiring custom backend servers.
 */
export class PeerManager {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.isHost = false;
    this.roomId = null;
    this.playerId = "racer_" + Math.random().toString(36).substr(2, 6);
    this.playerName = "Racer";
    this.remotePlayerName = "Opponent";
    this.isConnected = false;

    // Callbacks
    this.onPeerReady = null;
    this.onConnected = null;
    this.onRemoteProgress = null;
    this.onRemoteFinish = null;
    this.onRaceStart = null;
    this.onDisconnected = null;
  }

  /**
   * Initializes Peer connection with free public signaling server
   */
  init(customRoomId = null) {
    return new Promise((resolve, reject) => {
      if (typeof window.Peer === "undefined") {
        reject(new Error("PeerJS library not loaded"));
        return;
      }

      const generatedId = customRoomId || "tiger-" + Math.random().toString(36).substr(2, 6);
      this.roomId = generatedId;

      try {
        this.peer = new window.Peer(generatedId, CONFIG.PEER_CONFIG);

        this.peer.on("open", (id) => {
          this.roomId = id;
          if (this.onPeerReady) this.onPeerReady(id);
          resolve(id);
        });

        this.peer.on("connection", (conn) => {
          this.isHost = true;
          this.connection = conn;
          this._setupConnectionHandlers(conn);
        });

        this.peer.on("error", (err) => {
          console.error("PeerJS error:", err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  joinRoom(hostRoomId, playerName = "Challenger") {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        this.init().then(() => {
          this._connectToHost(hostRoomId, playerName, resolve, reject);
        }).catch(reject);
      } else {
        this._connectToHost(hostRoomId, playerName, resolve, reject);
      }
    });
  }

  _connectToHost(hostRoomId, playerName, resolve, reject) {
    this.isHost = false;
    this.playerName = playerName;
    const conn = this.peer.connect(hostRoomId, { reliable: true });

    conn.on("open", () => {
      this.connection = conn;
      this._setupConnectionHandlers(conn);
      this.send({ type: "GUEST_JOIN", name: playerName });
      resolve(conn);
    });

    conn.on("error", (err) => {
      reject(err);
    });
  }

  _setupConnectionHandlers(conn) {
    this.isConnected = true;

    conn.on("data", (data) => {
      this._handleIncomingMessage(data);
    });

    conn.on("close", () => {
      this.isConnected = false;
      if (this.onDisconnected) this.onDisconnected();
    });

    if (this.onConnected) {
      this.onConnected({ isHost: this.isHost, peerId: conn.peer });
    }
  }

  _handleIncomingMessage(msg) {
    switch (msg.type) {
      case "GUEST_JOIN":
        this.remotePlayerName = msg.name || "Challenger";
        if (this.onConnected) {
          this.onConnected({ isHost: this.isHost, name: this.remotePlayerName });
        }
        break;

      case "RACE_CONFIG":
        // Guest receives deterministic seed & settings from host
        if (this.onRaceStart) {
          this.onRaceStart(msg);
        }
        break;

      case "PROGRESS":
        if (this.onRemoteProgress) {
          this.onRemoteProgress(msg);
        }
        break;

      case "FINISH":
        if (this.onRemoteFinish) {
          this.onRemoteFinish(msg);
        }
        break;

      default:
        break;
    }
  }

  send(data) {
    if (this.connection && this.connection.open) {
      this.connection.send(data);
    }
  }

  broadcastProgress(progress, liveWpm) {
    this.send({
      type: "PROGRESS",
      name: this.playerName,
      progress,
      liveWpm
    });
  }

  broadcastFinish(finalWpm, accuracy, time) {
    this.send({
      type: "FINISH",
      name: this.playerName,
      finalWpm,
      accuracy,
      time
    });
  }

  disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.isConnected = false;
  }
}
