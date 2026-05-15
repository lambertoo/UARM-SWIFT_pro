"use client";

import { BlockEditor } from "@/components/block-editor";
import { PositionDisplay } from "@/components/position-display";
import { VacuumControl } from "@/components/vacuum-control";
import { Robot3DView } from "@/components/robot-3d-view";

export default function ScriptsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Visual Scripting</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <BlockEditor />
          <Robot3DView />
        </div>
        <div className="space-y-4">
          <PositionDisplay />
          <VacuumControl />
        </div>
      </div>
    </div>
  );
}
