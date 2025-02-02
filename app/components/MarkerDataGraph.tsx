"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart2 } from "lucide-react";
import { EconomicNarrative } from "@/app/components/ButterflyEffect";

interface MarkerData {
  timepoint: number;
  title: string;
  date: string;
  statistics: {
    [key: string]: string | number;
  };
}

interface MarkerDataGraphProps {
  markerStates: MarkerData[];
  narrative: Record<string, EconomicNarrative> | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MarkerDataGraph = ({ markerStates, narrative }: MarkerDataGraphProps) => {
  // Ensure markerStates is not empty
  if (!markerStates || markerStates.length === 0) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" className="gap-2 text-white">
            <BarChart2 className="h-5 w-5 text-blue-500" />
            View Economic Chain
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] bg-[#0F172A] border border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Economic Butterfly Effect Chain
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              No data available. Please run the simulation first.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // Transform and validate data
  const chartData = markerStates
    .filter((state) => state && state.statistics)
    .map((state) => {
      return {
        timepoint: state.timepoint,
        "Inflation Rate": parseFloat(
          String(state.statistics["Inflation Rate"] || "0").replace("%", "")
        ),
        "Interest Rate": parseFloat(
          String(state.statistics["Interest Rate"] || "0").replace("%", "")
        ),
        "GDP Growth Rate": parseFloat(
          String(state.statistics["GDP Growth Rate"] || "0").replace("%", "")
        ),
      };
    });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="gap-2 text-white">
          <BarChart2 className="h-5 w-5 text-blue-500" />
          View Economic Chain
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[850px] bg-[#0F172A] border border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Economic Butterfly Effect Chain
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Observe how small changes in initial conditions create a chain
            reaction across economic indicators.
          </DialogDescription>
        </DialogHeader>

        <div className="h-[400px] w-full mt-6 rounded-lg bg-[#1E293B] shadow-md p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="timepoint"
                tick={{ fill: "#94A3B8" }}
                label={{
                  value: "Months",
                  position: "bottom",
                  fill: "#CBD5E1",
                  fontSize: 12,
                }}
              />
              <YAxis
                tick={{ fill: "#94A3B8" }}
                label={{
                  value: "Rate (%)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#CBD5E1",
                  fontSize: 12,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1E293B",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => `${value.toFixed(2)}%`}
                labelFormatter={(label) => `Month ${label}`}
                cursor={{ stroke: "#94A3B8", strokeDasharray: "5 5" }}
              />
              <Line
                type="monotone"
                dataKey="Inflation Rate"
                stroke="#EF4444"
                strokeWidth={3}
                dot={{ r: 4, fill: "#EF4444" }}
                animationDuration={800}
              />
              <Line
                type="monotone"
                dataKey="Interest Rate"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ r: 4, fill: "#3B82F6" }}
                animationDuration={800}
              />
              <Line
                type="monotone"
                dataKey="GDP Growth Rate"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ r: 4, fill: "#10B981" }}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 p-4 bg-[#1E293B] rounded-lg shadow-md text-sm">
          <h4 className="font-semibold text-gray-300 mb-3">
            Chain Reaction Analysis
          </h4>
          <ul className="list-disc pl-5 space-y-2 text-gray-400">
            <li>Inflation changes trigger interest rate adjustments</li>
            <li>Interest rates influence GDP growth patterns</li>
            <li>GDP growth feeds back into inflation expectations</li>
            <li>Market sentiment shifts based on economic cycles</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MarkerDataGraph;
