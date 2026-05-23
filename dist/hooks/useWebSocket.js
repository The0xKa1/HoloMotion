                                                    
                                                                
                                                                            

                                         
                             
                     
                                                 
                                                      
 

export function useWebSocket(buffer                   , bus          )                         {
  let socket                   = null;
  let currentStatus                                            = "mock";
  let malformedWarned = false;

  function emitStatus(update                )       {
    bus.emit("pipeline:update", update);
  }

  function consumePacket(packet                   )       {
    buffer.pushPacket(packet);
  }

  function connect(url        )       {
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
        let packet                   ;
        try {
          packet = JSON.parse(event.data)                     ;
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

  function disconnect()       {
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
