import { useState, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
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

interface InitialProposal extends Omit<Proposal, 'title' | 'description' | 'endsIn' | 'category'> {
  titleKey: string;
  descKey: string;
  endsInKey: string;
  categoryKey: string;
}

const INITIAL_PROPOSALS_DATA: InitialProposal[] = [
  {
    id: 1,
    titleKey: 'governance.proposals.1.title',
    descKey: 'governance.proposals.1.description',
    proposer: 'EQBx...7kF2',
    status: 'active',
    votesFor: 8_375,
    votesAgainst: 4_125,
    votesAbstain: 1_000,
    quorum: 60,
    totalVoters: 185,
    endsInKey: 'governance.proposals.1.endsIn',
    categoryKey: 'governance.categories.systemParams',
    userVote: null,
  },
  {
    id: 2,
    titleKey: 'governance.proposals.2.title',
    descKey: 'governance.proposals.2.description',
    proposer: 'EQAm...3pR9',
    status: 'active',
    votesFor: 10_250,
    votesAgainst: 2_250,
    votesAbstain: 500,
    quorum: 60,
    totalVoters: 210,
    endsInKey: 'governance.proposals.2.endsIn',
    categoryKey: 'governance.categories.newFeatures',
    userVote: null,
  },
  {
    id: 3,
    titleKey: 'governance.proposals.3.title',
    descKey: 'governance.proposals.3.description',
    proposer: 'EQCf...8wK1',
    status: 'passed',
    votesFor: 14_560,
    votesAgainst: 1_440,
    votesAbstain: 800,
    quorum: 60,
    totalVoters: 290,
    endsInKey: 'governance.proposals.3.endsIn',
    categoryKey: 'governance.categories.systemParams',
    userVote: null,
  },
  {
    id: 4,
    titleKey: 'governance.proposals.4.title',
    descKey: 'governance.proposals.4.description',
    proposer: 'EQDn...2jT5',
    status: 'pending',
    votesFor: 0,
    votesAgainst: 0,
    votesAbstain: 0,
    quorum: 60,
    totalVoters: 0,
    endsInKey: 'governance.proposals.4.endsIn',
    categoryKey: 'governance.categories.partnerships',
    userVote: null,
  },
];

interface PastProposalData {
  titleKey: string;
  status: ProposalStatus;
  resultKey: string;
  dateKey: string;
}

const PAST_PROPOSALS_DATA: PastProposalData[] = [
  { titleKey: 'governance.pastProposals.1.title', status: 'passed', resultKey: 'governance.pastProposals.1.result', dateKey: 'governance.pastProposals.1.date' },
  { titleKey: 'governance.pastProposals.2.title', status: 'passed', resultKey: 'governance.pastProposals.2.result', dateKey: 'governance.pastProposals.2.date' },
  { titleKey: 'governance.pastProposals.3.title', status: 'rejected', resultKey: 'governance.pastProposals.3.result', dateKey: 'governance.pastProposals.3.date' },
  { titleKey: 'governance.pastProposals.4.title', status: 'passed', resultKey: 'governance.pastProposals.4.result', dateKey: 'governance.pastProposals.4.date' },
  { titleKey: 'governance.pastProposals.5.title', status: 'rejected', resultKey: 'governance.pastProposals.5.result', dateKey: 'governance.pastProposals.5.date' },
];

const STATUS_STYLES: Record<ProposalStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  passed: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  rejected: { bg: 'bg-red-500/15', text: 'text-red-400' },
  pending: { bg: 'bg-stone-500/15', text: 'text-stone-400' },
};

