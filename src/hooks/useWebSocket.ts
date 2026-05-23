import type { EventBus } from "../core/EventBus.js";
import type { MotionFrameBuffer } from "../core/frameBuffer.js";
import type { FrameStreamPacket, PipelineUpdate } from "../types/motion.js";

export interface MotionSocketController {
  connect(url: string): void;
  disconnect(): void;
  consumePacket(packet: FrameStreamPacket): void;
  status(): "closed" | "connecting" | "open" | "mock";
}

export function useWebSocket(buffer: MotionFrameBuffer, bus: EventBus): MotionSocketController {
  let socket: WebSocket | null = null;
  let currentStatus: "closed" | "connecting" | "open" | "mock" = "mock";
  let malformedWarned = false;

  function emitStatus(update: PipelineUpdate): void {
    bus.emit("pipeline:update", update);
  }

  function consumePacket(packet: FrameStreamPacket): void {
    buffer.pushPacket(packet);
  }

  function connect(url: string): void {
    disconnect();
    currentStatus = "connecting";
    emitStatus({ runIndex: 0, latencyMs: 0, status: "busy" });

    try {
      socket = new WebSocket(url);
      socket.onopen = () => {
        currentStatus = "open";
        emitStatus({ runIndex: 1, latencyMs: 18, status: "ready" });
      };
      socket.onmessage = (event) => {
        let packet: FrameStreamPacket;
        try {
          packet = JSON.parse(event.data) as FrameStreamPacket;
        } catch {
          if (!malformedWarned) {
            console.warn("[useWebSocket] dropped malformed JSON frame");
            malformedWarned = true;
          }
          return;
        }
        if (packet && typeof packet === "object" && packet.type === "FRAME_STREAM") {
          consumePacket(packet);
        }
      };
      socket.onerror = () => {
        currentStatus = "mock";
        emitStatus({ runIndex: 0, latencyMs: 0, status: "queued" });
      };
      socket.onclose = () => {
        currentStatus = "closed";
      };
    } catch {
      currentStatus = "mock";
    }
  }

  function disconnect(): void {
    if (socket) {
      socket.close();
      socket = null;
    }
    currentStatus = "closed";
  }

  return {
    connect,
    disconnect,
    consumePacket,
    status: () => currentStatus,
  };
}
