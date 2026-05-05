import { useState, Fragment } from 'react';
import { Dialog, Transition, Switch } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ShieldCheckIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useTonWallet } from '@tonconnect/ui-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

type TabType = 'security' | 'notifications' | 'help';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TabType;
}

const tabs = [
  { key: 'security' as const, label: 'Безопасность', icon: ShieldCheckIcon },
  { key: 'notifications' as const, label: 'Уведомления', icon: BellIcon },
  { key: 'help' as const, label: 'Помощь', icon: QuestionMarkCircleIcon },
];

const faqs = [
  {
    question: 'Как заработать токены SWEET?',
    answer: 'Вы получаете SWEET за каждую покупку у партнёрских кондитерских. 1₸ = 1 SWEET балл.',
  },
  {
    question: 'Можно ли перевести токены на другой кошелёк?',
    answer: 'Да! SWEET — стандартные TON Jetton-ы. Их можно перевести на любой совместимый кошелёк.',
  },
  {
    question: 'Как получить награду?',
    answer: 'Перейдите во вкладку «Награды», выберите награду и нажмите «Получить». Покажите подтверждение партнёру.',
  },
  {
    question: 'Что такое токены GOV?',
    answer: 'GOV-токены дают вам право голоса в DAO. Вы можете участвовать в управлении проектом.',
  },
];

export default function SettingsModal({ isOpen, onClose, initialTab = 'security' }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [copied, setCopied] = useState(false);
  const wallet = useTonWallet();
  
  // Settings state
  const [settings, setSettings] = useState({
    twoFactorEnabled: false,
    pushNotifications: true,
    emailNotifications: true,
    marketingEmails: false,
    transactionAlerts: true,
  });

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleCopyAddress = () => {
    if (wallet?.account.address) {
      navigator.clipboard.writeText(wallet.account.address);
      setCopied(true);
      toast.success('Адрес скопирован!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => {
      const newValue = !prev[key];
      toast.success(`${key === 'twoFactorEnabled' ? '2FA' : key.replace(/([A-Z])/g, ' $1')} ${newValue ? 'enabled' : 'disabled'}`);
      return { ...prev, [key]: newValue };
    });
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-t-3xl sm:rounded-3xl bg-gradient-to-b from-gray-900 to-gray-950 border border-white/10 shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <Dialog.Title className="text-lg font-bold text-white">
                    Настройки
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={clsx(
                        'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all',
                        activeTab === tab.key
                          ? 'text-white border-b-2 border-white'
                          : 'text-stone-500 hover:text-stone-300'
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {activeTab === 'security' && (
                      <motion.div
                        key="security"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-4"
                      >
                        {/* Wallet Address */}
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-xs text-gray-500 mb-2">Подключённый кошелёк</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm text-gray-300 font-mono truncate">
                              {wallet?.account.address || 'Не подключён'}
                            </code>
                            <button
                              onClick={handleCopyAddress}
                              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            >
                              {copied ? (
                                <CheckIcon className="w-4 h-4 text-green-400" />
                              ) : (
                                <ClipboardDocumentIcon className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* 2FA Toggle */}
                        <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
                          <div>
                            <p className="font-medium text-white">Двухфакторная аутентификация</p>
                            <p className="text-xs text-gray-500">Дополнительная защита аккаунта</p>
                          </div>
                          <Switch
                            checked={settings.twoFactorEnabled}
                            onChange={() => toggleSetting('twoFactorEnabled')}
                            className={clsx(
                              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                              settings.twoFactorEnabled ? 'bg-white' : 'bg-stone-800'
                            )}
                          >
                            <span
                              className={clsx(
                                'inline-block h-4 w-4 transform rounded-full transition-transform',
                                settings.twoFactorEnabled ? 'translate-x-6 bg-black' : 'translate-x-1 bg-stone-400'
                              )}
                            />
                          </Switch>
                        </div>

                        {/* Security Status */}
                        <div className="flex items-center gap-3 bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                          <ShieldCheckIcon className="w-8 h-8 text-green-400" />
                          <div>
                            <p className="font-medium text-green-400">Аккаунт защищён</p>
                            <p className="text-xs text-green-400/70">Кошелёк безопасно подключён через TonConnect</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'notifications' && (
                      <motion.div
                        key="notifications"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-3"
                      >
                        {[
                          { key: 'pushNotifications' as const, label: 'Push-уведомления', desc: 'Получать push-оповещения' },
                          { key: 'transactionAlerts' as const, label: 'Оповещения о транзакциях', desc: 'Уведомлять о новых транзакциях' },
                          { key: 'emailNotifications' as const, label: 'Email-уведомления', desc: 'Важные обновления по email' },
                          { key: 'marketingEmails' as const, label: 'Маркетинговые рассылки', desc: 'Акции и специальные предложения' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between bg-white/5 rounded-xl p-4">
                            <div>
                              <p className="font-medium text-white">{item.label}</p>
                              <p className="text-xs text-gray-500">{item.desc}</p>
                            </div>
                            <Switch
                              checked={settings[item.key]}
                              onChange={() => toggleSetting(item.key)}
                              className={clsx(
                                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                                settings[item.key] ? 'bg-white' : 'bg-stone-800'
                              )}
                            >
                              <span
                                className={clsx(
                                  'inline-block h-4 w-4 transform rounded-full transition-transform',
                                  settings[item.key] ? 'translate-x-6 bg-black' : 'translate-x-1 bg-stone-400'
                                )}
                              />
                            </Switch>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {activeTab === 'help' && (
                      <motion.div
                        key="help"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-3"
                      >
                        <p className="text-sm text-gray-400 mb-4">Часто задаваемые вопросы</p>
                        
                        {faqs.map((faq, index) => (
                          <div key={index} className="bg-white/5 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                              className="w-full flex items-center justify-between p-4 text-left"
                            >
                              <span className="font-medium text-white text-sm">{faq.question}</span>
                              <ChevronDownIcon 
                                className={clsx(
                                  'w-4 h-4 text-gray-400 transition-transform',
                                  expandedFaq === index && 'rotate-180'
                                )}
                              />
                            </button>
                            <AnimatePresence>
                              {expandedFaq === index && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <p className="px-4 pb-4 text-sm text-gray-400">{faq.answer}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}

                        {/* Contact Support */}
                        <button
                          onClick={() => {
                            toast.success('Запрос в поддержку отправлен!');
                            onClose();
                          }}
                          className="w-full mt-4 py-3 bg-amber-500 text-black hover:bg-amber-400 rounded-xl font-bold transition-colors"
                        >
                          Связаться с поддержкой
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
