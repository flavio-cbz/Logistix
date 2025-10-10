// import { useTheme } from 'next-themes'

// Modern chart color palette that adapts to theme
export const getChartColors = (theme?: string) => {
  const isDark = theme === "dark";

  return {
    primary: [
      `hsl(var(--chart-1))`,
      `hsl(var(--chart-2))`,
      `hsl(var(--chart-3))`,
      `hsl(var(--chart-4))`,
      `hsl(var(--chart-5))`,
      `hsl(var(--chart-6))`,
      `hsl(var(--chart-7))`,
      `hsl(var(--chart-8))`,
    ],
    gradients: [
      isDark
        ? "linear-gradient(135deg, hsl(var(--chart-1)), hsl(var(--chart-1) / 0.7))"
        : "linear-gradient(135deg, hsl(var(--chart-1)), hsl(var(--chart-1) / 0.8))",
      isDark
        ? "linear-gradient(135deg, hsl(var(--chart-2)), hsl(var(--chart-2) / 0.7))"
        : "linear-gradient(135deg, hsl(var(--chart-2)), hsl(var(--chart-2) / 0.8))",
      isDark
        ? "linear-gradient(135deg, hsl(var(--chart-3)), hsl(var(--chart-3) / 0.7))"
        : "linear-gradient(135deg, hsl(var(--chart-3)), hsl(var(--chart-3) / 0.8))",
      isDark
        ? "linear-gradient(135deg, hsl(var(--chart-4)), hsl(var(--chart-4) / 0.7))"
        : "linear-gradient(135deg, hsl(var(--chart-4)), hsl(var(--chart-4) / 0.8))",
    ],
    background: `hsl(var(--chart-background))`,
    grid: `hsl(var(--chart-grid))`,
    text: `hsl(var(--chart-text))`,
    tooltip: {
      bg: `hsl(var(--chart-tooltip-bg))`,
      text: `hsl(var(--chart-tooltip-text))`,
    },
  };
};

// Enhanced tooltip configuration for modern design
export const getModernTooltipConfig = (_theme?: string) => {
  return {
    contentStyle: {
      backgroundColor: `hsl(var(--chart-tooltip-bg))`,
      color: `hsl(var(--chart-tooltip-text))`,
      border: "none",
      borderRadius: "8px",
      boxShadow:
        "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      fontSize: "14px",
      fontWeight: "500",
      padding: "12px 16px",
    },
    labelStyle: {
      color: `hsl(var(--chart-tooltip-text))`,
      fontWeight: "600",
      marginBottom: "4px",
    },
    itemStyle: {
      color: `hsl(var(--chart-tooltip-text))`,
      fontSize: "13px",
    },
    cursor: {
      stroke: `hsl(var(--chart-grid))`,
      strokeWidth: 1,
      strokeDasharray: "4 4",
    },
  };
};

// Animation configuration for chart elements
export const getChartAnimationConfig = (reducedMotion: boolean = false) => {
  if (reducedMotion) {
    return {
      animationBegin: 0,
      animationDuration: 0,
    };
  }

  return {
    animationBegin: 0,
    animationDuration: 800,
    animationEasing: "ease-out",
  };
};

// Responsive chart dimensions
export const getResponsiveChartDimensions = (containerWidth: number) => {
  if (containerWidth < 640) {
    // Mobile
    return {
      width: containerWidth - 32,
      height: 300,
      margin: { top: 20, right: 20, bottom: 40, left: 40 },
    };
  } else if (containerWidth < 1024) {
    // Tablet
    return {
      width: containerWidth - 48,
      height: 400,
      margin: { top: 20, right: 30, bottom: 50, left: 50 },
    };
  } else {
    // Desktop
    return {
      width: Math.min(containerWidth - 64, 800),
      height: 450,
      margin: { top: 20, right: 40, bottom: 60, left: 60 },
    };
  }
};

// Modern grid configuration
export const getModernGridConfig = (_theme?: string) => {
  return {
    stroke: `hsl(var(--chart-grid))`,
    strokeWidth: 0.5,
    strokeOpacity: 0.6,
    strokeDasharray: "2 2",
  };
};

// Enhanced axis configuration
export const getModernAxisConfig = (_theme?: string) => {
  return {
    axisLine: {
      stroke: `hsl(var(--chart-grid))`,
      strokeWidth: 1,
    },
    tickLine: {
      stroke: `hsl(var(--chart-grid))`,
      strokeWidth: 1,
    },
    tick: {
      fill: `hsl(var(--chart-text))`,
      fontSize: 12,
      fontWeight: 500,
    },
    label: {
      fill: `hsl(var(--chart-text))`,
      fontSize: 14,
      fontWeight: 600,
    },
  };
};

// Staggered animation delays for multiple elements
export const getStaggeredDelay = (_index: number, baseDelay: number = 100) => {
  return _index * baseDelay;
};

// Chart color utilities
export const getColorWithOpacity = (color: string, opacity: number) => {
  return `${color}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
};

// Modern legend configuration
export const getModernLegendConfig = () => {
  return {
    wrapperStyle: {
      fontSize: "14px",
      fontWeight: "500",
      color: `hsl(var(--chart-text))`,
    },
    iconType: "circle" as const,
    iconSize: 8,
  };
};

// Enhanced data formatting utilities
export const formatChartValue = (
  value: number,
  type: "currency" | "percentage" | "number" = "number",
) => {
  switch (type) {
    case "currency":
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case "percentage":
      return new Intl.NumberFormat("fr-FR", {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(value / 100);
    default:
      return new Intl.NumberFormat("fr-FR").format(value);
  }
};

// Chart accessibility helpers
export const getChartAccessibilityProps = (
  title: string,
  _description: string,
) => {
  // Renommé pour éviter TS6133
  return {
    role: "img",
    "aria-label": title,
    "aria-describedby": "chart-description",
    tabIndex: 0,
  };
};

// Modern chart container props
export const getModernChartContainerProps = (className?: string) => {
  return {
    className: `chart-container ${className || ""}`.trim(),
    style: {
      background: `hsl(var(--chart-background))`,
    },
  };
};
