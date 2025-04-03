"use client"

import { motion } from "framer-motion"
import { Package2 } from "lucide-react"

export function LogoAnimated() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center mb-8"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        duration: 0.5,
      }}
    >
      <motion.div
        className="flex items-center justify-center w-20 h-20 bg-primary text-primary-foreground rounded-2xl mb-4 shadow-lg"
        whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.05 }}
        transition={{ duration: 0.5 }}
      >
        <Package2 className="w-12 h-12" />
      </motion.div>
      <motion.h1
        className="text-3xl font-bold tracking-tight"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Logistix
      </motion.h1>
      <motion.p
        className="text-sm text-muted-foreground"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        Gestion intelligente de vos parcelles et produits
      </motion.p>
    </motion.div>
  )
}

