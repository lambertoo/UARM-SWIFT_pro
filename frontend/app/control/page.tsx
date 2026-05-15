"use client";

import { useState } from "react";
import { PositionDisplay } from "@/components/position-display";
import { JogPanel } from "@/components/jog-panel";
import { CoordinateInput } from "@/components/coordinate-input";
import { VacuumControl } from "@/components/vacuum-control";
import { Robot3DView } from "@/components/robot-3d-view";
import { GcodeConsole } from "@/components/gcode-console";
import { GcodeRunner } from "@/components/gcode-runner";
import { GcodeToolpathPoint } from "@/lib/types";

export default function ControlPage() {
  const [toolpath, setToolpath] = useState<GcodeToolpathPoint[]>([]);
  const [currentGcodeLine, setCurrentGcodeLine] = useState(-1);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Manual Control</h2>
        <p className="text-sm text-gray-500 mt-1">Jog, G-code, and 3D visualization</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Robot3DView toolpath={toolpath} currentGcodeLine={currentGcodeLine} />
          <GcodeRunner onToolpathChange={setToolpath} onCurrentLineChange={setCurrentGcodeLine} />
          <GcodeConsole />
        </div>
        <div className="space-y-5">
          <PositionDisplay />
          <JogPanel />
          <CoordinateInput />
          <VacuumControl />
        </div>
      </div>
    </div>
  );
}
