import { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheckIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  MinusCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  PlusIcon,
  XMarkIcon,
  CheckBadgeIcon,
  UserGroupIcon,
  BanknotesIcon,
  DocumentTextIcon,
  FireIcon,
} from '@heroicons/react/24/outline';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ProposalStatus = 'active' | 'passed' | 'rejected' | 'pending';

interface Proposal {
  id: number;
  title: string;
  description: string;
  proposer: string;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  quorum: number; // percentage needed
  totalVoters: number;
  endsIn: string; // human-readable
  category: string;
  userVote: 'for' | 'against' | 'abstain' | null;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: 1,
    title: 'Увеличить кэшбэк с 10% до 15%',
    description:
      'Предложение повысить базовую ставку кэшбэка для всех участников программы лояльности с текущих 10% до 15%, что позволит привлечь новых клиентов и повысить удержание существующих.',
    proposer: 'EQBx...7kF2',
    status: 'active',
    votesFor: 8_375,
    votesAgainst: 4_125,
    votesAbstain: 1_000,
    quorum: 60,
    totalVoters: 185,
    endsIn: '2 дня 14 часов',
    category: 'Параметры системы',
    userVote: null,
  },
  {
    id: 2,
    title: 'Добавить новую категорию наград: Мастер-классы',
    description:
      'Добавить возможность обменивать SWEET-токены на участие в кулинарных мастер-классах от шеф-кондитеров. Это создаст дополнительную ценность для участников программы.',
    proposer: 'EQAm...3pR9',
    status: 'active',
    votesFor: 10_250,
    votesAgainst: 2_250,
    votesAbstain: 500,
    quorum: 60,
    totalVoters: 210,
    endsIn: '4 дня 6 часов',
    category: 'Новые функции',
    userVote: null,
  },
  {
    id: 3,
    title: 'Снизить порог Gold-тира до 15,000 SWEET',
    description:
      'Текущий порог Gold-уровня в 20,000 SWEET слишком высок для большинства участников. Снижение до 15,000 увеличит количество Gold-пользователей на 30%.',
    proposer: 'EQCf...8wK1',
    status: 'passed',
    votesFor: 14_560,
    votesAgainst: 1_440,
    votesAbstain: 800,
    quorum: 60,
    totalVoters: 290,
    endsIn: 'Завершено',
    category: 'Параметры системы',
    userVote: null,
  },
  {
    id: 4,
    title: 'Интеграция с Kaspi QR для оплаты',
    description:
      'Реализовать интеграцию с Kaspi QR для удобной оплаты заказов в кондитерской с автоматическим начислением SWEET-токенов за каждую покупку.',
    proposer: 'EQDn...2jT5',
    status: 'pending',
    votesFor: 0,
    votesAgainst: 0,
    votesAbstain: 0,
    quorum: 60,
    totalVoters: 0,
    endsIn: 'Начнётся через 1 день',
    category: 'Партнёрства',
    userVote: null,
  },
];

const PAST_PROPOSALS: { title: string; status: ProposalStatus; result: string; date: string }[] = [
  { title: 'Запуск реферальной программы', status: 'passed', result: '94% за', date: '12 мар 2026' },
  { title: 'Увеличить срок действия купонов до 60 дней', status: 'passed', result: '78% за', date: '28 фев 2026' },
  { title: 'Добавить оплату в USDT', status: 'rejected', result: '38% за', date: '15 фев 2026' },
  { title: 'Снизить комиссию на свопы до 0.5%', status: 'passed', result: '85% за', date: '3 фев 2026' },
  { title: 'Ребрендинг NFT-коллекции', status: 'rejected', result: '42% за', date: '20 янв 2026' },
];

