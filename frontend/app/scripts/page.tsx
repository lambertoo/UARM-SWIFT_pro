"use client";

import { BlockEditor } from "@/components/block-editor";
import { PositionDisplay } from "@/components/position-display";
import { VacuumControl } from "@/components/vacuum-control";
import { Robot3DView } from "@/components/robot-3d-view";

export default function ScriptsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Visual Scripting</h2>
        <p className="text-sm text-gray-500 mt-1">Block-based programming with Blockly</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <BlockEditor />
          <Robot3DView />
        </div>
        <div className="space-y-5">
          <PositionDisplay />
          <VacuumControl />
        </div>
      </div>
    </div>
  );
}
