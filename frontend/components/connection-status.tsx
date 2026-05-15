"use client";

import { useEffect, useState } from "react";
import { robotSocket } from "@/lib/websocket";

export function ConnectionStatus() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    robotSocket.connect();
    const unsubscribe = robotSocket.onConnection(setConnected);
    return unsubscribe;
  }, []);

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${connected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
      <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-gray-400"}`} />
      {connected ? "Connected" : "Disconnected"}
    </span>
  );
}
