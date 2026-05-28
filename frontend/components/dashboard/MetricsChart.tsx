"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricsChart({
  data,
  mode = "performance",
}: {
  data: Array<Record<string, number | string>>;
  mode?: "performance" | "spend";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "spend" ? "Spend trend" : "CTR / CVR trend"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {mode === "spend" ? (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Area dataKey="spend" fill="#6366f1" fillOpacity={0.18} stroke="#6366f1" />
              </AreaChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Line dataKey="ctr" dot={false} stroke="#6366f1" strokeWidth={2} />
                <Line dataKey="cvr" dot={false} stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
