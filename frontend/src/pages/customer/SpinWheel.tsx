import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { StarIcon, ClockIcon } from '@phosphor-icons/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

// ─── Wheel data ────────────────────────────────────────────────────────────────

const SEGMENTS = [5, 10, 15, 20, 25, 50, 100, 500];

const SEGMENT_ANGLE = 360 / SEGMENTS.length;

// Rich confectionery gradient pairs: [inner, outer]
const SEGMENT_COLORS: [string, string][] = [
  ['#e8c97a', '#c9a24e'],   // warm gold
  ['#7a3d1e', '#5a2d14'],   // dark chocolate
  ['#f2dba8', '#d4b87a'],   // cream
  ['#9b4a1a', '#7a3510'],   // burnt sienna
  ['#e8c97a', '#c9a24e'],   // warm gold
  ['#7a3d1e', '#5a2d14'],   // dark chocolate
  ['#f2dba8', '#d4b87a'],   // cream
  ['#9b4a1a', '#7a3510'],   // burnt sienna
];

const PRIZES_META = [
  { value: 5,   weight: 30, label: '5',   tier: 'common' },
  { value: 10,  weight: 25, label: '10',  tier: 'common' },
  { value: 15,  weight: 18, label: '15',  tier: 'uncommon' },
  { value: 20,  weight: 12, label: '20',  tier: 'uncommon' },
  { value: 25,  weight: 7,  label: '25',  tier: 'rare' },
  { value: 50,  weight: 5,  label: '50',  tier: 'rare' },
  { value: 100, weight: 2,  label: '100', tier: 'epic' },
  { value: 500, weight: 1,  label: '500', tier: 'legendary' },
];

