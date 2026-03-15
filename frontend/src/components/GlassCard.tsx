import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    hoverable?: boolean;
}

export const GlassCard = ({ children, className = "", delay = 0, hoverable = true }: GlassCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.6,
                delay,
                type: "spring",
                bounce: 0.3,
                stiffness: 100
            }}
            whileHover={hoverable ? {
                y: -2,
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.02)",
                transition: { duration: 0.2, ease: "easeOut" }
            } : undefined}
            className={`glass-panel p-6 ${className}`}
        >
            {children}
        </motion.div>
    );
};
