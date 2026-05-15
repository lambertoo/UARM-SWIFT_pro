"use client";

import { PositionDisplay } from "@/components/position-display";
import { JogPanel } from "@/components/jog-panel";
import { CoordinateInput } from "@/components/coordinate-input";
import { VacuumControl } from "@/components/vacuum-control";
import { Robot3DView } from "@/components/robot-3d-view";

export default function ControlPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Manual Control</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Robot3DView />
        </div>
        <div className="space-y-4">
          <PositionDisplay />
          <JogPanel />
          <CoordinateInput />
          <VacuumControl />
        </div>
      </div>
    </div>
  );
}
