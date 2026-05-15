"use client";

import { useEffect, useCallback } from "react";
import { robotSocket } from "@/lib/websocket";
import { api } from "@/lib/api";

export function EmergencyStop() {
  const handleEmergencyStop = useCallback(() => {
    robotSocket.emergencyStop();
    api.stopSequence().catch(() => {});
    api.stopScript().catch(() => {});
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleEmergencyStop();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleEmergencyStop]);

  return (
    <button
      className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold px-5 py-1.5 text-sm rounded-lg shadow-md transition-all animate-pulse-glow hover:animate-none"
      onClick={handleEmergencyStop}
      title="Escape key"
    >
      E-STOP
    </button>
  );
}
