"use client";

import { CalibrationWizard } from "@/components/calibration-wizard";
import { JogPanel } from "@/components/jog-panel";
import { PositionDisplay } from "@/components/position-display";

export default function CalibratePage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Calibration</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CalibrationWizard />
        </div>
        <div className="space-y-4">
          <PositionDisplay />
          <JogPanel />
        </div>
      </div>
    </div>
  );
}
