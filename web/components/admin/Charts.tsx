"use client";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell,
} from "recharts";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";

export function TrendChart({
  data, label, color,
}: { data: { date: string; count: number }[]; label: string; color: string }) {
  const config = { count: { label, color } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="h-[200px] w-full">
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28}
          tickFormatter={(v: string) => (typeof v === "string" ? v.slice(5) : v)}
        />
        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area dataKey="count" type="monotone" stroke="var(--color-count)" fill="var(--color-count)" fillOpacity={0.15} strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}

export function ClassBars({ data }: { data: { assetClass: string; count: number }[] }) {
  const config = { count: { label: "Editions", color: "#0b2545" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="h-[200px] w-full">
      <BarChart data={data} margin={{ left: -16, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="assetClass" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={6} />
      </BarChart>
    </ChartContainer>
  );
}

export function SplitDonut({ pro, free }: { pro: number; free: number }) {
  const config = {
    pro: { label: "Pro", color: "#1a7f37" },
    free: { label: "Free", color: "#9fb3c8" },
  } satisfies ChartConfig;
  const data = [
    { name: "pro", value: pro, fill: "var(--color-pro)" },
    { name: "free", value: free, fill: "var(--color-free)" },
  ];
  return (
    <ChartContainer config={config} className="mx-auto aspect-square h-[200px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} strokeWidth={2}>
          {data.map((d) => <Cell key={d.name} fill={d.fill} />)}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
