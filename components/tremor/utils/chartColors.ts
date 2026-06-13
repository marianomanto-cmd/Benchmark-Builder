// Tremor chartColors [v0.1.0]

export type ColorUtility = "bg" | "stroke" | "fill" | "text"

export const chartColors = {
  blue: {
    bg: "bg-blue-500",
    stroke: "stroke-blue-500",
    fill: "fill-blue-500",
    text: "text-blue-500",
  },
  emerald: {
    bg: "bg-emerald-500",
    stroke: "stroke-emerald-500",
    fill: "fill-emerald-500",
    text: "text-emerald-500",
  },
  violet: {
    bg: "bg-violet-500",
    stroke: "stroke-violet-500",
    fill: "fill-violet-500",
    text: "text-violet-500",
  },
  amber: {
    bg: "bg-amber-500",
    stroke: "stroke-amber-500",
    fill: "fill-amber-500",
    text: "text-amber-500",
  },
  gray: {
    bg: "bg-gray-500",
    stroke: "stroke-gray-500",
    fill: "fill-gray-500",
    text: "text-gray-500",
  },
  cyan: {
    bg: "bg-cyan-500",
    stroke: "stroke-cyan-500",
    fill: "fill-cyan-500",
    text: "text-cyan-500",
  },
  pink: {
    bg: "bg-pink-500",
    stroke: "stroke-pink-500",
    fill: "fill-pink-500",
    text: "text-pink-500",
  },
  lime: {
    bg: "bg-lime-500",
    stroke: "stroke-lime-500",
    fill: "fill-lime-500",
    text: "text-lime-500",
  },
  fuchsia: {
    bg: "bg-fuchsia-500",
    stroke: "stroke-fuchsia-500",
    fill: "fill-fuchsia-500",
    text: "text-fuchsia-500",
  },
  // Benchmark Builder brand palette (ink + warm greys + sangría) — theme-aware
  ink: { bg: "bg-[#181410] dark:bg-[#f4f1ea]", stroke: "stroke-[#181410] dark:stroke-[#f4f1ea]", fill: "fill-[#181410] dark:fill-[#f4f1ea]", text: "text-[#181410] dark:text-[#f4f1ea]" },
  graphite: { bg: "bg-[#3d352a] dark:bg-[#c7bdab]", stroke: "stroke-[#3d352a] dark:stroke-[#c7bdab]", fill: "fill-[#3d352a] dark:fill-[#c7bdab]", text: "text-[#3d352a] dark:text-[#c7bdab]" },
  taupe: { bg: "bg-[#847a68] dark:bg-[#a89e8b]", stroke: "stroke-[#847a68] dark:stroke-[#a89e8b]", fill: "fill-[#847a68] dark:fill-[#a89e8b]", text: "text-[#847a68] dark:text-[#a89e8b]" },
  sand: { bg: "bg-[#c7bdab] dark:bg-[#635a4b]", stroke: "stroke-[#c7bdab] dark:stroke-[#635a4b]", fill: "fill-[#c7bdab] dark:fill-[#635a4b]", text: "text-[#c7bdab] dark:text-[#635a4b]" },
  sangria: { bg: "bg-[#6b1a36] dark:bg-[#f23a5e]", stroke: "stroke-[#6b1a36] dark:stroke-[#f23a5e]", fill: "fill-[#6b1a36] dark:fill-[#f23a5e]", text: "text-[#6b1a36] dark:text-[#f23a5e]" },
} as const satisfies {
  [color: string]: {
    [key in ColorUtility]: string
  }
}

export type AvailableChartColorsKeys = keyof typeof chartColors

export const AvailableChartColors: AvailableChartColorsKeys[] = Object.keys(
  chartColors,
) as Array<AvailableChartColorsKeys>

export const constructCategoryColors = (
  categories: string[],
  colors: AvailableChartColorsKeys[],
): Map<string, AvailableChartColorsKeys> => {
  const categoryColors = new Map<string, AvailableChartColorsKeys>()
  categories.forEach((category, index) => {
    categoryColors.set(category, colors[index % colors.length])
  })
  return categoryColors
}

export const getColorClassName = (
  color: AvailableChartColorsKeys,
  type: ColorUtility,
): string => {
  const fallbackColor = {
    bg: "bg-gray-500",
    stroke: "stroke-gray-500",
    fill: "fill-gray-500",
    text: "text-gray-500",
  }
  return chartColors[color]?.[type] ?? fallbackColor[type]
}
