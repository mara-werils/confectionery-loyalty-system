import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  GiftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Scanner } from '@yudiel/react-qr-scanner';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

interface CouponInfo {
  code: string;
  status: string;
  rewardTitle: string;
  rewardCategory?: string;
  rewardDescription?: string;
  issuedTo?: string;
  pointsSpent: string;
  expiresAt: string;
  redeemedAt: string | null;
  createdAt: string;
  isValid: boolean;
}

export default function CouponVerify() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [coupon, setCoupon] = useState<CouponInfo | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  // Guard: prevents the continuous scanner from firing verify multiple times
  const scanLockRef = useRef(false);

  const handleVerify = async (overrideCode?: string) => {
    const trimmed = (overrideCode ?? code).trim().toUpperCase();
    if (!trimmed) return;
    setIsLoading(true);
    setCoupon(null);
    try {
      const res = await api.coupons.verify(trimmed);
      setCoupon((res as { data: CouponInfo }).data);
    } catch (err: unknown) {
      toast.error((err as Error).message || t('verify.notFound'));
    } finally {
      setIsLoading(false);
      scanLockRef.current = false; // unlock after request finishes
    }
  };

  const handleRedeem = async () => {
    if (!coupon) return;
    setIsRedeeming(true);
    try {
      await api.coupons.redeem(coupon.code);
      toast.success(t('verify.redeemSuccess'));
      setCoupon({ ...coupon, status: 'REDEEMED', isValid: false, redeemedAt: new Date().toISOString() });
    } catch (err: unknown) {
      toast.error((err as Error).message || t('verify.redeemFailed'));
    } finally {
      setIsRedeeming(false);
    }
  };

  // useCallback with stable ref-based guard — safe from stale closure issues
  const handleScan = useCallback((results: Array<{ rawValue: string }>) => {
    if (!results?.length || scanLockRef.current) return;
    const raw = results[0].rawValue;
    // QR format: "sweet-coupon:SWT-XXXXXX"
    const extracted = raw.startsWith('sweet-coupon:') ? raw.slice(13) : raw;
    const parsed = extracted.trim().toUpperCase();
    if (!parsed) return;
    scanLockRef.current = true; // lock immediately — released in handleVerify finally
    setShowScanner(false);
    setCode(parsed);
    // Defer to next tick so state updates above flush before verify kicks off
    setTimeout(() => handleVerify(parsed), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pl-1">
        <div className="flex items-center gap-3 mb-1">
          <QrCodeIcon className="w-7 h-7" style={{ color: 'var(--sweet-text-muted)' }} />
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--sweet-text)' }}>{t('verify.title')}</h1>
        </div>
        <p className="mt-1" style={{ color: 'var(--sweet-text-muted)' }}>{t('verify.subtitle')}</p>
      </motion.div>

      {/* Code input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-3"
      >
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          placeholder="SWT-XXXXXX"
          className="sweet-input flex-1 rounded-xl px-4 py-3.5 font-mono text-sm uppercase tracking-widest focus:outline-none transition-colors"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          onClick={() => setShowScanner(true)}
          className="px-4 py-3.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
          style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text-muted)' }}
          title="Scan QR"
        >
          <QrCodeIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleVerify()}
          disabled={isLoading || !code.trim()}
          className="px-5 py-3.5 bg-amber-500 text-black rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center gap-2 transition-opacity"
        >
          <MagnifyingGlassIcon className="w-4 h-4" />
          {isLoading ? '...' : t('verify.check')}
        </button>
      </motion.div>

      {/* QR Scanner overlay */}
      <AnimatePresence>
        {showScanner && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
              onClick={() => { scanLockRef.current = false; setShowScanner(false); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[60] rounded-3xl overflow-hidden"
              style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
            >
              {/* Scanner header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--sweet-border)' }}>
                <div className="flex items-center gap-2.5">
                  <QrCodeIcon className="w-5 h-5" style={{ color: 'var(--sweet-accent)' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--sweet-text)' }}>
                    Scan Customer QR
                  </span>
                </div>
                <button
                  onClick={() => { scanLockRef.current = false; setShowScanner(false); }}
                  className="p-2 rounded-xl transition-colors"
                  style={{ background: 'var(--sweet-input)', color: 'var(--sweet-text-muted)' }}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Camera view */}
              <div className="relative" style={{ aspectRatio: '1 / 1' }}>
                <Scanner
                  onScan={handleScan}
                  onError={(err) => {
                    console.warn('QR scanner error:', err);
                    toast.error('Camera error — use manual input');
                    setShowScanner(false);
                  }}
                  styles={{ container: { width: '100%', height: '100%' } }}
                  constraints={{ facingMode: 'environment' }}
                />
                {/* Corner guides */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    {[
                      'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg',
                      'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
                      'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg',
                      'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg',
                    ].map((cls, i) => (
                      <div key={i} className={`absolute w-8 h-8 ${cls}`} style={{ borderColor: 'var(--sweet-accent)' }} />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-center text-xs py-3" style={{ color: 'var(--sweet-text-muted)' }}>
                Point camera at the customer's coupon QR code
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Coupon result */}
      {coupon && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
        >
          {/* Status banner */}
          <div
            className={`flex items-center gap-2.5 px-5 py-3 ${
              coupon.isValid
                ? 'bg-green-500/10 border-b border-green-500/20'
                : 'bg-red-500/10 border-b border-red-500/20'
            }`}
          >
            {coupon.isValid ? (
              <CheckCircleIcon className="w-5 h-5 text-green-400 shrink-0" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span className={`font-semibold text-sm ${coupon.isValid ? 'text-green-400' : 'text-red-400'}`}>
              {coupon.status === 'REDEEMED'
                ? t('verify.alreadyRedeemed')
                : coupon.status === 'EXPIRED'
                ? t('verify.expired')
                : t('verify.valid')}
            </span>
          </div>

          {/* Details */}
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20 shrink-0">
                <GiftIcon className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--sweet-text)' }}>{coupon.rewardTitle}</p>
                {coupon.rewardDescription && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>{coupon.rewardDescription}</p>
                )}
                {coupon.rewardCategory && (
                  <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--sweet-input)', color: 'var(--sweet-text-muted)', border: '1px solid var(--sweet-border)' }}>
                    {coupon.rewardCategory}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {[
                { label: t('verify.issuedTo'), value: coupon.issuedTo || 'Customer', mono: false },
                { label: t('verify.points'), value: Number(coupon.pointsSpent).toLocaleString(), mono: true },
                { label: t('verify.code'), value: coupon.code, mono: true },
                {
                  label: coupon.redeemedAt ? t('verify.redeemedLabel') : t('verify.expires'),
                  value: new Date(coupon.redeemedAt || coupon.expiresAt).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric', year: 'numeric' }),
                  mono: false,
                },
              ].map(({ label, value, mono }) => (
                <div key={label} className="rounded-xl p-3" style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)' }}>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--sweet-text-muted)' }}>{label}</p>
                  <p className={`text-sm font-medium truncate ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--sweet-text)' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Redeem button */}
            {coupon.isValid && (
              <button
                onClick={handleRedeem}
                disabled={isRedeeming}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
              >
                <CheckCircleIcon className="w-5 h-5" />
                {isRedeeming ? t('verify.processing') : t('verify.markUsed')}
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Empty hint */}
      {!coupon && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-center py-12"
          style={{ color: 'var(--sweet-text-faint)' }}
        >
          <QrCodeIcon className="w-16 h-16 mx-auto mb-4" />
          <p className="text-sm">{t('verify.hint')}</p>
        </motion.div>
      )}
    </div>
  );
}
