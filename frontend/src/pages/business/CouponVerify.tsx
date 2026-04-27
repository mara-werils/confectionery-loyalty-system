import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';
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
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [coupon, setCoupon] = useState<CouponInfo | null>(null);

  const handleVerify = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setIsLoading(true);
    setCoupon(null);
    try {
      const res = await api.coupons.verify(trimmed);
      setCoupon((res as { data: CouponInfo }).data);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Coupon not found');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!coupon) return;
    setIsRedeeming(true);
    try {
      await api.coupons.redeem(coupon.code);
      toast.success('Coupon marked as used!');
      setCoupon({ ...coupon, status: 'REDEEMED', isValid: false, redeemedAt: new Date().toISOString() });
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to redeem coupon');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pl-1">
        <div className="flex items-center gap-3 mb-1">
          <QrCodeIcon className="w-7 h-7 text-stone-400" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Verify Coupon</h1>
        </div>
        <p className="text-stone-400 mt-1">Enter a customer coupon code to check and redeem it</p>
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
          className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-4 py-3.5 text-white font-mono text-sm uppercase tracking-widest placeholder:text-stone-600 focus:outline-none focus:border-stone-600 transition-colors"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          onClick={handleVerify}
          disabled={isLoading || !code.trim()}
          className="px-5 py-3.5 bg-amber-500 text-black rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center gap-2 transition-opacity"
        >
          <MagnifyingGlassIcon className="w-4 h-4" />
          {isLoading ? '...' : 'Check'}
        </button>
      </motion.div>

      {/* Coupon result */}
      {coupon && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-stone-900 border border-stone-800/80 rounded-2xl overflow-hidden"
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
            <span
              className={`font-semibold text-sm ${coupon.isValid ? 'text-green-400' : 'text-red-400'}`}
            >
              {coupon.status === 'REDEEMED'
                ? 'Already Redeemed'
                : coupon.status === 'EXPIRED'
                ? 'Expired'
                : 'Valid — Ready to Use'}
            </span>
          </div>

          {/* Details */}
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20 shrink-0">
                <GiftIcon className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="font-semibold text-white">{coupon.rewardTitle}</p>
                {coupon.rewardDescription && (
                  <p className="text-xs text-stone-500 mt-0.5">{coupon.rewardDescription}</p>
                )}
                {coupon.rewardCategory && (
                  <span className="inline-block mt-1.5 text-xs px-2 py-0.5 bg-stone-800 text-stone-400 rounded-full">
                    {coupon.rewardCategory}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-stone-800/50 rounded-xl p-3">
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Issued To</p>
                <p className="text-sm font-medium text-white truncate">
                  {coupon.issuedTo || 'Customer'}
                </p>
              </div>
              <div className="bg-stone-800/50 rounded-xl p-3">
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Points</p>
                <p className="text-sm font-bold text-white font-mono">
                  {Number(coupon.pointsSpent).toLocaleString()}
                </p>
              </div>
              <div className="bg-stone-800/50 rounded-xl p-3">
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Code</p>
                <p className="text-sm font-mono text-stone-300">{coupon.code}</p>
              </div>
              <div className="bg-stone-800/50 rounded-xl p-3">
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
                  {coupon.redeemedAt ? 'Redeemed' : 'Expires'}
                </p>
                <p className="text-sm font-medium text-white">
                  {new Date(coupon.redeemedAt || coupon.expiresAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Redeem button */}
            {coupon.isValid && (
              <button
                onClick={handleRedeem}
                disabled={isRedeeming}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
              >
                <CheckCircleIcon className="w-5 h-5" />
                {isRedeeming ? 'Processing...' : 'Mark as Used'}
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
          className="text-center py-12 text-stone-700"
        >
          <QrCodeIcon className="w-16 h-16 mx-auto mb-4" />
          <p className="text-sm">Enter a coupon code above to verify it</p>
        </motion.div>
      )}
    </div>
  );
}