const STATUS_CONFIG: Record<ProposalStatus, { label: string; bg: string; text: string }> = {
  active: { label: 'Активно', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  passed: { label: 'Принято', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  rejected: { label: 'Отклонено', bg: 'bg-red-500/15', text: 'text-red-400' },
  pending: { label: 'Ожидание', bg: 'bg-stone-500/15', text: 'text-stone-400' },
};

const CATEGORIES = ['Параметры системы', 'Новые функции', 'Партнёрства', 'Другое'] as const;

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Governance() {
  const [proposals, setProposals] = useState<Proposal[]>(INITIAL_PROPOSALS);
  const [showPast, setShowPast] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Modal form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<string>(CATEGORIES[0]);
  const [formDuration, setFormDuration] = useState(5);

  /* ---------- vote handler ---------- */
  const handleVote = (id: number, vote: 'for' | 'against' | 'abstain') => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (p.status !== 'active') return p;

        const power = 1_250; // user's GOV tokens
        const { userVote } = p;
        let { votesFor, votesAgainst, votesAbstain, totalVoters } = p;

        // undo previous vote
        if (userVote === 'for') { votesFor -= power; totalVoters -= 1; }
        if (userVote === 'against') { votesAgainst -= power; totalVoters -= 1; }
        if (userVote === 'abstain') { votesAbstain -= power; totalVoters -= 1; }

        // same vote => toggle off
        if (userVote === vote) {
          return { ...p, votesFor, votesAgainst, votesAbstain, totalVoters, userVote: null };
        }

        // apply new vote
        if (vote === 'for') votesFor += power;
        if (vote === 'against') votesAgainst += power;
        if (vote === 'abstain') votesAbstain += power;
        totalVoters += 1;

        return { ...p, votesFor, votesAgainst, votesAbstain, totalVoters, userVote: vote };
      }),
    );
  };

  /* ---------- create proposal ---------- */
  const handleCreate = () => {
    if (!formTitle.trim()) return;
    const newP: Proposal = {
      id: Date.now(),
      title: formTitle,
      description: formDesc || 'Без описания',
      proposer: 'EQYo...ваш',
      status: 'pending',
      votesFor: 0,
      votesAgainst: 0,
      votesAbstain: 0,
      quorum: 60,
      totalVoters: 0,
      endsIn: `Начнётся через ${formDuration} дн.`,
      category: formCategory,
      userVote: null,
    };
    setProposals((prev) => [newP, ...prev]);
    setFormTitle('');
    setFormDesc('');
    setFormCategory(CATEGORIES[0]);
    setFormDuration(5);
    setModalOpen(false);
  };

  /* ---------- helpers ---------- */
  const pct = (a: number, b: number) => {
    const total = a + b;
    return total === 0 ? 50 : Math.round((a / total) * 100);
  };

  const quorumReached = (p: Proposal) => {
    const totalSupply = 125_000;
    const totalVotes = p.votesFor + p.votesAgainst + p.votesAbstain;
    return (totalVotes / totalSupply) * 100 >= p.quorum;
  };

  /* ---------- stats ---------- */
  const totalProposals = proposals.length + PAST_PROPOSALS.length;
  const totalVotesCast = proposals.reduce((s, p) => s + p.totalVoters, 0) + 1_245;
  const participationRate = 72;
  const treasuryBalance = '340,500 SWEET';

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */
  return (
    <div className="space-y-6 pb-10 text-stone-100">
      {/* -------- Header -------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShieldCheckIcon className="w-7 h-7 text-amber-400" />
          Управление DAO
        </h1>
        <p className="text-stone-400 text-sm mt-1">
          Децентрализованное управление программой лояльности. Голосуйте за предложения и влияйте на будущее экосистемы.
        </p>
      </motion.div>

      {/* -------- Voting Power Card -------- */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        custom={1}
        className="bg-gradient-to-br from-amber-500/10 via-stone-900 to-stone-900 border border-amber-500/20 rounded-2xl p-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wider">Ваша сила голоса</p>
            <p className="text-3xl font-bold text-white mt-1">
              1,250 <span className="text-base font-medium text-amber-400">GOV</span>
            </p>
            <p className="text-sm text-stone-400 mt-0.5">1.0% от общего предложения</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
              <FireIcon className="w-8 h-8 text-amber-400" />
            </div>
            <button className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors">
              Делегировать
            </button>
          </div>
        </div>
      </motion.div>

      {/* -------- Create Proposal Button -------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2}>
        <button
          onClick={() => setModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold text-sm hover:bg-amber-500/20 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Создать предложение
        </button>
      </motion.div>

      {/* -------- Active Proposals -------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}>
        <h2 className="text-lg font-semibold text-white mb-3">Предложения</h2>
      </motion.div>

      <div className="space-y-4">
        {proposals.map((p, idx) => {
          const forPct = pct(p.votesFor, p.votesAgainst);
          const againstPct = 100 - forPct;
          const totalVotes = p.votesFor + p.votesAgainst + p.votesAbstain;
          const cfg = STATUS_CONFIG[p.status];

          return (
            <motion.div
              key={p.id}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={4 + idx}
              className="bg-stone-900 border border-stone-800/80 rounded-2xl p-5 space-y-4"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white leading-snug">{p.title}</h3>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2">{p.description}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                  {cfg.label}
                </span>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500">
                <span>Автор: <span className="text-stone-400 font-mono">{p.proposer}</span></span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5" /> {p.endsIn}
                </span>
                <span>{p.category}</span>
              </div>

              {/* Voting bar */}
              {(p.status === 'active' || p.status === 'passed' || p.status === 'rejected') && totalVotes > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span className="text-emerald-400">За {forPct}%</span>
                    <span className="text-red-400">Против {againstPct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-stone-800 overflow-hidden flex">
                    <motion.div
                      className="bg-emerald-500 rounded-l-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${forPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                    <motion.div
                      className="bg-red-500 rounded-r-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${againstPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-stone-500">
                    <span>{totalVotes.toLocaleString('ru-RU')} GOV проголосовало</span>
                    <span className={quorumReached(p) ? 'text-emerald-400' : 'text-stone-500'}>
                      Кворум: {quorumReached(p) ? 'достигнут' : 'не достигнут'}
                    </span>
                  </div>
                </div>
              )}

              {/* Vote buttons */}
              {p.status === 'active' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVote(p.id, 'for')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      p.userVote === 'for'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 ring-1 ring-emerald-500/20'
                        : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-emerald-500/40 hover:text-emerald-400'
                    }`}
                  >
                    <HandThumbUpIcon className="w-4 h-4" />
                    За
                  </button>
                  <button
                    onClick={() => handleVote(p.id, 'against')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      p.userVote === 'against'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 ring-1 ring-red-500/20'
                        : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-red-500/40 hover:text-red-400'
                    }`}
                  >
                    <HandThumbDownIcon className="w-4 h-4" />
                    Против
                  </button>
                  <button
                    onClick={() => handleVote(p.id, 'abstain')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      p.userVote === 'abstain'
                        ? 'bg-stone-600/30 text-stone-300 border border-stone-500/40 ring-1 ring-stone-500/20'
                        : 'bg-stone-800 text-stone-400 border border-stone-700 hover:border-stone-500/40 hover:text-stone-300'
                    }`}
                  >
                    <MinusCircleIcon className="w-4 h-4" />
                    Воздержаться
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* -------- Governance Stats -------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={9}>
        <h2 className="text-lg font-semibold text-white mb-3">Статистика управления</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Всего предложений', value: totalProposals.toString(), icon: DocumentTextIcon, color: 'text-amber-400' },
            { label: 'Голосов подано', value: totalVotesCast.toLocaleString('ru-RU'), icon: UserGroupIcon, color: 'text-emerald-400' },
            { label: 'Участие', value: `${participationRate}%`, icon: CheckBadgeIcon, color: 'text-blue-400' },
            { label: 'Казна', value: treasuryBalance, icon: BanknotesIcon, color: 'text-purple-400' },
          ].map((s) => (
            <div key={s.label} className="bg-stone-900 border border-stone-800/80 rounded-xl p-4 flex flex-col gap-1">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <span className="text-lg font-bold text-white">{s.value}</span>
              <span className="text-[11px] text-stone-500">{s.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* -------- Past Proposals -------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={10}>
        <button
          onClick={() => setShowPast(!showPast)}
          className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-stone-900 border border-stone-800/80 text-sm font-semibold text-white hover:bg-stone-800/60 transition-colors"
        >
          <span>Завершённые предложения</span>
          <ChevronDownIcon className={`w-5 h-5 text-stone-400 transition-transform duration-300 ${showPast ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showPast && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 mt-3">
                {PAST_PROPOSALS.map((pp, i) => {
                  const cfg = STATUS_CONFIG[pp.status];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between gap-2 py-3 px-4 rounded-xl bg-stone-900/60 border border-stone-800/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white truncate">{pp.title}</p>
                        <p className="text-[10px] text-stone-500 mt-0.5">{pp.date}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-stone-400">{pp.result}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ================================================================ */}
      {/*  Create Proposal Modal                                           */}
      {/* ================================================================ */}
      <AnimatePresence>
        {modalOpen && (
          <Fragment>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
              onClick={() => setModalOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-4 top-[10%] z-[70] mx-auto max-w-lg bg-stone-900 border border-stone-700 rounded-2xl p-6 shadow-2xl"
            >
              {/* Close */}
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold text-white mb-4">Создать предложение</h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Заголовок</label>
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Краткое название предложения"
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Описание</label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Подробно опишите ваше предложение..."
                    rows={4}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-amber-500/50 resize-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Категория</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 appearance-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Длительность голосования</label>
                  <div className="flex gap-2">
                    {[3, 5, 7].map((d) => (
                      <button
                        key={d}
                        onClick={() => setFormDuration(d)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                          formDuration === d
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                            : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                        }`}
                      >
                        {d} дней
                      </button>
                    ))}
                  </div>
                </div>

                {/* Requirement notice */}
                <p className="text-[11px] text-stone-500">
                  Минимум <span className="text-amber-400 font-semibold">100 GOV</span> для создания предложения.
                  У вас: <span className="text-white font-semibold">1,250 GOV</span>
                </p>

                {/* Submit */}
                <button
                  onClick={handleCreate}
                  disabled={!formTitle.trim()}
                  className="w-full py-3 rounded-xl bg-amber-500 text-stone-900 font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Опубликовать предложение
                </button>
              </div>
            </motion.div>
          </Fragment>
        )}
      </AnimatePresence>
    </div>
  );
}
