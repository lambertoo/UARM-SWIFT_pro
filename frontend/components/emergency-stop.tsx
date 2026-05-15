"use client";

import { useEffect } from "react";
import { robotSocket } from "@/lib/websocket";

export function EmergencyStop() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        robotSocket.emergencyStop();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <button
      className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 text-lg rounded-full shadow-lg transition-colors"
      onClick={() => robotSocket.emergencyStop()}
    >
      EMERGENCY STOP
    </button>
  );
}
