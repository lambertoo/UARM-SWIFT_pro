"use client";

import { useEffect, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Line } from "@react-three/drei";
import * as THREE from "three";
import { robotSocket } from "@/lib/websocket";
import { ArmPosition, Waypoint, GcodeToolpathPoint } from "@/lib/types";
import { useRef } from "react";

function ArmModel({ position }: { position: ArmPosition }) {
  const endEffectorRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (endEffectorRef.current) {
      endEffectorRef.current.position.set(position.x / 100, position.z / 100, position.y / 100);
    }
  });

  const linePositions = new Float32Array([0, 0.85, 0, position.x / 100, position.z / 100, position.y / 100]);

  return (
    <group>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 0.3, 32]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.7, 16]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      <mesh ref={endEffectorRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={position.vacuum_on ? "#22c55e" : "#ef4444"} />
      </mesh>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} count={2} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#888" />
      </line>
    </group>
  );
}

function WaypointMarkers({ waypoints }: { waypoints: Waypoint[] }) {
  return (
    <>
      {waypoints.map((wp, i) => (
        <mesh key={i} position={[wp.x / 100, wp.z / 100, wp.y / 100]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color={wp.vacuum_on ? "#22c55e" : "#f59e0b"} />
        </mesh>
      ))}
    </>
  );
}

function ToolpathLines({ toolpath, currentLine }: { toolpath: GcodeToolpathPoint[]; currentLine: number }) {
  const { rapidPoints, feedPoints, completedPoints, pendingPoints } = useMemo(() => {
    const rapid: [number, number, number][] = [];
    const feed: [number, number, number][] = [];
    const completed: [number, number, number][] = [];
    const pending: [number, number, number][] = [];

    let moveIndex = 0;
    for (let i = 0; i < toolpath.length; i++) {
      const p = toolpath[i];
      const point: [number, number, number] = [p.x / 100, p.z / 100, p.y / 100];

      if (p.rapid) {
        rapid.push(point);
      } else {
        feed.push(point);
      }

      if (currentLine >= 0 && moveIndex <= currentLine) {
        completed.push(point);
      } else {
        pending.push(point);
      }
      moveIndex++;
    }

    return { rapidPoints: rapid, feedPoints: feed, completedPoints: completed, pendingPoints: pending };
  }, [toolpath, currentLine]);

  if (toolpath.length < 2) return null;

  const allPoints: [number, number, number][] = toolpath.map((p) => [p.x / 100, p.z / 100, p.y / 100]);

  return (
    <group>
      {currentLine < 0 ? (
        <>
          {feedPoints.length >= 2 && (
            <Line points={feedPoints} color="#3b82f6" lineWidth={1.5} />
          )}
          {rapidPoints.length >= 2 && (
            <Line points={rapidPoints} color="#22c55e" lineWidth={1} dashed dashSize={0.05} gapSize={0.03} />
          )}
        </>
      ) : (
        <>
          {completedPoints.length >= 2 && (
            <Line points={completedPoints} color="#22c55e" lineWidth={2} />
          )}
          {pendingPoints.length >= 2 && (
            <Line points={pendingPoints} color="#94a3b8" lineWidth={1} />
          )}
        </>
      )}

      {toolpath.length > 0 && (
        <mesh position={[toolpath[0].x / 100, toolpath[0].z / 100, toolpath[0].y / 100]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
      )}
      {toolpath.length > 1 && (
        <mesh position={[toolpath[toolpath.length - 1].x / 100, toolpath[toolpath.length - 1].z / 100, toolpath[toolpath.length - 1].y / 100]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      )}
    </group>
  );
}

export function Robot3DView({
  waypoints = [],
  toolpath = [],
  currentGcodeLine = -1,
}: {
  waypoints?: Waypoint[];
  toolpath?: GcodeToolpathPoint[];
  currentGcodeLine?: number;
}) {
  const [position, setPosition] = useState<ArmPosition>({ x: 0, y: 0, z: 0, rotation: 0, vacuum_on: false, connected: false });

  useEffect(() => {
    return robotSocket.onPosition(setPosition);
  }, []);

  return (
    <div className="w-full h-[500px] rounded-xl border border-gray-200/80 shadow-sm overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100">
      <Canvas camera={{ position: [4, 3, 4], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        <ArmModel position={position} />
        <WaypointMarkers waypoints={waypoints} />
        {toolpath.length > 0 && <ToolpathLines toolpath={toolpath} currentLine={currentGcodeLine} />}
        <Grid args={[10, 10]} cellColor="#ccc" sectionColor="#999" fadeDistance={15} />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
