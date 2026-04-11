"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

export interface LineDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string;
  tension?: number;
  borderDash?: number[];
  pointRadius?: number;
}

interface LineChartProps {
  labels: string[];
  datasets: LineDataset[];
  title?: string;
  yUnit?: string;
}

export function LineChart({ labels, datasets, title, yUnit }: LineChartProps) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: "#94a3b8", font: { size: 12 } },
      },
      title: {
        display: !!title,
        text: title,
        color: "#94a3b8",
        font: { size: 13, weight: "bold" as const },
        padding: { bottom: 12 },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            `${ctx.dataset.label ?? ""}: ${ctx.parsed.y ?? ""}${yUnit ?? ""}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "#64748b",
          callback: yUnit
            ? (v: number | string) => `${v}${yUnit}`
            : undefined,
        },
        grid: { color: "rgba(148,163,184,0.1)" },
        border: { color: "transparent" },
      },
      x: {
        ticks: { color: "#64748b" },
        grid: { color: "transparent" },
        border: { color: "rgba(148,163,184,0.1)" },
      },
    },
  };

  return (
    <div className="w-full h-72">
      <Line options={options} data={{ labels, datasets }} />
    </div>
  );
}
