import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactNumber } from "@/lib/utils";

export type SimpleChartType = "bar" | "column" | "line" | "area" | "pie" | "doughnut";

export type SimpleChartProps = {
  type: SimpleChartType;
  data: Record<string, unknown>[];
  category: string;
  series: string[];
  colors: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showValues?: boolean;
  textColor?: string;
  fontSize?: number;
};

export function SimpleChart({
  type,
  data,
  category,
  series,
  colors,
  showLegend = series.length > 1,
  showGrid = true,
  showValues = false,
  textColor = "currentColor",
  fontSize = 11,
}: SimpleChartProps) {
  const tick = { fill: textColor, fontSize };
  const legend = showLegend ? <Legend wrapperStyle={{ fontSize, color: textColor }} /> : null;
  const tooltip = <Tooltip formatter={(value) => compactNumber(value)} />;
  const grid = showGrid ? <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} /> : null;
  const labels = (key: string) =>
    showValues ? (
      <LabelList dataKey={key} position="top" formatter={compactNumber} style={{ fontSize, fill: textColor }} />
    ) : null;

  if (type === "pie" || type === "doughnut") {
    const key = series[0];
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={key}
            nameKey={category}
            innerRadius={type === "doughnut" ? "55%" : 0}
            outerRadius="80%"
            label={showValues ? { fontSize, fill: textColor, formatter: compactNumber } : false}
            isAnimationActive={false}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          {tooltip}
          {showLegend || series.length === 1 ? (
            <Legend wrapperStyle={{ fontSize, color: textColor }} />
          ) : null}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const horizontal = type === "bar";
  const categoryAxis = horizontal ? (
    <YAxis type="category" dataKey={category} tick={tick} width={90} interval={0} />
  ) : (
    <XAxis dataKey={category} tick={tick} interval="preserveStartEnd" />
  );
  const valueAxis = horizontal ? (
    <XAxis type="number" tick={tick} tickFormatter={compactNumber} />
  ) : (
    <YAxis tick={tick} tickFormatter={compactNumber} width={48} />
  );

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          {grid}
          {categoryAxis}
          {valueAxis}
          {tooltip}
          {legend}
          {series.map((key, index) => (
            <Line key={key} dataKey={key} stroke={colors[index % colors.length]} strokeWidth={2} dot={false} isAnimationActive={false}>
              {labels(key)}
            </Line>
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          {grid}
          {categoryAxis}
          {valueAxis}
          {tooltip}
          {legend}
          {series.map((key, index) => (
            <Area
              key={key}
              dataKey={key}
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.25}
              isAnimationActive={false}
            >
              {labels(key)}
            </Area>
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"}>
        {grid}
        {categoryAxis}
        {valueAxis}
        {tooltip}
        {legend}
        {series.map((key, index) => (
          <Bar key={key} dataKey={key} fill={colors[index % colors.length]} isAnimationActive={false}>
            {labels(key)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
