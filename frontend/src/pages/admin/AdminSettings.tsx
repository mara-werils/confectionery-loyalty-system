import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GearSixIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  WrenchIcon,
  ShieldCheckIcon,
  InfoIcon,
} from '@phosphor-icons/react';
import { GlassCard } from '../../components/GlassCard';

interface SettingsSection {
  title: string;
  description: string;
  icon: React.ElementType;
  items: SettingItem[];
}

interface SettingItem {
  label: string;
  description: string;
  type: 'number' | 'toggle' | 'text';
  key: string;
  value: string | number | boolean;
  suffix?: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string | number | boolean>>({
    cashbackRate: 5,
    maxCashbackPerTx: 500,
    bronzeThreshold: 0,
    silverThreshold: 5000,
    goldThreshold: 25000,
    maintenanceMode: false,
    registrationOpen: true,
    referralBonus: 100,
    couponExpDays: 30,
    minRedeemAmount: 50,
    contractAddress: 'EQC...loyalty...contract',
    apiVersion: 'v1.4.2',
    dbRegion: 'eu-central-1',
  });

  const updateSetting = (key: string, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const sections: SettingsSection[] = [
    {
      title: 'Кэшбэк',
      description: 'Настройки начисления кэшбэка',
      icon: CurrencyDollarIcon,
      items: [
        { label: 'Ставка кэшбэка', description: 'Процент от суммы покупки', type: 'number', key: 'cashbackRate', value: settings.cashbackRate, suffix: '%' },
        { label: 'Макс. кэшбэк за транзакцию', description: 'Лимит начисления SWEET за одну покупку', type: 'number', key: 'maxCashbackPerTx', value: settings.maxCashbackPerTx, suffix: 'SWEET' },
        { label: 'Мин. сумма обмена', description: 'Минимальное количество баллов для списания', type: 'number', key: 'minRedeemAmount', value: settings.minRedeemAmount, suffix: 'баллов' },
        { label: 'Реферальный бонус', description: 'Начисление за приглашённого пользователя', type: 'number', key: 'referralBonus', value: settings.referralBonus, suffix: 'SWEET' },
      ],
    },
    {
      title: 'Пороги уровней',
      description: 'Баллы для перехода на следующий уровень',
      icon: ChartBarIcon,
      items: [
        { label: 'Бронза', description: 'Начальный уровень', type: 'number', key: 'bronzeThreshold', value: settings.bronzeThreshold, suffix: 'баллов' },
        { label: 'Серебро', description: 'Средний уровень лояльности', type: 'number', key: 'silverThreshold', value: settings.silverThreshold, suffix: 'баллов' },
        { label: 'Золото', description: 'Премиальный уровень', type: 'number', key: 'goldThreshold', value: settings.goldThreshold, suffix: 'баллов' },
      ],
    },
    {
      title: 'Системные переключатели',
      description: 'Режимы работы платформы',
      icon: WrenchIcon,
      items: [
        { label: 'Режим обслуживания', description: 'Заблокировать доступ для пользователей', type: 'toggle', key: 'maintenanceMode', value: settings.maintenanceMode },
        { label: 'Регистрация открыта', description: 'Разрешить новым партнёрам регистрироваться', type: 'toggle', key: 'registrationOpen', value: settings.registrationOpen },
      ],
    },
    {
      title: 'Купоны',
      description: 'Настройки системы купонов',
      icon: GearSixIcon,
      items: [
        { label: 'Срок действия купона', description: 'Количество дней до истечения', type: 'number', key: 'couponExpDays', value: settings.couponExpDays, suffix: 'дней' },
      ],
    },
  ];

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Настройки</h1>
        <p className="text-sm text-stone-500 mt-1">Конфигурация системы лояльности</p>
      </div>

      {/* Info banner */}
      <GlassCard delay={0.05} className="p-4 border-amber-500/10">
        <div className="flex items-start gap-3">
          <InfoIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-400 font-medium">Режим просмотра</p>
            <p className="text-xs text-stone-500 mt-0.5">
              Настройки отображаются в режиме просмотра. Для применения изменений требуется подтверждение через смарт-контракт.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Settings Sections */}
      {sections.map((section, sIdx) => (
        <GlassCard key={section.title} delay={0.1 + sIdx * 0.05} className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <section.icon className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{section.title}</h3>
              <p className="text-[11px] text-stone-500">{section.description}</p>
            </div>
          </div>

          <div className="space-y-1">
            {section.items.map((item, iIdx) => (
              <div
                key={item.key}
                className={`flex items-center justify-between py-3 px-3 rounded-xl hover:bg-white/[0.02] transition-colors ${
                  iIdx < section.items.length - 1 ? 'border-b border-stone-800/50' : ''
                }`}
              >
                <div className="flex-1 mr-4">
                  <p className="text-sm text-stone-300">{item.label}</p>
                  <p className="text-[11px] text-stone-600 mt-0.5">{item.description}</p>
                </div>
                <div className="flex-shrink-0">
                  {item.type === 'toggle' ? (
                    <button
                      onClick={() => updateSetting(item.key, !item.value)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        item.value ? 'bg-amber-500' : 'bg-stone-700'
                      }`}
                    >
                      <motion.div
                        animate={{ x: item.value ? 20 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                      />
                    </button>
                  ) : item.type === 'number' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={item.value as number}
                        onChange={(e) => updateSetting(item.key, parseInt(e.target.value) || 0)}
                        className="w-24 bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-right text-stone-300 focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                      {item.suffix && (
                        <span className="text-[11px] text-stone-500 w-12">{item.suffix}</span>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={item.value as string}
                      onChange={(e) => updateSetting(item.key, e.target.value)}
                      className="w-48 bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-300 focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ))}

      {/* System Info */}
      <GlassCard delay={0.4} className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center">
            <ShieldCheckIcon className="w-4.5 h-4.5 text-stone-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Системная информация</h3>
            <p className="text-[11px] text-stone-500">Только для чтения</p>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: 'Версия API', value: settings.apiVersion as string },
            { label: 'Смарт-контракт', value: settings.contractAddress as string, mono: true },
            { label: 'Регион БД', value: settings.dbRegion as string },
            { label: 'Блокчейн', value: 'TON Mainnet' },
            { label: 'Стандарт токена', value: 'SWEET (Jetton)' },
            { label: 'SBT стандарт', value: 'TON SBT (TEP-85)' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-stone-800/20">
              <span className="text-xs text-stone-500 uppercase tracking-wider">{item.label}</span>
              <span className={`text-sm text-stone-300 ${item.mono ? 'font-mono text-xs' : ''}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
