"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Hand, Keyboard, Database, Box } from "lucide-react";
import { VectorEmbedding } from "@/actions/admin";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import dynamic from "next/dynamic";

// Dynamically import 3D scene to avoid SSR issues
const Vector3DScene = dynamic(
  () => import("./vector-3d-scene").then((mod) => mod.Vector3DScene),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg">
        <div className="text-gray-400">Loading 3D visualization...</div>
      </div>
    )
  }
);

interface VectorEmbeddingsCardProps {
  embeddings: {
    motion: VectorEmbedding[];
    gesture: VectorEmbedding[];
    typing: VectorEmbedding[];
  } | null;
  loading?: boolean;
}

function EmbeddingVisualization({ embeddings, type }: { embeddings: VectorEmbedding[]; type: string }) {
  if (!embeddings || embeddings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No {type} embedding data available
      </div>
    );
  }

  // Convert embeddings to chart data (showing first 50 dimensions for visualization)
  const chartData = embeddings.slice(0, 5).map((embedding, embeddingIndex) => {
    return embedding.values.slice(0, 50).map((value, index) => ({
      dimension: index,
      value: value,
      embeddingId: `${type}-${embeddingIndex}`,
      timestamp: embedding.metadata.timestamp
    }));
  }).flat();

  // Scatter plot data for 2D visualization (using first 2 dimensions)
  const scatterData = embeddings.map((embedding, index) => ({
    x: embedding.values[0] || 0,
    y: embedding.values[1] || 0,
    name: `${type}-${index}`,
    timestamp: embedding.metadata.timestamp
  }));

  return (
    <div className="space-y-6">
      {/* Embedding Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{embeddings.length}</div>
          <div className="text-xs text-muted-foreground">Total Embeddings</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{embeddings[0]?.values.length || 0}</div>
          <div className="text-xs text-muted-foreground">Dimensions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">
            {embeddings.length > 0 ? new Date(embeddings[0].metadata.timestamp).toLocaleDateString() : 'N/A'}
          </div>
          <div className="text-xs text-muted-foreground">Latest</div>
        </div>
      </div>

      {/* 2D Scatter Plot */}
      <div>
        <h4 className="text-sm font-medium mb-2">2D Projection (First 2 Dimensions)</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={scatterData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="Dimension 1"
                domain={['dataMin - 0.1', 'dataMax + 0.1']}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Dimension 2"
                domain={['dataMin - 0.1', 'dataMax + 0.1']}
              />
              <Tooltip
                formatter={(value, name) => [typeof value === 'number' ? value.toFixed(4) : value, name]}
                labelFormatter={(label) => `Point: ${label}`}
              />
              <Scatter
                dataKey="y"
                fill="hsl(var(--primary))"
                fillOpacity={0.6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dimension Values Line Chart */}
      <div>
        <h4 className="text-sm font-medium mb-2">Dimension Values (First 50 Dimensions)</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dimension" />
              <YAxis domain={['dataMin - 0.1', 'dataMax + 0.1']} />
              <Tooltip
                formatter={(value, name) => [typeof value === 'number' ? value.toFixed(4) : value, name]}
                labelFormatter={(label) => `Dimension: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Embeddings List */}
      <div>
        <h4 className="text-sm font-medium mb-2">Recent Embeddings</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {embeddings.slice(0, 5).map((embedding) => (
            <div key={embedding.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {embedding.metadata.sessionId.slice(0, 8)}...
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(embedding.metadata.timestamp).toLocaleString()}
                </span>
              </div>
              <span className="text-xs font-mono">
                [{embedding.values.slice(0, 3).map(v => v.toFixed(2)).join(', ')}...]
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function VectorEmbeddingsCard({ embeddings, loading }: VectorEmbeddingsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Vector Embeddings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!embeddings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Vector Embeddings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Vector Embeddings Available</h3>
            <p className="text-muted-foreground">
              No motion, gesture, or typing pattern data has been processed for this user yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalEmbeddings = embeddings.motion.length + embeddings.gesture.length + embeddings.typing.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Vector Embeddings
          <Badge variant="secondary" className="ml-auto">
            {totalEmbeddings} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="3d" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="3d" className="flex items-center gap-2">
              <Box className="h-4 w-4" />
              3D View
            </TabsTrigger>
            <TabsTrigger value="motion" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Motion ({embeddings.motion.length})
            </TabsTrigger>
            <TabsTrigger value="gesture" className="flex items-center gap-2">
              <Hand className="h-4 w-4" />
              Gesture ({embeddings.gesture.length})
            </TabsTrigger>
            <TabsTrigger value="typing" className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Typing ({embeddings.typing.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="3d" className="mt-4">
            <Vector3DScene
              motionEmbeddings={embeddings.motion}
              gestureEmbeddings={embeddings.gesture}
              typingEmbeddings={embeddings.typing}
            />
          </TabsContent>

          <TabsContent value="motion" className="mt-4">
            <EmbeddingVisualization embeddings={embeddings.motion} type="motion" />
          </TabsContent>

          <TabsContent value="gesture" className="mt-4">
            <EmbeddingVisualization embeddings={embeddings.gesture} type="gesture" />
          </TabsContent>

          <TabsContent value="typing" className="mt-4">
            <EmbeddingVisualization embeddings={embeddings.typing} type="typing" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}