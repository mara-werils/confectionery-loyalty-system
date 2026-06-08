import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowSquareOutIcon } from '@phosphor-icons/react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PurchaseNotificationPayload {
  partnerName: string;
  pointsEarned: number;
  amount: number;
  items: string[];
  txHash: string;
  timestamp: string;
}

interface Props {
  payload: PurchaseNotificationPayload | null;
  onDismiss: () => void;
}

// ─── Phase timing (ms) ────────────────────────────────────────────────────────
const PHASE_AWARDED_END    = 2200;
const PHASE_CONFIRMING_END = 4400;
const PHASE_CONFIRMED_END  = 6600;
const AUTO_DISMISS_AFTER   = 7800;


// ─── SVG checkmark that draws itself ─────────────────────────────────────────

function AnimatedCheckmark({ visible }: { visible: boolean }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
      {/* Outer ring pulse */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={visible ? { scale: [0.5, 1.2, 1], opacity: [0, 0.4, 0] } : {}}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'rgba(52,211,153,0.35)',
        }}
      />
      {/* Circle fill */}
      <motion.div
        initial={{ scale: 0 }}
        animate={visible ? { scale: 1 } : { scale: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.05 }}
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #34d399, #059669)',
          boxShadow: '0 0 24px rgba(52,211,153,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <motion.path
            d="M6 15 L12 21 L24 9"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={visible ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

// ─── Blockchain chain-link spinner ────────────────────────────────────────────

function BlockchainSpinner({ visible }: { visible: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72 }}
    >
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        {/* Outer spinning ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: '#f59e0b',
            borderRightColor: 'rgba(245,158,11,0.3)',
          }}
        />
        {/* Inner counter-spin ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2.1, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: 10,
            borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: 'rgba(251,191,36,0.6)',
            borderBottomColor: 'rgba(251,191,36,0.2)',
          }}
        />
        {/* Center icon — chain links */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Counting number animation ────────────────────────────────────────────────

function CountUp({ target, duration = 1.2 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    start.current = null;
    const animate = (ts: number) => {
      if (start.current === null) start.current = ts;
      const elapsed = (ts - start.current) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        raf.current = requestAnimationFrame(animate);
      }
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return <>{display.toLocaleString()}</>;
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ active }: { active: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={active ? { scale: [0.6, 1.2, 0.6], opacity: [0.4, 1, 0.4] } : { scale: 0.6, opacity: 0.3 }}
          transition={{ duration: 0.9, repeat: active ? Infinity : 0, delay: i * 0.18 }}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#fbbf24',
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Phase = 'awarded' | 'confirming' | 'confirmed' | 'dismissing';

export default function PurchaseNotification({ payload, onDismiss }: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('awarded');
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Haptic via Telegram WebApp
  const fireHaptic = useCallback(() => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    } catch {
      // not in Telegram context
    }
  }, []);

  // Reset + start phase timeline whenever a new payload arrives
  useEffect(() => {
    if (!payload) return;

    // Clear any existing timers
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    setPhase('awarded');
    fireHaptic();

    const t1 = setTimeout(() => setPhase('confirming'), PHASE_AWARDED_END);
    const t2 = setTimeout(() => {
      setPhase('confirmed');
      // Second haptic on confirmed
      try {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      } catch { /* noop */ }
    }, PHASE_CONFIRMING_END);
    const t3 = setTimeout(() => setPhase('dismissing'), PHASE_CONFIRMED_END);
    const t4 = setTimeout(() => onDismiss(), AUTO_DISMISS_AFTER);

    timerRefs.current = [t1, t2, t3, t4];

    return () => {
      timerRefs.current.forEach(clearTimeout);
    };
  }, [payload]);

  const handleManualDismiss = () => {
    timerRefs.current.forEach(clearTimeout);
    setPhase('dismissing');
    setTimeout(onDismiss, 350);
  };

  if (!payload) return null;

  const txShort = payload.txHash
    ? payload.txHash.slice(0, 8) + '...' + payload.txHash.slice(-6)
    : '';
  const txUrl = payload.txHash
    ? `https://testnet.tonviewer.com/transaction/${payload.txHash}`
    : null;

  return (
    <AnimatePresence>
      {phase !== 'dismissing' && (
        <>
          {/* ── Backdrop blur overlay ──────────────────────────────────── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleManualDismiss}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              background: 'rgba(10, 7, 4, 0.72)',
            }}
          />

          {/* ── Notification card ──────────────────────────────────────── */}
          <motion.div
            key="notification"
            initial={{ opacity: 0, y: -40, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{
              position: 'fixed',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(92vw, 380px)',
              zIndex: 9999,
              borderRadius: 28,
              background: 'var(--sweet-card)',
              border: '1px solid rgba(245,158,11,0.30)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              padding: '28px 24px 22px',
            }}
          >
            {/* Clean card — no decorative overlays */}

            {/* Close button */}
            <button
              onClick={handleManualDismiss}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--sweet-card-hover)',
                border: '1px solid var(--sweet-border)',
                color: 'var(--sweet-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                cursor: 'pointer',
                lineHeight: 1,
                zIndex: 10,
              }}
              aria-label="Dismiss"
            >
              ×
            </button>

            {/* ── Phase content ──────────────────────────────────────────── */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0,
                position: 'relative',
                zIndex: 5,
              }}
            >
              {/* Icon area */}
              <div style={{ marginBottom: 8 }}>
                <AnimatePresence mode="wait">
                  {phase === 'confirmed' ? (
                    <motion.div key="check" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <AnimatedCheckmark visible={phase === 'confirmed'} />
                    </motion.div>
                  ) : phase === 'confirming' ? (
                    <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <BlockchainSpinner visible />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="icon"
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      {/* Diamond / token icon */}
                      <div
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(245,158,11,0.22) 0%, rgba(251,191,36,0.12) 100%)',
                          border: '2px solid rgba(245,158,11,0.40)',
                          boxShadow: '0 0 28px rgba(245,158,11,0.30)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 28,
                        }}
                      >
                        <motion.span
                          animate={{ rotate: [0, 8, -8, 4, 0], scale: [1, 1.12, 1] }}
                          transition={{ duration: 0.8, delay: 0.2, repeat: 2, repeatDelay: 0.4 }}
                        >
                          ◆
                        </motion.span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Partner name */}
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--sweet-text-muted)',
                  marginBottom: 6,
                }}
              >
                {t('purchaseNotification.from', { name: payload.partnerName })}
              </motion.p>

              {/* Amount (counting) */}
              <AnimatePresence mode="wait">
                {phase !== 'confirmed' ? (
                  <motion.div
                    key="amount"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.05 }}
                    style={{
                      fontSize: 54,
                      fontWeight: 900,
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      marginBottom: 4,
                      textShadow: 'none',
                    }}
                  >
                    +<CountUp target={payload.pointsEarned} duration={1.1} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="amount-static"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      fontSize: 44,
                      fontWeight: 900,
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                      background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      marginBottom: 4,
                    }}
                  >
                    +{payload.pointsEarned.toLocaleString()}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SWEET label */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  color: 'rgba(251,191,36,0.75)',
                  textTransform: 'uppercase',
                  marginBottom: 20,
                }}
              >
                SWEET tokens
              </motion.p>

              {/* Items (if any) */}
              <AnimatePresence>
                {phase === 'awarded' && payload.items.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      marginBottom: 16,
                      padding: '8px 16px',
                      borderRadius: 12,
                      background: 'rgba(245,158,11,0.07)',
                      border: '1px solid rgba(245,158,11,0.12)',
                      maxWidth: 260,
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ fontSize: 11, color: 'var(--sweet-text-muted)', lineHeight: 1.5 }}>
                      {payload.items.slice(0, 3).join(' · ')}
                      {payload.items.length > 3 ? ` +${payload.items.length - 3}` : ''}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status area */}
              <AnimatePresence mode="wait">
                {phase === 'awarded' && (
                  <motion.div
                    key="status-awarded"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 14px',
                        borderRadius: 20,
                        background: 'rgba(245,158,11,0.12)',
                        border: '1px solid rgba(245,158,11,0.20)',
                      }}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 0.3 }}
                        style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24' }}
                      />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#fbbf24' }}>
                        {t('purchaseNotification.tokensAwarded')}
                      </span>
                    </div>
                  </motion.div>
                )}

                {phase === 'confirming' && (
                  <motion.div
                    key="status-confirming"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
                  >
                    <p style={{ fontSize: 12, color: 'var(--sweet-text-secondary)', fontWeight: 500 }}>
                      {t('purchaseNotification.confirming')}
                    </p>
                    <ProgressDots active />
                  </motion.div>
                )}

                {phase === 'confirmed' && (
                  <motion.div
                    key="status-confirmed"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 14px',
                        borderRadius: 20,
                        background: 'rgba(52,211,153,0.12)',
                        border: '1px solid rgba(52,211,153,0.25)',
                      }}
                    >
                      <div
                        style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399' }}
                      />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#34d399' }}>
                        {t('purchaseNotification.confirmedOnTon')}
                      </span>
                    </div>

                    {txUrl && (
                      <motion.a
                        href={txUrl}
                        target="_blank"
                        rel="noreferrer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10,
                          fontFamily: 'monospace',
                          color: 'var(--sweet-text-faint)',
                          textDecoration: 'none',
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: 'var(--sweet-input)',
                          border: '1px solid var(--sweet-border)',
                        }}
                      >
                        <span>{txShort}</span>
                        <ArrowSquareOutIcon style={{ width: 10, height: 10 }} />
                      </motion.a>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom progress bar (auto-dismiss timer) */}
              <div
                style={{
                  marginTop: 22,
                  width: '100%',
                  height: 2,
                  borderRadius: 2,
                  background: 'var(--sweet-border)',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: 0 }}
                  transition={{ duration: AUTO_DISMISS_AFTER / 1000, ease: 'linear' }}
                  style={{
                    height: '100%',
                    borderRadius: 2,
                    background:
                      phase === 'confirmed'
                        ? 'linear-gradient(90deg, #34d399, #059669)'
                        : 'linear-gradient(90deg, #f59e0b, #f97316)',
                  }}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
