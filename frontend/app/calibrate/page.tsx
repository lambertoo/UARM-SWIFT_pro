"use client";

import { CalibrationWizard } from "@/components/calibration-wizard";
import { JogPanel } from "@/components/jog-panel";
import { PositionDisplay } from "@/components/position-display";

export default function CalibratePage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Calibration</h2>
        <p className="text-sm text-gray-500 mt-1">3-point workspace calibration with A/B/C markers</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <CalibrationWizard />
        </div>
        <div className="space-y-5">
          <PositionDisplay />
          <JogPanel />
        </div>
      </div>
    </div>
  );
}
