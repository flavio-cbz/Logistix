"use client"

import { motion } from "framer-motion"
import { usePathname } from "next/navigation"

interface PageTransitionProps {
    children: React.ReactNode
}

/**
 * Wraps page content with Framer Motion transitions
 * Smooth fade + slide animation between page navigations
 */
export function PageTransition({ children }: PageTransitionProps) {
    const pathname = usePathname()

    return (
        <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
                duration: 0.2,
                ease: "easeInOut",
            }}
        >
            {children}
        </motion.div>
    )
}
