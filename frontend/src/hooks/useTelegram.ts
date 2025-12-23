import { useEffect, useState, useCallback } from 'react';

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    start_param?: string;
    auth_date: number;
    hash: string;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text: string;
    }>;
  }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function useTelegram() {
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;
    if (telegram) {
      telegram.ready();
      setTg(telegram);
      setIsReady(true);
    }
  }, []);

  const hapticFeedback = useCallback(
    (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning') => {
      if (tg?.HapticFeedback) {
        if (['light', 'medium', 'heavy', 'rigid', 'soft'].includes(type)) {
          tg.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy');
        } else {
          tg.HapticFeedback.notificationOccurred(type as 'error' | 'success' | 'warning');
        }
      }
    },
    [tg]
  );

  const showPopup = useCallback(
    (message: string, title?: string) => {
      if (tg?.showPopup) {
        tg.showPopup({ message, title });
      } else {
        alert(message);
      }
    },
    [tg]
  );

  const showConfirm = useCallback(
    (message: string): Promise<boolean> => {
      return new Promise((resolve) => {
        if (tg?.showConfirm) {
          tg.showConfirm(message, (confirmed) => {
            resolve(confirmed);
          });
        } else {
          resolve(window.confirm(message));
        }
      });
    },
    [tg]
  );

  return {
    tg,
    isReady,
    user: tg?.initDataUnsafe?.user,
    isExpanded: tg?.isExpanded ?? false,
    viewportHeight: tg?.viewportHeight ?? window.innerHeight,
    themeParams: tg?.themeParams,
    hapticFeedback,
    showPopup,
    showConfirm,
  };
}




