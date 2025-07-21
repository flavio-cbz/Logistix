import dynamic from "next/dynamic"
import type { ComponentProps } from "react"

// Dynamically import framer-motion components to reduce initial bundle size
export const Motion = dynamic(
  () => import("framer-motion").then((mod) => mod.motion.div),
  {
    ssr: false,
    loading: () => <div />,
  }
) as React.ComponentType<ComponentProps<typeof import("framer-motion").motion.div>>

export const MotionButton = dynamic(
  () => import("framer-motion").then((mod) => mod.motion.button),
  {
    ssr: false,
    loading: () => <button />,
  }
) as React.ComponentType<ComponentProps<typeof import("framer-motion").motion.button>>

export const MotionLi = dynamic(
  () => import("framer-motion").then((mod) => mod.motion.li),
  {
    ssr: false,
    loading: () => <li />,
  }
) as React.ComponentType<ComponentProps<typeof import("framer-motion").motion.li>>

export const AnimatePresence = dynamic(
  () => import("framer-motion").then((mod) => mod.AnimatePresence),
  {
    ssr: false,
  }
) as React.ComponentType<ComponentProps<typeof import("framer-motion").AnimatePresence>>

// Animation presets for common use cases
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2 }
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 }
}

export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.2 }
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2 }
}