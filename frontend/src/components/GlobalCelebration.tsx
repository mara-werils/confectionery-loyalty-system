import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { io as socketIO } from 'socket.io-client';
import { useTonWallet } from '@tonconnect/ui-react';
import { useAuthStore } from '../store/authStore';
import PurchaseNotification, { PurchaseNotificationPayload } from './PurchaseNotification';

/**
 * App-wide listener for purchase:awarded — shows the cashback celebration on
 * any customer page. CustomerDashboard renders its own notification, so events
 * are ignored while the user is there to avoid duplicates.
 */
export default function GlobalCelebration() {
  const location = useLocation();
  const wallet = useTonWallet();
  const walletAddress = wallet?.account.address || '';
  const [payload, setPayload] = useState<PurchaseNotificationPayload | null>(null);

  const onDashboardRef = useRef(false);
  onDashboardRef.current = location.pathname === '/customer/dashboard';

  useEffect(() => {
    if (!walletAddress) return;

    const socketUrl =
      import.meta.env.VITE_WS_URL ||
      import.meta.env.VITE_API_URL?.replace(/\/(api\/v1|v1|api)\/?$/, '') ||
      (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

    const socket = socketIO(socketUrl, { transports: ['websocket', 'polling'] });
    socket.emit('subscribe:wallet', walletAddress);

    socket.on('purchase:awarded', (p: PurchaseNotificationPayload & { pointsEarned: number }) => {
      if (onDashboardRef.current) return; // dashboard handles its own celebration + balance
      const store = useAuthStore.getState();
      useAuthStore.setState({ sweetBalance: store.sweetBalance + (p.pointsEarned || 0) });
      setPayload(p);
    });

    return () => {
      socket.emit('unsubscribe:wallet', walletAddress);
      socket.disconnect();
    };
  }, [walletAddress]);

  return <PurchaseNotification payload={payload} onDismiss={() => setPayload(null)} />;
}
