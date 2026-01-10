"use client";

import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame, ThreeElements } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";

interface EmbeddingPoint {
    id: string;
    type: "motion" | "gesture" | "typing";
    x: number;
    y: number;
    z: number;
    sessionId: string;
    timestamp: string;
}

interface Vector3DSceneProps {
    motionEmbeddings: Array<{ id: string; values: number[]; metadata: { sessionId: string; timestamp: string } }>;
    gestureEmbeddings: Array<{ id: string; values: number[]; metadata: { sessionId: string; timestamp: string } }>;
    typingEmbeddings: Array<{ id: string; values: number[]; metadata: { sessionId: string; timestamp: string } }>;
}

// Color mapping for different embedding types
const COLORS = {
    motion: "#3b82f6",   // Blue
    gesture: "#22c55e",  // Green
    typing: "#a855f7",   // Purple
};

// Individual point component
function Point({
    position,
    color,
    data,
    onHover
}: {
    position: [number, number, number];
    color: string;
    data: EmbeddingPoint;
    onHover: (data: EmbeddingPoint | null) => void;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame(() => {
        if (meshRef.current && hovered) {
            meshRef.current.scale.setScalar(1.5);
        } else if (meshRef.current) {
            meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        }
    });

    return (
        <mesh
            ref={meshRef}
            position={position}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
                onHover(data);
            }}
            onPointerOut={() => {
                setHovered(false);
                onHover(null);
            }}
        >
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial
                color={color}
                emissive={hovered ? color : "#000000"}
                emissiveIntensity={hovered ? 0.5 : 0}
            />
        </mesh>
    );
}

// Animated grid for reference
function AnimatedGrid() {
    return (
        <group>
            <gridHelper args={[20, 20, "#444444", "#333333"]} position={[0, -5, 0]} />
            <gridHelper args={[20, 20, "#444444", "#333333"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -10]} />
            <gridHelper args={[20, 20, "#444444", "#333333"]} rotation={[0, 0, Math.PI / 2]} position={[-10, 0, 0]} />
        </group>
    );
}

// Axis labels
function AxisLabels() {
    return (
        <group>
            <Text position={[6, 0, 0]} fontSize={0.5} color="#666">X</Text>
            <Text position={[0, 6, 0]} fontSize={0.5} color="#666">Y</Text>
            <Text position={[0, 0, 6]} fontSize={0.5} color="#666">Z</Text>
        </group>
    );
}

// Legend component
function Legend() {
    return (
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white text-sm space-y-2">
            <div className="font-semibold mb-2">Embedding Types</div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.motion }} />
                <span>Motion</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.gesture }} />
                <span>Gesture</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.typing }} />
                <span>Typing</span>
            </div>
        </div>
    );
}

// Info panel for hovered point
function InfoPanel({ data }: { data: EmbeddingPoint | null }) {
    if (!data) return null;

    return (
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
            <div className="font-semibold capitalize mb-1">{data.type} Embedding</div>
            <div className="text-xs text-gray-300 space-y-1">
                <div>Session: {data.sessionId.slice(0, 8)}...</div>
                <div>Position: ({data.x.toFixed(2)}, {data.y.toFixed(2)}, {data.z.toFixed(2)})</div>
                <div>Time: {new Date(data.timestamp).toLocaleString()}</div>
            </div>
        </div>
    );
}

// Main scene content
function SceneContent({ points, onHover }: { points: EmbeddingPoint[]; onHover: (data: EmbeddingPoint | null) => void }) {
    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />

            <AnimatedGrid />
            <AxisLabels />

            {points.map((point) => (
                <Point
                    key={point.id}
                    position={[point.x, point.y, point.z]}
                    color={COLORS[point.type]}
                    data={point}
                    onHover={onHover}
                />
            ))}

            <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                autoRotate={true}
                autoRotateSpeed={0.5}
            />
        </>
    );
}

export function Vector3DScene({
    motionEmbeddings,
    gestureEmbeddings,
    typingEmbeddings
}: Vector3DSceneProps) {
    const [hoveredPoint, setHoveredPoint] = useState<EmbeddingPoint | null>(null);

    // Convert embeddings to 3D points using first 3 dimensions
    const points = useMemo(() => {
        const allPoints: EmbeddingPoint[] = [];
        const scale = 5; // Scale factor for visualization

        // Add motion embeddings
        motionEmbeddings.forEach((emb) => {
            if (emb.values && emb.values.length >= 3) {
                allPoints.push({
                    id: emb.id,
                    type: "motion",
                    x: (emb.values[0] || 0) * scale,
                    y: (emb.values[1] || 0) * scale,
                    z: (emb.values[2] || 0) * scale,
                    sessionId: emb.metadata.sessionId,
                    timestamp: emb.metadata.timestamp,
                });
            }
        });

        // Add gesture embeddings
        gestureEmbeddings.forEach((emb) => {
            if (emb.values && emb.values.length >= 3) {
                allPoints.push({
                    id: emb.id,
                    type: "gesture",
                    x: (emb.values[0] || 0) * scale,
                    y: (emb.values[1] || 0) * scale,
                    z: (emb.values[2] || 0) * scale,
                    sessionId: emb.metadata.sessionId,
                    timestamp: emb.metadata.timestamp,
                });
            }
        });

        // Add typing embeddings
        typingEmbeddings.forEach((emb) => {
            if (emb.values && emb.values.length >= 3) {
                allPoints.push({
                    id: emb.id,
                    type: "typing",
                    x: (emb.values[0] || 0) * scale,
                    y: (emb.values[1] || 0) * scale,
                    z: (emb.values[2] || 0) * scale,
                    sessionId: emb.metadata.sessionId,
                    timestamp: emb.metadata.timestamp,
                });
            }
        });

        return allPoints;
    }, [motionEmbeddings, gestureEmbeddings, typingEmbeddings]);

    const totalCount = motionEmbeddings.length + gestureEmbeddings.length + typingEmbeddings.length;

    if (totalCount === 0) {
        return (
            <div className="h-[500px] flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg">
                <div className="text-center text-gray-400">
                    <div className="text-4xl mb-4">🔮</div>
                    <div className="text-lg font-medium">No Embeddings Available</div>
                    <div className="text-sm">Behavioral data will appear here once processed</div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-[500px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden">
            <Canvas
                camera={{ position: [10, 10, 10], fov: 50 }}
                style={{ background: "transparent" }}
            >
                <SceneContent points={points} onHover={setHoveredPoint} />
            </Canvas>

            <Legend />
            <InfoPanel data={hoveredPoint} />

            {/* Stats overlay */}
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
                <div className="font-semibold mb-2">Statistics</div>
                <div className="space-y-1 text-xs text-gray-300">
                    <div>Motion: {motionEmbeddings.length}</div>
                    <div>Gesture: {gestureEmbeddings.length}</div>
                    <div>Typing: {typingEmbeddings.length}</div>
                    <div className="font-medium text-white pt-1 border-t border-gray-600">
                        Total: {totalCount} points
                    </div>
                </div>
            </div>
        </div>
    );
}
