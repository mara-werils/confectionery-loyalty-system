import { motion } from 'framer-motion';

const partners = [
    { name: 'Sweet Corner', emoji: '🧁', color: 'from-zinc-800 to-zinc-900 border border-white/5' },
    { name: 'Bakehouse', emoji: '🥐', color: 'from-zinc-800 to-zinc-900 border border-white/5' },
    { name: 'Cafe Almaty', emoji: '☕', color: 'from-zinc-800 to-zinc-900 border border-white/5' },
    { name: 'Pastry Palace', emoji: '🎂', color: 'from-zinc-800 to-zinc-900 border border-white/5' },
    { name: 'Choco Heaven', emoji: '🍫', color: 'from-zinc-800 to-zinc-900 border border-white/5' },
    { name: 'Sugar Rush', emoji: '🍭', color: 'from-zinc-800 to-zinc-900 border border-white/5' },
];

export default function PartnerLogos() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Trusted Partners</h3>
                <span className="text-xs text-gray-500">{partners.length} active</span>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
                {partners.map((partner, index) => (
                    <motion.div
                        key={partner.name}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex-shrink-0 flex flex-col items-center gap-2 group cursor-pointer"
                    >
                        <div
                            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${partner.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}
                        >
                            {partner.emoji}
                        </div>
                        <span className="text-xs text-gray-400 group-hover:text-white transition-colors whitespace-nowrap">
                            {partner.name}
                        </span>
                    </motion.div>
                ))}

                {/* Join CTA */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: partners.length * 0.1 }}
                    className="flex-shrink-0 flex flex-col items-center gap-2 group cursor-pointer"
                >
                    <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-zinc-700 flex items-center justify-center text-2xl group-hover:border-white/30 group-hover:bg-white/5 transition-all duration-300">
                        <span className="text-zinc-600 group-hover:text-white transition-colors">+</span>
                    </div>
                    <span className="text-xs text-zinc-500 group-hover:text-white transition-colors whitespace-nowrap">
                        Join Us
                    </span>
                </motion.div>
            </div>
        </div>
    );
}
