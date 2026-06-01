import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SparklesIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

const SEGMENTS = [5, 10, 15, 20, 25, 50, 100, 500];
const COLORS = [
  '#2a2018', '#1a1412', '#2a2018', '#1a1412',
  '#2a2018', '#1a1412', '#2a2018', '#1a1412',
];
const SEGMENT_ANGLE = 360 / SEGMENTS.length;

export default function SpinWheel() {
  const { t } = useTranslation();
  const { token, sweetBalance, setSweetBalance } = useAuthStore();
  const queryClient = useQueryClient();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const { data: statusRaw } = useQuery({
    queryKey: ['spin-status'],
    queryFn: () => api.spin.status(),
    enabled: !!token,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = (statusRaw as any)?.data;

  // Client-side weighted random pick
  const pickLocalPrize = (): number => {
    const PRIZES = [
      { value: 5, weight: 30 }, { value: 10, weight: 25 }, { value: 15, weight: 18 },
      { value: 20, weight: 12 }, { value: 25, weight: 7 }, { value: 50, weight: 5 },
      { value: 100, weight: 2 }, { value: 500, weight: 1 },
    ];
    const total = PRIZES.reduce((s, p) => s + p.weight, 0);
    let rand = Math.random() * total;
    for (const p of PRIZES) { rand -= p.weight; if (rand <= 0) return p.value; }
    return 5;
  };

  const doSpin = (prize: number) => {
    const idx = SEGMENTS.indexOf(prize);
    const targetAngle = 360 * (5 + Math.random() * 3) + (360 - idx * SEGMENT_ANGLE - SEGMENT_ANGLE / 2);
    setRotation(prev => prev + targetAngle);
    setSpinning(true);
    setTimeout(() => {
      setSpinning(false);
      setResult(prize);
      setSweetBalance(sweetBalance + prize);
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } });
      toast.success(`+${prize} SWEET!`, { duration: 3000 });
      queryClient.invalidateQueries({ queryKey: ['spin-status'] });
      // Save cooldown to localStorage
      localStorage.setItem('lastSpin', new Date().toISOString());
    }, 4500);
  };

  const spinMutation = useMutation({
    mutationFn: () => api.spin.play(),
    onSuccess: (res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prize = (res as any).data.prize as number;
      doSpin(prize);
    },
    onError: () => {
      // Fallback: client-side spin when backend unavailable
      const prize = pickLocalPrize();
      doSpin(prize);
    },
  });

  // Check cooldown: backend status OR localStorage fallback
  const localSpunToday = (() => {
    const last = localStorage.getItem('lastSpin');
    if (!last) return false;
    const lastDate = new Date(last);
    const today = new Date();
    return lastDate.toDateString() === today.toDateString();
  })();

  const canSpin = (status?.canSpin ?? !localSpunToday) && !spinning;

  const formatTimeLeft = () => {
    if (!status?.nextSpinAt) return '';
    const diff = new Date(status.nextSpinAt).getTime() - Date.now();
    if (diff <= 0) return '';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  return (
    <div className="pb-28 text-white flex flex-col items-center">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full mb-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center">
            <SparklesIcon className="w-4 h-4 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t('spinWheel.title') || 'Spin & Win'}</h1>
        </div>
        <p className="text-xs text-stone-500">{t('spinWheel.subtitle') || 'Spin the wheel once a day to win bonus SWEET tokens!'}</p>
      </motion.div>

      {/* Wheel Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
        className="relative w-72 h-72 mb-8"
      >
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-amber-400 drop-shadow-lg" />
        </div>

        {/* Wheel */}
        <div
          ref={wheelRef}
          className="w-full h-full rounded-full border-4 border-amber-400/30 overflow-hidden shadow-[0_0_60px_rgba(245,158,11,0.15)]"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
          }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {SEGMENTS.map((value, i) => {
              const startAngle = i * SEGMENT_ANGLE;
              const endAngle = startAngle + SEGMENT_ANGLE;
              const startRad = (startAngle - 90) * Math.PI / 180;
              const endRad = (endAngle - 90) * Math.PI / 180;
              const x1 = 100 + 100 * Math.cos(startRad);
              const y1 = 100 + 100 * Math.sin(startRad);
              const x2 = 100 + 100 * Math.cos(endRad);
              const y2 = 100 + 100 * Math.sin(endRad);
              const midRad = ((startAngle + endAngle) / 2 - 90) * Math.PI / 180;
              const tx = 100 + 65 * Math.cos(midRad);
              const ty = 100 + 65 * Math.sin(midRad);
              const textRotation = (startAngle + endAngle) / 2;

              return (
                <g key={i}>
                  <path
                    d={`M100,100 L${x1},${y1} A100,100 0 0,1 ${x2},${y2} Z`}
                    fill={COLORS[i]}
                    stroke="#1c1917"
                    strokeWidth="0.5"
                  />
                  <text
                    x={tx}
                    y={ty}
                    fill={value >= 100 ? '#fbbf24' : '#a8a29e'}
                    fontSize={value >= 100 ? '11' : '10'}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                  >
                    {value}
                  </text>
                </g>
              );
            })}
            {/* Center circle */}
            <circle cx="100" cy="100" r="18" fill="#0d0b0a" stroke="#44403c" strokeWidth="2" />
            <text x="100" y="100" fill="#f59e0b" fontSize="7" fontWeight="bold" textAnchor="middle" dominantBaseline="central">
              SWEET
            </text>
          </svg>
        </div>

        {/* Glow */}
        <div className="absolute inset-0 rounded-full pointer-events-none" style={{
          boxShadow: spinning ? '0 0 80px rgba(245,158,11,0.3)' : '0 0 40px rgba(245,158,11,0.1)',
          transition: 'box-shadow 1s',
        }} />
      </motion.div>

      {/* Result */}
      {result !== null && !spinning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <p className="text-3xl font-black text-amber-400">+{result} SWEET</p>
          <p className="text-sm text-stone-500 mt-1">{t('spinWheel.won') || 'Added to your balance!'}</p>
        </motion.div>
      )}

      {/* Spin Button */}
      <motion.button
        whileTap={canSpin ? { scale: 0.95 } : undefined}
        onClick={() => canSpin && spinMutation.mutate()}
        disabled={!canSpin}
        className={`w-full max-w-xs py-4 rounded-2xl text-lg font-bold transition-all ${
          canSpin
            ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/25'
            : 'cursor-not-allowed'
        }`}
      >
        {spinning ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            {t('spinWheel.spinning') || 'Spinning...'}
          </span>
        ) : canSpin ? (
          t('spinWheel.spin') || 'SPIN!'
        ) : (
          <span className="flex items-center justify-center gap-2">
            <ClockIcon className="w-5 h-5" />
            {formatTimeLeft() ? `${t('spinWheel.nextIn') || 'Next spin in'} ${formatTimeLeft()}` : t('spinWheel.comeBack') || 'Come back tomorrow!'}
          </span>
        )}
      </motion.button>

      {/* Info */}
      <div className="mt-6 w-full max-w-xs">
        <div className="rounded-2xl p-4" style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--sweet-text-secondary)' }}>{t('spinWheel.prizes') || 'Prize Pool'}</p>
          <div className="grid grid-cols-4 gap-2">
            {SEGMENTS.map(v => (
              <div key={v} className={`text-center py-1.5 rounded-lg text-xs font-bold ${
                v >= 100 ? 'bg-amber-400/15 text-amber-400 border border-amber-400/20' : 'text-stone-400'
              }`}>
                {v}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