const TIER_COLORS: Record<string, string> = {
  common:    'var(--sweet-text-secondary)',
  uncommon:  '#a78bfa',
  rare:      '#34d399',
  epic:      '#f59e0b',
  legendary: '#f97316',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function pickLocalPrize(): number {
  const total = PRIZES_META.reduce((s, p) => s + p.weight, 0);
  let rand = Math.random() * total;
  for (const p of PRIZES_META) { rand -= p.weight; if (rand <= 0) return p.value; }
  return 5;
}

function formatTimeLeft(nextSpinAt?: string): string {
  if (!nextSpinAt) return '';
  const diff = new Date(nextSpinAt).getTime() - Date.now();
  if (diff <= 0) return '';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function cooldownProgress(nextSpinAt?: string): number {
  if (!nextSpinAt) return 1;
  const resetMs = 24 * 3600 * 1000;
  const diff = new Date(nextSpinAt).getTime() - Date.now();
  if (diff <= 0) return 1;
  return Math.max(0, 1 - diff / resetMs);
}

// ─── SVG Wheel ─────────────────────────────────────────────────────────────────

function WheelSVG({ rotation, spinning }: { rotation: number; spinning: boolean }) {
  return (
    <div
      className="w-full h-full"
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: spinning
          ? 'transform 4.8s cubic-bezier(0.08, 0.82, 0.17, 1.0)'
          : 'none',
        willChange: 'transform',
      }}
    >
      <svg viewBox="0 0 200 200" className="w-full h-full" style={{ display: 'block' }}>
        <defs>
          {SEGMENTS.map((_, i) => (
            <linearGradient
              key={`seg-grad-${i}`}
              id={`seg-grad-${i}`}
              gradientUnits="userSpaceOnUse"
              x1="100" y1="100"
              x2={100 + 90 * Math.cos(((i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90) * Math.PI) / 180)}
              y2={100 + 90 * Math.sin(((i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90) * Math.PI) / 180)}
            >
              <stop offset="0%" stopColor={SEGMENT_COLORS[i][0]} stopOpacity="1" />
              <stop offset="100%" stopColor={SEGMENT_COLORS[i][1]} stopOpacity="1" />
            </linearGradient>
          ))}
          {/* Center gradient */}
          <radialGradient id="center-grad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#2e2218" />
            <stop offset="100%" stopColor="#0d0b0a" />
          </radialGradient>
          {/* Outer ring gradient */}
          <radialGradient id="ring-grad" cx="50%" cy="50%" r="50%">
            <stop offset="85%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(245,158,11,0.15)" />
          </radialGradient>
          {/* Shine overlay */}
          <radialGradient id="shine-grad" cx="35%" cy="25%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        {/* Outer decorative ring */}
        <circle cx="100" cy="100" r="99" fill="none" stroke="rgba(245,158,11,0.25)" strokeWidth="2" />
        <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(245,158,11,0.08)" strokeWidth="1" />

        {/* Segments */}
        {SEGMENTS.map((value, i) => {
          const startAngle = i * SEGMENT_ANGLE;
          const endAngle = startAngle + SEGMENT_ANGLE;
          const startRad = ((startAngle - 90) * Math.PI) / 180;
          const endRad = ((endAngle - 90) * Math.PI) / 180;
          const x1 = 100 + 94 * Math.cos(startRad);
          const y1 = 100 + 94 * Math.sin(startRad);
          const x2 = 100 + 94 * Math.cos(endRad);
          const y2 = 100 + 94 * Math.sin(endRad);
          const midRad = (((startAngle + endAngle) / 2 - 90) * Math.PI) / 180;
          const tx = 100 + 68 * Math.cos(midRad);
          const ty = 100 + 68 * Math.sin(midRad);
          const textRotation = (startAngle + endAngle) / 2;
          const isLegendary = value >= 100;

          return (
            <g key={i}>
              <path
                d={`M100,100 L${x1},${y1} A94,94 0 0,1 ${x2},${y2} Z`}
                fill={`url(#seg-grad-${i})`}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="0.8"
              />
              {/* Segment highlight strip near edge */}
              <path
                d={`M100,100 L${x1},${y1} A94,94 0 0,1 ${x2},${y2} Z`}
                fill="rgba(255,255,255,0.06)"
                stroke="none"
              />
              <text
                x={tx}
                y={ty}
                fill={isLegendary ? '#fff8e1' : 'rgba(0,0,0,0.75)'}
                fontSize={value >= 500 ? '13' : value >= 100 ? '11' : '10'}
                fontWeight="900"
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '-0.5px' }}
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Shine overlay on top of all segments */}
        <circle cx="100" cy="100" r="94" fill="url(#shine-grad)" />

        {/* Spoke dividers (subtle) */}
        {SEGMENTS.map((_, i) => {
          const angle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
          return (
            <line
              key={`spoke-${i}`}
              x1={100 + 22 * Math.cos(angle)}
              y1={100 + 22 * Math.sin(angle)}
              x2={100 + 94 * Math.cos(angle)}
              y2={100 + 94 * Math.sin(angle)}
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Center hub shadow */}
        <circle cx="100" cy="102" r="21" fill="rgba(0,0,0,0.3)" />
        {/* Center hub */}
        <circle cx="100" cy="100" r="21" fill="url(#center-grad)" stroke="#c9a24e" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="17" fill="none" stroke="rgba(201,162,78,0.3)" strokeWidth="0.5" />

        {/* Center icon — stylized "S" token */}
        <text
          x="100"
          y="98"
          fill="#f59e0b"
          fontSize="10"
          fontWeight="900"
          textAnchor="middle"
          dominantBaseline="auto"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          S
        </text>
        <text
          x="100"
          y="107"
          fill="#c9a24e"
          fontSize="5"
          fontWeight="700"
          textAnchor="middle"
          dominantBaseline="auto"
          style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.5px' }}
        >
          SWEET
        </text>
      </svg>
    </div>
  );
}

// ─── Sparkle particles (CSS only) ──────────────────────────────────────────────

function SparkleOverlay() {
  return (
    <div className="spin-sparkles" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="spin-sparkle" style={{ '--i': i } as React.CSSProperties} />
      ))}
    </div>
  );
}

// ─── Circular cooldown ring ─────────────────────────────────────────────────────

function CooldownRing({ progress }: { progress: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  return (
    <svg viewBox="0 0 56 56" className="w-14 h-14" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--sweet-border)" strokeWidth="3.5" />
      <circle
        cx="28" cy="28" r={r}
        fill="none"
        stroke="var(--sweet-accent)"
        strokeWidth="3.5"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  );
}

// ─── Prize card ────────────────────────────────────────────────────────────────

function PrizeCard({ value, tier }: { value: number; tier: string }) {
  const isHigh = value >= 50;
  return (
    <div
      className="prize-card"
      data-tier={tier}
      style={{
        background: isHigh ? 'var(--sweet-accent-dim)' : 'var(--sweet-card)',
        border: `1px solid ${isHigh ? 'rgba(245,158,11,0.3)' : 'var(--sweet-border)'}`,
        borderRadius: '12px',
        padding: '10px 4px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {tier === 'legendary' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
      )}
      <div
        style={{
          fontSize: value >= 100 ? '16px' : '14px',
          fontWeight: 900,
          color: TIER_COLORS[tier],
          lineHeight: 1,
          letterSpacing: '-0.5px',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '9px', color: 'var(--sweet-text-muted)', marginTop: '3px', fontWeight: 600 }}>
        SWEET
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function SpinWheel() {
  const { t } = useTranslation();
  const { token, sweetBalance, setSweetBalance } = useAuthStore();
  const queryClient = useQueryClient();

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [showClaim, setShowClaim] = useState(false);
  const [timeDisplay, setTimeDisplay] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: statusRaw } = useQuery({
    queryKey: ['spin-status'],
    queryFn: () => api.spin.status(),
    enabled: !!token,
    refetchInterval: 30_000,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = (statusRaw as any)?.data;

  // Live countdown ticker
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (status?.nextSpinAt) {
      const tick = () => setTimeDisplay(formatTimeLeft(status.nextSpinAt));
      tick();
      timerRef.current = setInterval(tick, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status?.nextSpinAt]);

  const localSpunToday = (() => {
    const last = localStorage.getItem('lastSpin');
    if (!last) return false;
    return new Date(last).toDateString() === new Date().toDateString();
  })();

  const canSpin = (status?.canSpin ?? !localSpunToday) && !spinning;

  const doSpin = useCallback((prize: number) => {
    const idx = SEGMENTS.indexOf(prize);
    // Align so the selected segment stops under the top pointer
    const randomOffset = (Math.random() - 0.5) * (SEGMENT_ANGLE * 0.6);
    const targetAngle =
      360 * (6 + Math.floor(Math.random() * 3)) +
      (360 - idx * SEGMENT_ANGLE - SEGMENT_ANGLE / 2 + randomOffset);

    setResult(null);
    setShowClaim(false);
    setSpinning(true);
    setRotation(prev => prev + targetAngle);

    setTimeout(() => {
      setSpinning(false);
      setResult(prize);
      setShowClaim(true);
      setSweetBalance(sweetBalance + prize);

      // Confetti burst
      confetti({
        particleCount: 180,
        spread: 80,
        origin: { y: 0.45 },
        colors: ['#f59e0b', '#fbbf24', '#f97316', '#fde68a', '#fff8e1'],
      });
      // Second burst for big prizes
      if (prize >= 50) {
        setTimeout(() => {
          confetti({ particleCount: 120, spread: 100, origin: { x: 0.2, y: 0.5 }, colors: ['#f59e0b', '#f97316'] });
          confetti({ particleCount: 120, spread: 100, origin: { x: 0.8, y: 0.5 }, colors: ['#fbbf24', '#fde68a'] });
        }, 250);
      }

      toast.success(`+${prize} SWEET!`, { duration: 3000 });
      queryClient.invalidateQueries({ queryKey: ['spin-status'] });
      localStorage.setItem('lastSpin', new Date().toISOString());
    }, 4900);
  }, [sweetBalance, setSweetBalance, queryClient]);

  const spinMutation = useMutation({
    mutationFn: () => api.spin.play(),
    onSuccess: (res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prize = (res as any).data.prize as number;
      doSpin(prize);
    },
    onError: () => {
      doSpin(pickLocalPrize());
    },
  });

  const progress = cooldownProgress(status?.nextSpinAt);

  return (
    <>
      {/* Inline keyframes + utility styles */}
      <style>{`
        @keyframes spin-pointer-tick {
          0%, 100% { transform: translateX(-50%) scaleY(1); }
          50%       { transform: translateX(-50%) scaleY(1.25); }
        }
        @keyframes spin-bounce-in {
          0%   { transform: scale(0.5) translateY(20px); opacity: 0; }
          60%  { transform: scale(1.15) translateY(-6px); opacity: 1; }
          80%  { transform: scale(0.95) translateY(2px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes spin-sparkle-pop {
          0%   { transform: translate(var(--tx,0px), var(--ty,0px)) scale(0) rotate(0deg); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translate(calc(var(--tx,0px)*3), calc(var(--ty,0px)*3)) scale(1.5) rotate(180deg); opacity: 0; }
        }
        @keyframes spin-glow-pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes spin-number-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes spin-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }

        .spin-wheel-pointer {
          animation: none;
        }
        .spin-wheel-pointer.is-spinning {
          animation: spin-pointer-tick 0.12s ease-in-out infinite;
        }

        .spin-result-number {
          animation: spin-bounce-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 30%, #fff8e1 50%, #fbbf24 70%, #f59e0b 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: spin-bounce-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     spin-number-shimmer 2s linear 0.7s infinite;
        }

        .spin-sparkles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 30;
        }
        .spin-sparkle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #f59e0b;
          --angle: calc(var(--i) * 30deg);
          --dist: 110px;
          --tx: calc(cos(var(--angle)) * var(--dist));
          --ty: calc(sin(var(--angle)) * var(--dist));
          animation: spin-sparkle-pop 0.8s ease-out calc(var(--i) * 0.05s) both;
        }
        .spin-sparkle:nth-child(2n) { background: #fbbf24; width: 4px; height: 4px; }
        .spin-sparkle:nth-child(3n) { background: #f97316; width: 5px; height: 5px; }

        .spin-wheel-glow {
          animation: spin-glow-pulse 2s ease-in-out infinite;
        }

        .spin-btn-idle {
          animation: spin-float 3s ease-in-out infinite;
        }

        .prize-card {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .prize-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(245,158,11,0.15);
        }
      `}</style>

      <div
        className="pb-28 flex flex-col items-center"
        style={{ color: 'var(--sweet-text)', maxWidth: '420px', margin: '0 auto', width: '100%' }}
      >
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full mb-6"
        >
          <div className="flex items-center gap-3 mb-1">
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'var(--sweet-accent-dim)',
              border: '1px solid rgba(245,158,11,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <StarIcon style={{ width: 18, height: 18, color: 'var(--sweet-accent)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                {t('spinWheel.title')}
              </h1>
              <p style={{ fontSize: 12, color: 'var(--sweet-text-muted)', marginTop: 2 }}>
                {t('spinWheel.subtitle')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Wheel area ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08, type: 'spring', stiffness: 160, damping: 18 }}
          style={{ position: 'relative', width: 288, height: 288, marginBottom: 28 }}
        >
          {/* Outer ambient glow rings */}
          <div
            style={{
              position: 'absolute', inset: -16,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245,158,11,0.10) 40%, transparent 70%)',
              pointerEvents: 'none',
            }}
            className={spinning ? 'spin-wheel-glow' : ''}
          />
          <div style={{
            position: 'absolute', inset: -4,
            borderRadius: '50%',
            boxShadow: spinning
              ? '0 0 60px 12px rgba(245,158,11,0.22), 0 0 120px 24px rgba(245,158,11,0.08)'
              : '0 0 30px 4px rgba(245,158,11,0.10)',
            transition: 'box-shadow 1.2s ease',
            pointerEvents: 'none',
          }} />

          {/* Decorative tick marks around wheel */}
          <svg
            viewBox="0 0 320 320"
            style={{ position: 'absolute', inset: -16, width: 320, height: 320, pointerEvents: 'none', zIndex: 5 }}
          >
            {Array.from({ length: 40 }).map((_, i) => {
              const angle = (i / 40) * 360 * (Math.PI / 180);
              const isMajor = i % 5 === 0;
              const r1 = isMajor ? 148 : 150;
              const r2 = 155;
              return (
                <line
                  key={i}
                  x1={160 + r1 * Math.cos(angle)} y1={160 + r1 * Math.sin(angle)}
                  x2={160 + r2 * Math.cos(angle)} y2={160 + r2 * Math.sin(angle)}
                  stroke={isMajor ? 'rgba(245,158,11,0.45)' : 'rgba(245,158,11,0.18)'}
                  strokeWidth={isMajor ? '2' : '1'}
                />
              );
            })}
          </svg>

          {/* Pointer */}
          <div
            className={`spin-wheel-pointer${spinning ? ' is-spinning' : ''}`}
            style={{
              position: 'absolute', top: -4, left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              filter: 'drop-shadow(0 2px 6px rgba(245,158,11,0.5))',
            }}
          >
            {/* Triangle pointer */}
            <svg viewBox="0 0 28 32" style={{ width: 28, height: 32 }}>
              <defs>
                <linearGradient id="ptr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <polygon points="14,2 26,26 14,20 2,26" fill="url(#ptr-grad)" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="14" cy="20" r="4" fill="#0d0b0a" stroke="#c9a24e" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Wheel ring border */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            border: '4px solid rgba(201,162,78,0.4)',
            zIndex: 10,
            pointerEvents: 'none',
            background: 'transparent',
          }} />

          {/* Wheel itself */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
            <WheelSVG rotation={rotation} spinning={spinning} />
          </div>

          {/* Sparkle overlay on win */}
          <AnimatePresence>
            {showClaim && (
              <motion.div
                key="sparkles"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: 'absolute', inset: 0 }}
              >
                <SparkleOverlay />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Result display ── */}
        <AnimatePresence mode="wait">
          {result !== null && !spinning && (
            <motion.div
              key={`result-${result}`}
              initial={{ opacity: 0, y: 24, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18 }}
              style={{ textAlign: 'center', marginBottom: 20 }}
            >
              {/* Big animated prize number */}
              <div
                className="spin-result-number"
                style={{
                  fontSize: result >= 100 ? 64 : 52,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: '-2px',
                  display: 'inline-block',
                }}
              >
                +{result}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sweet-accent)', marginTop: 4, letterSpacing: '2px' }}>
                SWEET
              </div>
              <div style={{ fontSize: 13, color: 'var(--sweet-text-muted)', marginTop: 6 }}>
                {t('spinWheel.won')}
              </div>
            </motion.div>
          )}

          {!result && !spinning && (
            <div style={{ height: 24, marginBottom: 20 }} />
          )}
        </AnimatePresence>

        {/* ── Spin button ── */}
        <div style={{ width: '100%', maxWidth: 320 }}>
          <motion.button
            whileTap={canSpin ? { scale: 0.96 } : undefined}
            whileHover={canSpin ? { scale: 1.02 } : undefined}
            onClick={() => canSpin && spinMutation.mutate()}
            disabled={!canSpin}
            className={canSpin && !spinning ? 'spin-btn-idle' : ''}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: 18,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '0.5px',
              border: 'none',
              cursor: canSpin ? 'pointer' : 'not-allowed',
              position: 'relative',
              overflow: 'hidden',
              transition: 'background 0.2s, box-shadow 0.2s',
              ...(canSpin
                ? {
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#0d0b0a',
                    boxShadow: '0 8px 32px rgba(245,158,11,0.35), 0 2px 8px rgba(245,158,11,0.2)',
                  }
                : {
                    background: 'var(--sweet-border)',
                    color: 'var(--sweet-text-muted)',
                    boxShadow: 'none',
                  }),
            }}
          >
            {/* Shine sweep on button */}
            {canSpin && (
              <span style={{
                position: 'absolute', top: 0, left: '-60%', width: '40%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                transform: 'skewX(-15deg)',
                animation: 'spin-number-shimmer 2.5s linear infinite',
                pointerEvents: 'none',
              }} />
            )}

            {spinning ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <svg style={{ width: 20, height: 20, animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.2)" strokeWidth="3" />
                  <path d="M12 2 A10 10 0 0 1 22 12" stroke="#0d0b0a" strokeWidth="3" strokeLinecap="round" />
                </svg>
                {t('spinWheel.spinning')}
              </span>
            ) : canSpin ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <StarIcon style={{ width: 20, height: 20 }} />
                {t('spinWheel.spin')}
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ClockIcon style={{ width: 20, height: 20 }} />
                {timeDisplay
                  ? `${t('spinWheel.nextIn')} ${timeDisplay}`
                  : t('spinWheel.comeBack')}
              </span>
            )}
          </motion.button>
        </div>

        {/* ── Cooldown status bar ── */}
        <AnimatePresence>
          {!canSpin && !spinning && status?.nextSpinAt && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                marginTop: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 18px',
                borderRadius: 16,
                background: 'var(--sweet-card)',
                border: '1px solid var(--sweet-border)',
                width: '100%',
                maxWidth: 320,
              }}
            >
              <CooldownRing progress={progress} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sweet-text-secondary)' }}>
                  {t('spinWheel.nextIn')}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--sweet-accent)', letterSpacing: '-1px', lineHeight: 1.1 }}>
                  {timeDisplay || '--:--'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--sweet-text-muted)', marginTop: 2 }}>
                  {t('spinWheel.alreadySpun')}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Prize pool ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          style={{ width: '100%', maxWidth: 320, marginTop: 24 }}
        >
          <div style={{
            borderRadius: 20,
            background: 'var(--sweet-card)',
            border: '1px solid var(--sweet-border)',
            padding: '16px',
          }}>
            {/* Header row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--sweet-text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {t('spinWheel.prizes')}
              </p>
              <div style={{
                fontSize: 10, fontWeight: 600,
                color: 'var(--sweet-text-muted)',
                background: 'var(--sweet-accent-dim)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 8, padding: '2px 8px',
              }}>
                8 prizes
              </div>
            </div>

            {/* Prize cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {PRIZES_META.map(p => (
                <PrizeCard key={p.value} value={p.value} tier={p.tier} />
              ))}
            </div>

            {/* Tier legend */}
            <div style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--sweet-border)',
              display: 'flex', flexWrap: 'wrap', gap: 8,
            }}>
              {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as const).map(tier => (
                <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: TIER_COLORS[tier],
                  }} />
                  <span style={{ fontSize: 10, color: 'var(--sweet-text-muted)', textTransform: 'capitalize' }}>
                    {tier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
