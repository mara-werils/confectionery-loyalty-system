import { Routes, Route, Navigate } from 'react-router-dom';
import { useTonWallet } from '@tonconnect/ui-react';
import { useEffect, lazy, Suspense } from 'react';

// Pages — eagerly loaded (critical path)
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Profile from './pages/Profile';
import Referrals from './pages/Referrals';
import Stats from './pages/Stats';

// Pages — lazy loaded (heavy / secondary)
const Blockchain = lazy(() => import('./pages/Blockchain'));
const Swap = lazy(() => import('./pages/Swap'));
const AIPredictions = lazy(() => import('./pages/AIPredictions'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Governance = lazy(() => import('./pages/Governance'));

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAuthGate from './pages/admin/AdminAuthGate';
import AdminPartners from './pages/admin/AdminPartners';
import AdminRewards from './pages/admin/AdminRewards';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminSettings from './pages/admin/AdminSettings';

// New role-based pages
import BusinessRegister from './pages/business/BusinessRegister';
import CouponVerify from './pages/business/CouponVerify';
const Analytics = lazy(() => import('./pages/business/Analytics'));
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerRewards from './pages/customer/CustomerRewards';
import Staking from './pages/customer/Staking';
const SpinWheel = lazy(() => import('./pages/customer/SpinWheel'));
const GiftTokens = lazy(() => import('./pages/customer/GiftTokens'));

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { FEATURES } from './config/features';

// Hooks
import { useTelegram } from './hooks/useTelegram';
import { useAuthStore } from './store/authStore';

const RootRedirect = () => {
  const { role } = useAuthStore();
  return <Navigate to={role === 'business' ? '/business/dashboard' : '/customer/dashboard'} replace />;
};

const RoleGuard = ({ allowedRole, children }: { allowedRole: 'business' | 'customer', children: React.ReactNode }) => {
  const { role } = useAuthStore();
  if (role && role !== allowedRole) {
    return <RootRedirect />;
  }
  return <>{children}</>;
};

function App() {
  const { tg, isExpanded } = useTelegram();
  const wallet = useTonWallet();
  const { setWalletAddress } = useAuthStore();

  // Expand Telegram Mini App
  useEffect(() => {
    if (tg && !isExpanded) {
      tg.expand();
    }
  }, [tg, isExpanded]);

  // Sync wallet state
  useEffect(() => {
    if (wallet) {
      setWalletAddress(wallet.account.address);
    } else {
      setWalletAddress(null);
    }
  }, [wallet, setWalletAddress]);

  // Set Telegram theme
  useEffect(() => {
    if (tg?.themeParams) {
      const root = document.documentElement;
      Object.entries(tg.themeParams).forEach(([key, value]) => {
        root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, value as string);
      });
    }
  }, [tg?.themeParams]);

  const LazyFallback = (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sweet-bg)' }}>
      <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <Suspense fallback={LazyFallback}>
    <Routes>
      {/* Public route */}
      <Route path="/" element={<Home />} />
      
      {/* Admin Routes with Auth Gate + Admin Layout */}
      <Route path="/admin" element={<AdminAuthGate />}>
        <Route index element={<AdminDashboard />} />
        <Route path="partners" element={<AdminPartners />} />
        <Route path="rewards" element={<AdminRewards />} />
        <Route path="audit" element={<AdminAuditLog />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      
      {/* Business registration (needs wallet but no layout) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/business/register" element={<BusinessRegister />} />
      </Route>

      {/* Business routes with business layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleGuard allowedRole="business"><Layout variant="business" /></RoleGuard>}>
          <Route path="/business/dashboard" element={<Dashboard />} />
          <Route path="/business/verify-coupon" element={<CouponVerify />} />
          <Route path="/ai" element={<AIPredictions />} />
          <Route path="/blockchain" element={<Blockchain />} />
          <Route path="/swap" element={FEATURES.SWAP ? <Swap /> : <Navigate to="/business/dashboard" replace />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/governance" element={FEATURES.GOVERNANCE ? <Governance /> : <Navigate to="/business/dashboard" replace />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/business/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Customer routes with customer layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleGuard allowedRole="customer"><Layout variant="customer" /></RoleGuard>}>
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
          <Route path="/customer/rewards" element={<CustomerRewards />} />
          <Route path="/customer/spin" element={<SpinWheel />} />
          <Route path="/customer/gift" element={<GiftTokens />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/staking" element={FEATURES.STAKING ? <Staking /> : <Navigate to="/customer/dashboard" replace />} />
          <Route path="/customer/governance" element={FEATURES.GOVERNANCE ? <Governance /> : <Navigate to="/customer/dashboard" replace />} />
          <Route path="/customer/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Generic fallback routes for ease of use */}
      <Route path="/dashboard" element={<RootRedirect />} />
      <Route path="/rewards" element={<RootRedirect />} />
      <Route path="/profile" element={<RootRedirect />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

export default App;
