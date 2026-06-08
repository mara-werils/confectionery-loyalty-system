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

/* Status styles using inline CSS vars */
const STATUS_INLINE: Record<ProposalStatus, { bg: string; color: string }> = {
  active:   { bg: 'rgba(245,158,11,0.13)',  color: '#f59e0b' },
  passed:   { bg: 'rgba(52,211,153,0.13)',  color: '#34d399' },
  rejected: { bg: 'rgba(120,113,108,0.18)', color: 'var(--sweet-text-muted)' },
  pending:  { bg: 'rgba(120,113,108,0.14)', color: 'var(--sweet-text-faint)' },
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
    <div className="space-y-6 pb-10" style={{ color: 'var(--sweet-text)' }}>
      {/* -------- Header -------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
        <h1
          className="text-2xl font-bold tracking-tight flex items-center gap-2"
          style={{ color: 'var(--sweet-text)' }}
        >
          <ShieldCheckIcon className="w-7 h-7" style={{ color: 'var(--sweet-accent)' }} />
          {t('governance.title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--sweet-text-muted)' }}>
          {t('governance.subtitle')}
        </p>
      </motion.div>

      {/* -------- Voting Power Card -------- */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        custom={1}
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, var(--sweet-card) 60%, var(--sweet-card) 100%)',
          border: '1px solid rgba(245,158,11,0.22)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-xs uppercase tracking-wider"
              style={{ color: 'var(--sweet-text-muted)' }}
            >
              {t('governance.votingPower')}
            </p>
            <p className="text-3xl font-bold mt-1" style={{ color: 'var(--sweet-text)' }}>
              1,250{' '}
              <span className="text-base font-medium" style={{ color: 'var(--sweet-accent)' }}>
                GOV
              </span>
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--sweet-text-muted)' }}>
              1.0% {t('governance.ofTotalSupply')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(245,158,11,0.10)',
                border: '1px solid rgba(245,158,11,0.30)',
              }}
            >
              <FireIcon className="w-8 h-8" style={{ color: 'var(--sweet-accent)' }} />
            </div>
            <button
              className="text-xs font-medium transition-colors"
              style={{ color: 'var(--sweet-accent)' }}
            >
              {t('governance.delegate')}
            </button>
          </div>
        </div>
      </motion.div>

      {/* -------- Create Proposal Button -------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2}>
        <button
          onClick={() => setModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors"
          style={{
            background: 'rgba(245,158,11,0.10)',
            border: '1px solid rgba(245,158,11,0.30)',
            color: 'var(--sweet-accent)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.10)')}
        >
          <PlusIcon className="w-5 h-5" />
          {t('governance.createProposal')}
        </button>
      </motion.div>

      {/* -------- Active Proposals -------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--sweet-text)' }}>
          {t('governance.proposalsTitle')}
        </h2>
      </motion.div>

      <div className="space-y-4">
        {proposals.map((p, idx) => {
          const forPct = pct(p.votesFor, p.votesAgainst);
          const againstPct = 100 - forPct;
          const totalVotes = p.votesFor + p.votesAgainst + p.votesAbstain;
          const cfg = STATUS_INLINE[p.status];

          return (
            <motion.div
              key={p.id}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={4 + idx}
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: 'var(--sweet-card)',
                border: '1px solid var(--sweet-border)',
              }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-sm font-semibold leading-snug"
                    style={{ color: 'var(--sweet-text)' }}
                  >
                    {t(p.titleKey, { defaultValue: p.titleKey })}
                  </h3>
                  <p
                    className="text-xs mt-1 line-clamp-2"
                    style={{ color: 'var(--sweet-text-faint)' }}
                  >
                    {t(p.descKey, { defaultValue: p.descKey })}
                  </p>
                </div>
                <span
                  className="shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {t(`governance.status.${p.status}`)}
                </span>
              </div>

              {/* Meta */}
              <div
                className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]"
                style={{ color: 'var(--sweet-text-faint)' }}
              >
                <span>
                  {t('governance.author')}:{' '}
                  <span
                    className="font-mono"
                    style={{ color: 'var(--sweet-text-muted)' }}
                  >
                    {p.proposer}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5" />
                  {t(p.endsInKey, { defaultValue: p.endsInKey })}
                </span>
                <span>{t(p.categoryKey, { defaultValue: p.categoryKey })}</span>
              </div>

              {/* Voting bar */}
              {(p.status === 'active' || p.status === 'passed' || p.status === 'rejected') && totalVotes > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span style={{ color: 'var(--sweet-accent)' }}>
                      {t('governance.voteFor')} {forPct}%
                    </span>
                    <span style={{ color: 'var(--sweet-text-muted)' }}>
                      {t('governance.voteAgainst')} {againstPct}%
                    </span>
                  </div>
                  <div
                    className="h-2.5 rounded-full overflow-hidden flex"
                    style={{ background: 'var(--sweet-input)' }}
                  >
                    <motion.div
                      className="rounded-l-full"
                      style={{ background: 'var(--sweet-accent)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${forPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                    <motion.div
                      className="rounded-r-full"
                      style={{ background: 'var(--sweet-text-faint)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${againstPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <div
                    className="flex items-center justify-between text-[10px]"
                    style={{ color: 'var(--sweet-text-faint)' }}
                  >
                    <span>
                      {totalVotes.toLocaleString()} {t('governance.govVoted')}
                    </span>
                    <span
                      style={{ color: quorumReached(p) ? 'var(--sweet-accent)' : 'var(--sweet-text-faint)' }}
                    >
                      {t('governance.quorum')}:{' '}
                      {quorumReached(p) ? t('governance.quorumReached') : t('governance.quorumNotReached')}
                    </span>
                  </div>
                </div>
              )}

              {/* Vote buttons */}
              {p.status === 'active' && (
                <div className="flex gap-2">
                  {/* FOR */}
                  <button
                    onClick={() => handleVote(p.id, 'for')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={
                      p.userVote === 'for'
                        ? {
                            background: 'rgba(245,158,11,0.18)',
                            color: 'var(--sweet-accent)',
                            border: '1px solid rgba(245,158,11,0.40)',
                            boxShadow: '0 0 0 1px rgba(245,158,11,0.18)',
                          }
                        : {
                            background: 'var(--sweet-input)',
                            color: 'var(--sweet-text-muted)',
                            border: '1px solid var(--sweet-border)',
                          }
                    }
                  >
                    <HandThumbUpIcon className="w-4 h-4" />
                    {t('governance.voteFor')}
                  </button>

                  {/* AGAINST */}
                  <button
                    onClick={() => handleVote(p.id, 'against')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={
                      p.userVote === 'against'
                        ? {
                            background: 'rgba(120,113,108,0.22)',
                            color: 'var(--sweet-text-secondary)',
                            border: '1px solid rgba(120,113,108,0.40)',
                            boxShadow: '0 0 0 1px rgba(120,113,108,0.18)',
                          }
                        : {
                            background: 'var(--sweet-input)',
                            color: 'var(--sweet-text-muted)',
                            border: '1px solid var(--sweet-border)',
                          }
                    }
                  >
                    <HandThumbDownIcon className="w-4 h-4" />
                    {t('governance.voteAgainst')}
                  </button>

                  {/* ABSTAIN */}
                  <button
                    onClick={() => handleVote(p.id, 'abstain')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={
                      p.userVote === 'abstain'
                        ? {
                            background: 'rgba(120,113,108,0.28)',
                            color: 'var(--sweet-text-secondary)',
                            border: '1px solid rgba(120,113,108,0.40)',
                            boxShadow: '0 0 0 1px rgba(120,113,108,0.18)',
                          }
                        : {
                            background: 'var(--sweet-input)',
                            color: 'var(--sweet-text-muted)',
                            border: '1px solid var(--sweet-border)',
                          }
                    }
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
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--sweet-text)' }}>
          {t('governance.statsTitle')}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: t('governance.stats.totalProposals'), value: totalProposals.toString(), icon: DocumentTextIcon, accent: 'var(--sweet-accent)' },
            { label: t('governance.stats.votesCast'), value: totalVotesCast.toLocaleString(), icon: UserGroupIcon, accent: 'var(--sweet-text-secondary)' },
            { label: t('governance.stats.participation'), value: `${participationRate}%`, icon: CheckBadgeIcon, accent: 'var(--sweet-accent)' },
            { label: t('governance.stats.treasury'), value: treasuryBalance, icon: BanknotesIcon, accent: 'var(--sweet-accent)' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-4 flex flex-col gap-1"
              style={{
                background: 'var(--sweet-card)',
                border: '1px solid var(--sweet-border)',
              }}
            >
              <s.icon className="w-5 h-5" style={{ color: s.accent }} />
              <span className="text-lg font-bold" style={{ color: 'var(--sweet-text)' }}>
                {s.value}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--sweet-text-faint)' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* -------- Past Proposals -------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={10}>
        <button
          onClick={() => setShowPast(!showPast)}
          className="w-full flex items-center justify-between py-3 px-4 rounded-xl text-sm font-semibold transition-colors"
          style={{
            background: 'var(--sweet-card)',
            border: '1px solid var(--sweet-border)',
            color: 'var(--sweet-text)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--sweet-card-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--sweet-card)')}
        >
          <span>{t('governance.pastProposalsTitle')}</span>
          <ChevronDownIcon
            className={`w-5 h-5 transition-transform duration-300 ${showPast ? 'rotate-180' : ''}`}
            style={{ color: 'var(--sweet-text-muted)' }}
          />
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
                  const cfg = STATUS_INLINE[pp.status];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between gap-2 py-3 px-4 rounded-xl"
                      style={{
                        background: 'var(--sweet-card)',
                        border: '1px solid var(--sweet-border)',
                        opacity: 0.85,
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm truncate"
                          style={{ color: 'var(--sweet-text)' }}
                        >
                          {t(pp.titleKey)}
                        </p>
                        <p
                          className="text-[10px] mt-0.5"
                          style={{ color: 'var(--sweet-text-faint)' }}
                        >
                          {t(pp.dateKey)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-xs"
                          style={{ color: 'var(--sweet-text-muted)' }}
                        >
                          {t(pp.resultKey)}
                        </span>
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
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
              className="fixed inset-x-4 top-[10%] z-[70] mx-auto max-w-lg rounded-2xl p-6 shadow-2xl"
              style={{
                background: 'var(--sweet-card)',
                border: '1px solid var(--sweet-border)',
              }}
            >
              {/* Close */}
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 transition-colors"
                style={{ color: 'var(--sweet-text-faint)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--sweet-text)')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--sweet-text-faint)')}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

              <h2
                className="text-lg font-bold mb-4"
                style={{ color: 'var(--sweet-text)' }}
              >
                {t('governance.createProposal')}
              </h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label
                    className="block text-xs mb-1"
                    style={{ color: 'var(--sweet-text-muted)' }}
                  >
                    {t('governance.form.title')}
                  </label>
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={t('governance.form.titlePlaceholder')}
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                    style={{
                      background: 'var(--sweet-input)',
                      border: '1px solid var(--sweet-border)',
                      color: 'var(--sweet-text)',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--sweet-accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--sweet-border)')}
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    className="block text-xs mb-1"
                    style={{ color: 'var(--sweet-text-muted)' }}
                  >
                    {t('governance.form.description')}
                  </label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder={t('governance.form.descriptionPlaceholder')}
                    rows={4}
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none transition-colors"
                    style={{
                      background: 'var(--sweet-input)',
                      border: '1px solid var(--sweet-border)',
                      color: 'var(--sweet-text)',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--sweet-accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--sweet-border)')}
                  />
                </div>

                {/* Category */}
                <div>
                  <label
                    className="block text-xs mb-1"
                    style={{ color: 'var(--sweet-text-muted)' }}
                  >
                    {t('governance.form.category')}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none appearance-none transition-colors"
                    style={{
                      background: 'var(--sweet-input)',
                      border: '1px solid var(--sweet-border)',
                      color: 'var(--sweet-text)',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--sweet-accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--sweet-border)')}
                  >
                    {CATEGORY_KEYS.map((c) => (
                      <option key={c} value={c}>{t(c)}</option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label
                    className="block text-xs mb-1"
                    style={{ color: 'var(--sweet-text-muted)' }}
                  >
                    {t('governance.form.duration')}
                  </label>
                  <div className="flex gap-2">
                    {[3, 5, 7].map((d) => (
                      <button
                        key={d}
                        onClick={() => setFormDuration(d)}
                        className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                        style={
                          formDuration === d
                            ? {
                                background: 'rgba(245,158,11,0.15)',
                                border: '1px solid rgba(245,158,11,0.40)',
                                color: 'var(--sweet-accent)',
                              }
                            : {
                                background: 'var(--sweet-input)',
                                border: '1px solid var(--sweet-border)',
                                color: 'var(--sweet-text-muted)',
                              }
                        }
                      >
                        {d} {t('governance.form.days')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Requirement notice */}
                <p className="text-[11px]" style={{ color: 'var(--sweet-text-faint)' }}>
                  {t('governance.form.minRequirement')}
                </p>

                {/* Submit */}
                <button
                  onClick={handleCreate}
                  disabled={!formTitle.trim()}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--sweet-accent)',
                    color: 'var(--sweet-bg, #0d0b0a)',
                  }}
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
