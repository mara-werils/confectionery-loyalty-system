import { motion } from 'framer-motion';

const partners = [
    { name: 'Sweet Corner', emoji: '🧁', color: 'from-pink-500 to-rose-500' },
    { name: 'Bakehouse', emoji: '🥐', color: 'from-amber-500 to-orange-500' },
    { name: 'Cafe Almaty', emoji: '☕', color: 'from-brown-500 to-amber-700' },
    { name: 'Pastry Palace', emoji: '🎂', color: 'from-purple-500 to-pink-500' },
    { name: 'Choco Heaven', emoji: '🍫', color: 'from-amber-700 to-yellow-600' },
    { name: 'Sugar Rush', emoji: '🍭', color: 'from-cyan-400 to-blue-500' },
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
                    <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-600 flex items-center justify-center text-2xl group-hover:border-purple-500 group-hover:bg-purple-500/10 transition-all duration-300">
                        <span className="text-gray-600 group-hover:text-purple-400 transition-colors">+</span>
                    </div>
                    <span className="text-xs text-gray-500 group-hover:text-purple-400 transition-colors whitespace-nowrap">
                        Join Us
                    </span>
                </motion.div>
            </div>
        </div>
    );
}
