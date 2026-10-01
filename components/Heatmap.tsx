import { useState } from "react";
import { Text, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";

import type { HeatmapDay } from "@/lib/stats";
import { useTheme } from "@/lib/theme";

const ROW_LABELS = ["", "Lun", "", "Mié", "", "Vie", ""];
const LABEL_WIDTH_RATIO = 0.08; // % of container for day labels
const MIN_LABEL_WIDTH = 24;
const MAX_LABEL_WIDTH = 36;

interface HeatmapProps {
  data: HeatmapDay[];
}

export default function Heatmap({ data }: HeatmapProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const colors = useTheme();
  const levelColors = [colors.track, "#9be9a8", "#40c463", "#30a14e"];

  if (data.length === 0) return null;

  // Organize into weeks (columns) of 7 days (rows, Mon=0 .. Sun=6)
  const weeks: (HeatmapDay | null)[][] = [];
  let currentWeek: (HeatmapDay | null)[] = [];

  const firstDate = new Date(data[0].date);
  const firstDayOfWeek = firstDate.getDay();
  const isoDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  for (let i = 0; i < isoDay; i++) {
    currentWeek.push(null);
  }

  for (const day of data) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Month labels
  const monthLabels: { label: string; weekIndex: number }[] = [];
  const monthNames = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  let lastMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    const firstDay = weeks[w].find((d) => d !== null);
    if (firstDay) {
      const month = new Date(firstDay.date).getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ label: monthNames[month], weekIndex: w });
        lastMonth = month;
      }
    }
  }

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  // Compute sizes relative to container
  const padding = 16;
  const innerWidth = containerWidth - padding * 2;
  const labelWidth = Math.min(
    MAX_LABEL_WIDTH,
    Math.max(MIN_LABEL_WIDTH, innerWidth * LABEL_WIDTH_RATIO),
  );
  const gridWidth = innerWidth - labelWidth;
  const numWeeks = weeks.length;
  // cell + gap: gridWidth = numWeeks * cellSize + (numWeeks - 1) * gap
  // Keep gap as ~30% of cellSize for breathing room
  const cellSize = gridWidth / (numWeeks * 1.3 - 0.3);
  const cellGap = cellSize * 0.3;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding,
        maxWidth: 500,
        alignSelf: "flex-start",
        width: "100%",
      }}
      onLayout={handleLayout}
    >
      {containerWidth > 0 && (
        <View>
          {/* Month labels */}
          <View
            style={{
              flexDirection: "row",
              marginLeft: labelWidth,
              marginBottom: cellGap,
              height: 14,
            }}
          >
            {monthLabels.map((m) => (
              <Text
                key={`${m.label}-${m.weekIndex}`}
                style={{
                  position: "absolute",
                  left: m.weekIndex * (cellSize + cellGap),
                  fontSize: 10,
                  color: colors.textSecondary,
                }}
              >
                {m.label}
              </Text>
            ))}
          </View>

          {/* Grid */}
          <View style={{ flexDirection: "row" }}>
            {/* Day labels */}
            <View style={{ width: labelWidth, justifyContent: "space-between" }}>
              {ROW_LABELS.map((label, i) => (
                <View
                  key={i}
                  style={{ height: cellSize, justifyContent: "center" }}
                >
                  <Text style={{ fontSize: Math.min(cellSize * 0.7, 10), color: colors.textSecondary }}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Weeks */}
            <View style={{ flexDirection: "row", gap: cellGap }}>
              {weeks.map((week, wi) => (
                <View key={wi} style={{ gap: cellGap }}>
                  {Array.from({ length: 7 }).map((_, di) => {
                    const day = week[di] ?? null;
                    return (
                      <View
                        key={di}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          borderRadius: Math.max(cellSize * 0.15, 2),
                          backgroundColor: day
                            ? levelColors[day.level]
                            : "transparent",
                        }}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {/* Legend */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
              marginTop: cellGap * 2,
              gap: cellGap,
            }}
          >
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>Menos</Text>
            {levelColors.map((color, i) => (
              <View
                key={i}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRadius: Math.max(cellSize * 0.15, 2),
                  backgroundColor: color,
                }}
              />
            ))}
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>Más</Text>
          </View>
        </View>
      )}
    </View>
  );
}
