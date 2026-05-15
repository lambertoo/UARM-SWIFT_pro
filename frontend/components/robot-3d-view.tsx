"use client";

import { useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { robotSocket } from "@/lib/websocket";
import { ArmPosition, Waypoint } from "@/lib/types";
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

export function Robot3DView({ waypoints = [] }: { waypoints?: Waypoint[] }) {
  const [position, setPosition] = useState<ArmPosition>({ x: 0, y: 0, z: 0, rotation: 0, vacuum_on: false, connected: false });

  useEffect(() => {
    return robotSocket.onPosition(setPosition);
  }, []);

  return (
    <div className="w-full h-[500px] rounded-lg border bg-gradient-to-b from-gray-50 to-gray-100">
      <Canvas camera={{ position: [4, 3, 4], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        <ArmModel position={position} />
        <WaypointMarkers waypoints={waypoints} />
        <Grid args={[10, 10]} cellColor="#ccc" sectionColor="#999" fadeDistance={15} />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