const CATEGORY_KEYS = [
  'governance.categories.systemParams',
  'governance.categories.newFeatures',
  'governance.categories.partnerships',
  'governance.categories.other',
] as const;

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
  const { t } = useTranslation();
  const [proposals, setProposals] = useState<InitialProposal[]>(INITIAL_PROPOSALS_DATA);
  const [showPast, setShowPast] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Modal form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<string>(CATEGORY_KEYS[0]);
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
    const newP: InitialProposal = {
      id: Date.now(),
      titleKey: formTitle,
      descKey: formDesc || t('governance.noDescription'),
      proposer: 'EQYo...you',
      status: 'pending',
      votesFor: 0,
      votesAgainst: 0,
      votesAbstain: 0,
      quorum: 60,
      totalVoters: 0,
      endsInKey: t('governance.startsInDays', { days: formDuration }),
      categoryKey: formCategory,
      userVote: null,
    };
    setProposals((prev) => [newP, ...prev]);
    setFormTitle('');
    setFormDesc('');
    setFormCategory(CATEGORY_KEYS[0]);
    setFormDuration(5);
    setModalOpen(false);
  };

  /* ---------- helpers ---------- */
  const pct = (a: number, b: number) => {
    const total = a + b;
    return total === 0 ? 50 : Math.round((a / total) * 100);
  };

  const quorumReached = (p: InitialProposal) => {
    const totalSupply = 125_000;
    const totalVotes = p.votesFor + p.votesAgainst + p.votesAbstain;
    return (totalVotes / totalSupply) * 100 >= p.quorum;
  };

  /* ---------- stats ---------- */
  const totalProposals = proposals.length + PAST_PROPOSALS_DATA.length;
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
          {t('governance.title')}
        </h1>
        <p className="text-stone-400 text-sm mt-1">
          {t('governance.subtitle')}
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
            <p className="text-xs text-stone-400 uppercase tracking-wider">{t('governance.votingPower')}</p>
            <p className="text-3xl font-bold text-white mt-1">
              1,250 <span className="text-base font-medium text-amber-400">GOV</span>
            </p>
            <p className="text-sm text-stone-400 mt-0.5">1.0% {t('governance.ofTotalSupply')}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
              <FireIcon className="w-8 h-8 text-amber-400" />
            </div>
            <button className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors">
              {t('governance.delegate')}
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
          {t('governance.createProposal')}
        </button>
      </motion.div>

      {/* -------- Active Proposals -------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}>
        <h2 className="text-lg font-semibold text-white mb-3">{t('governance.proposalsTitle')}</h2>
      </motion.div>

      <div className="space-y-4">
        {proposals.map((p, idx) => {
          const forPct = pct(p.votesFor, p.votesAgainst);
          const againstPct = 100 - forPct;
          const totalVotes = p.votesFor + p.votesAgainst + p.votesAbstain;
          const cfg = STATUS_STYLES[p.status];

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
                  <h3 className="text-sm font-semibold text-white leading-snug">{t(p.titleKey, { defaultValue: p.titleKey })}</h3>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2">{t(p.descKey, { defaultValue: p.descKey })}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                  {t(`governance.status.${p.status}`)}
                </span>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500">
                <span>{t('governance.author')}: <span className="text-stone-400 font-mono">{p.proposer}</span></span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5" /> {t(p.endsInKey, { defaultValue: p.endsInKey })}
                </span>
                <span>{t(p.categoryKey, { defaultValue: p.categoryKey })}</span>
              </div>

              {/* Voting bar */}
              {(p.status === 'active' || p.status === 'passed' || p.status === 'rejected') && totalVotes > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span className="text-emerald-400">{t('governance.voteFor')} {forPct}%</span>
                    <span className="text-red-400">{t('governance.voteAgainst')} {againstPct}%</span>
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
                    <span>{totalVotes.toLocaleString()} {t('governance.govVoted')}</span>
                    <span className={quorumReached(p) ? 'text-emerald-400' : 'text-stone-500'}>
                      {t('governance.quorum')}: {quorumReached(p) ? t('governance.quorumReached') : t('governance.quorumNotReached')}
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
                    {t('governance.voteFor')}
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
                    {t('governance.voteAgainst')}
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
                    {t('governance.voteAbstain')}
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* -------- Governance Stats -------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={9}>
        <h2 className="text-lg font-semibold text-white mb-3">{t('governance.statsTitle')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: t('governance.stats.totalProposals'), value: totalProposals.toString(), icon: DocumentTextIcon, color: 'text-amber-400' },
            { label: t('governance.stats.votesCast'), value: totalVotesCast.toLocaleString(), icon: UserGroupIcon, color: 'text-emerald-400' },
            { label: t('governance.stats.participation'), value: `${participationRate}%`, icon: CheckBadgeIcon, color: 'text-blue-400' },
            { label: t('governance.stats.treasury'), value: treasuryBalance, icon: BanknotesIcon, color: 'text-purple-400' },
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
          <span>{t('governance.pastProposalsTitle')}</span>
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
                {PAST_PROPOSALS_DATA.map((pp, i) => {
                  const cfg = STATUS_STYLES[pp.status];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between gap-2 py-3 px-4 rounded-xl bg-stone-900/60 border border-stone-800/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white truncate">{t(pp.titleKey)}</p>
                        <p className="text-[10px] text-stone-500 mt-0.5">{t(pp.dateKey)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-stone-400">{t(pp.resultKey)}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          {t(`governance.status.${pp.status}`)}
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

              <h2 className="text-lg font-bold text-white mb-4">{t('governance.createProposal')}</h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs text-stone-400 mb-1">{t('governance.form.title')}</label>
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={t('governance.form.titlePlaceholder')}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-stone-400 mb-1">{t('governance.form.description')}</label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder={t('governance.form.descriptionPlaceholder')}
                    rows={4}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-amber-500/50 resize-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs text-stone-400 mb-1">{t('governance.form.category')}</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 appearance-none"
                  >
                    {CATEGORY_KEYS.map((c) => (
                      <option key={c} value={c}>{t(c)}</option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs text-stone-400 mb-1">{t('governance.form.duration')}</label>
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
                        {d} {t('governance.form.days')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Requirement notice */}
                <p className="text-[11px] text-stone-500">
                  {t('governance.form.minRequirement')}
                </p>

                {/* Submit */}
                <button
                  onClick={handleCreate}
                  disabled={!formTitle.trim()}
                  className="w-full py-3 rounded-xl bg-amber-500 text-stone-900 font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('governance.form.submit')}
                </button>
              </div>
            </motion.div>
          </Fragment>
        )}
      </AnimatePresence>
    </div>
  );
}
