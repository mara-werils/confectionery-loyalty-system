import { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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
  BoltIcon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ProposalStatus = 'ACTIVE' | 'PASSED' | 'REJECTED' | 'PENDING';
type VoteChoice = 'FOR' | 'AGAINST' | 'ABSTAIN';

interface Proposal {
  id: string;
  title: string;
  description: string;
  category: string;
  status: ProposalStatus;
  proposer: { address: string; name: string; tier: string };
  votesFor: string;
  votesAgainst: string;
  votesAbstain: string;
  totalVoters: number;
  quorum: number;
  votingEndsAt: string;
  createdAt: string;
  userVote: VoteChoice | null;
  userVotingPower?: string;
}

interface GovernanceData {
  proposals: Proposal[];
  myVotingPower: string;
  canVote: boolean;
  canPropose: boolean;
}

interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  totalVotesCast: number;
  participationRate: number;
  treasuryBalance: string;
  totalInterventions: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_INLINE: Record<ProposalStatus, { bg: string; color: string }> = {
  ACTIVE:   { bg: 'rgba(245,158,11,0.13)',  color: '#f59e0b' },
  PASSED:   { bg: 'rgba(52,211,153,0.13)',  color: '#34d399' },
  REJECTED: { bg: 'rgba(120,113,108,0.18)', color: 'var(--sweet-text-muted)' },
  PENDING:  { bg: 'rgba(120,113,108,0.14)', color: 'var(--sweet-text-faint)' },
};

const CATEGORIES = [
  { value: 'SYSTEM_PARAMS', label: 'System Parameters' },
  { value: 'NEW_FEATURES',  label: 'New Features' },
  { value: 'PARTNERSHIPS',  label: 'Partnerships' },
  { value: 'OTHER',         label: 'Other' },
];

const CATEGORY_LABELS: Record<string, string> = {
  SYSTEM_PARAMS: 'System Params',
  NEW_FEATURES: 'New Features',
  PARTNERSHIPS: 'Partnerships',
  OTHER: 'Other',
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pct(a: string, b: string): number {
  const fa = Number(a), fb = Number(b);
  const total = fa + fb;
  return total === 0 ? 50 : Math.round((fa / total) * 100);
}

function formatTimeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function formatNumber(n: string | number): string {
  return Number(n).toLocaleString();
}

/* ================================================================ */
/*  Component                                                        */
/* ================================================================ */

export default function Governance() {
  const qc = useQueryClient();

  const [showPast, setShowPast] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('SYSTEM_PARAMS');
  const [formDuration, setFormDuration] = useState(7);
  const [votingProposalId, setVotingProposalId] = useState<string | null>(null);

  /* ---- Data fetching ---- */
  const { data: govData, isLoading } = useQuery<GovernanceData>({
    queryKey: ['governance', 'proposals'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.governance.getProposals().then((r: any) => r.data),
    refetchInterval: 15000,
  });

  const { data: statsData } = useQuery<GovernanceStats>({
    queryKey: ['governance', 'stats'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.governance.getStats().then((r: any) => r.data),
    refetchInterval: 30000,
  });

  /* ---- Vote mutation ---- */
  const voteMutation = useMutation({
    mutationFn: ({ proposalId, choice }: { proposalId: string; choice: VoteChoice }) =>
      api.governance.vote(proposalId, choice),
    onMutate: ({ proposalId }) => setVotingProposalId(proposalId),
    onSuccess: () => {
      toast.success('Vote recorded on-chain!');
      qc.invalidateQueries({ queryKey: ['governance'] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.error(err?.serverMessage || 'Failed to cast vote');
    },
    onSettled: () => setVotingProposalId(null),
  });

  /* ---- Create proposal mutation ---- */
  const createMutation = useMutation({
    mutationFn: () =>
      api.governance.createProposal({
        title: formTitle.trim(),
        description: formDesc.trim(),
        category: formCategory,
        durationDays: formDuration,
      }),
    onSuccess: () => {
      toast.success('Proposal created! Voting is now open.');
      setModalOpen(false);
      setFormTitle('');
      setFormDesc('');
      qc.invalidateQueries({ queryKey: ['governance'] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.error(err?.serverMessage || 'Failed to create proposal');
    },
  });

  /* ---- Derived ---- */
  const activeProposals = govData?.proposals.filter(p => p.status === 'ACTIVE') ?? [];
  const pastProposals   = govData?.proposals.filter(p => p.status !== 'ACTIVE') ?? [];
  const myVotingPower   = formatNumber(govData?.myVotingPower ?? '0');

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
          DAO Governance
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--sweet-text-muted)' }}>
          Token-weighted voting — your SWEET balance = your voice
        </p>
      </motion.div>

      {/* -------- Voting Power Card -------- */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="show" custom={1}
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, var(--sweet-card) 60%)',
          border: '1px solid rgba(245,158,11,0.22)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--sweet-text-muted)' }}>
              Your Voting Power
            </p>
            <p className="text-3xl font-bold mt-1" style={{ color: 'var(--sweet-text)' }}>
              {myVotingPower}{' '}
              <span className="text-base font-medium" style={{ color: 'var(--sweet-accent)' }}>
                SWEET
              </span>
            </p>
            <div className="flex items-center gap-2 mt-1">
              {govData?.canVote ? (
                <span className="flex items-center gap-1 text-xs" style={{ color: '#34d399' }}>
                  <CheckBadgeIcon className="w-3.5 h-3.5" /> Can vote
                </span>
              ) : (
                <span className="text-xs" style={{ color: 'var(--sweet-text-faint)' }}>
                  Need 100+ SWEET to vote
                </span>
              )}
              {govData?.canPropose && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--sweet-accent)' }}>
                  <BoltIcon className="w-3.5 h-3.5" /> Can propose
                </span>
              )}
            </div>
          </div>
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}>
            <FireIcon className="w-8 h-8" style={{ color: 'var(--sweet-accent)' }} />
          </div>
        </div>
      </motion.div>

      {/* -------- Create Proposal -------- */}
      {govData?.canPropose && (
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
            Create Proposal
          </button>
        </motion.div>
      )}

      {/* -------- Active Proposals -------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--sweet-text)' }}>
          Active Proposals
          {activeProposals.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--sweet-accent)' }}>
              {activeProposals.length}
            </span>
          )}
        </h2>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1].map(i => (
            <div key={i} className="rounded-2xl p-5 h-48 animate-pulse"
              style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {activeProposals.map((p, idx) => {
            const forPct  = pct(p.votesFor, p.votesAgainst);
            const isVoting = votingProposalId === p.id;

            return (
              <motion.div
                key={p.id}
                variants={fadeUp} initial="hidden" animate="show" custom={4 + idx}
                className="rounded-2xl p-5 space-y-4"
                style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md"
                        style={{ background: 'rgba(245,158,11,0.10)', color: 'var(--sweet-accent)' }}>
                        {CATEGORY_LABELS[p.category] ?? p.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--sweet-text)' }}>
                      {p.title}
                    </h3>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--sweet-text-faint)' }}>
                      {p.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={STATUS_INLINE[p.status]}>
                    {p.status}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]"
                  style={{ color: 'var(--sweet-text-faint)' }}>
                  <span>By <span className="font-mono" style={{ color: 'var(--sweet-text-muted)' }}>{p.proposer.address}</span></span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5" />
                    {formatTimeLeft(p.votingEndsAt)}
                  </span>
                  <span>{p.totalVoters} voters · {formatNumber((BigInt(p.votesFor) + BigInt(p.votesAgainst) + BigInt(p.votesAbstain)).toString())} SWEET cast</span>
                </div>

                {/* Voting bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span style={{ color: '#34d399' }}>FOR {forPct}%</span>
                    <span style={{ color: 'var(--sweet-text-muted)' }}>AGAINST {100 - forPct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden flex"
                    style={{ background: 'var(--sweet-input)' }}>
                    <motion.div className="rounded-l-full" style={{ background: '#34d399' }}
                      initial={{ width: 0 }} animate={{ width: `${forPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }} />
                    <motion.div className="rounded-r-full" style={{ background: 'rgba(120,113,108,0.5)' }}
                      initial={{ width: 0 }} animate={{ width: `${100 - forPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }} />
                  </div>
                </div>

                {/* Vote buttons */}
                {govData?.canVote && (
                  <div className="flex gap-2">
                    {(['FOR', 'AGAINST', 'ABSTAIN'] as VoteChoice[]).map(choice => {
                      const isChosen = p.userVote === choice;
                      const Icon = choice === 'FOR' ? HandThumbUpIcon
                        : choice === 'AGAINST' ? HandThumbDownIcon : MinusCircleIcon;
                      return (
                        <button
                          key={choice}
                          onClick={() => voteMutation.mutate({ proposalId: p.id, choice })}
                          disabled={isVoting}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                          style={isChosen ? {
                            background: choice === 'FOR' ? 'rgba(52,211,153,0.15)' : 'rgba(120,113,108,0.22)',
                            color: choice === 'FOR' ? '#34d399' : 'var(--sweet-text-secondary)',
                            border: `1px solid ${choice === 'FOR' ? 'rgba(52,211,153,0.40)' : 'rgba(120,113,108,0.40)'}`,
                          } : {
                            background: 'var(--sweet-input)',
                            color: 'var(--sweet-text-muted)',
                            border: '1px solid var(--sweet-border)',
                          }}
                        >
                          {isVoting ? (
                            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                )}

                {p.userVote && (
                  <p className="text-[11px] text-center" style={{ color: 'var(--sweet-text-faint)' }}>
                    You voted <span style={{ color: 'var(--sweet-accent)' }}>{p.userVote}</span> with{' '}
                    {formatNumber(p.userVotingPower ?? '0')} SWEET
                  </p>
                )}
              </motion.div>
            );
          })}

          {activeProposals.length === 0 && (
            <div className="rounded-2xl p-8 text-center"
              style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
              <ShieldCheckIcon className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--sweet-text-faint)' }} />
              <p className="text-sm" style={{ color: 'var(--sweet-text-muted)' }}>No active proposals right now</p>
            </div>
          )}
        </div>
      )}

      {/* -------- DAO Stats -------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={9}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--sweet-text)' }}>
          DAO Statistics
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Proposals', value: (statsData?.totalProposals ?? '—').toString(), icon: DocumentTextIcon },
            { label: 'Votes Cast', value: (statsData?.totalVotesCast ?? 0).toLocaleString(), icon: UserGroupIcon },
            { label: 'Participation', value: `${statsData?.participationRate ?? 0}%`, icon: CheckBadgeIcon },
            { label: 'SWEET in DAO', value: statsData ? formatNumber(statsData.treasuryBalance) : '—', icon: BanknotesIcon },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 flex flex-col gap-1"
              style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}>
              <s.icon className="w-5 h-5" style={{ color: 'var(--sweet-accent)' }} />
              <span className="text-lg font-bold" style={{ color: 'var(--sweet-text)' }}>{s.value}</span>
              <span className="text-[11px]" style={{ color: 'var(--sweet-text-faint)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* -------- Past Proposals -------- */}
      {pastProposals.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={10}>
          <button
            onClick={() => setShowPast(!showPast)}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--sweet-card-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--sweet-card)')}
          >
            <span>Past Proposals ({pastProposals.length})</span>
            <ChevronDownIcon
              className={`w-5 h-5 transition-transform duration-300 ${showPast ? 'rotate-180' : ''}`}
              style={{ color: 'var(--sweet-text-muted)' }}
            />
          </button>

          <AnimatePresence>
            {showPast && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 mt-3">
                  {pastProposals.map((pp, i) => {
                    const cfg = STATUS_INLINE[pp.status];
                    return (
                      <motion.div
                        key={pp.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between gap-2 py-3 px-4 rounded-xl"
                        style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)', opacity: 0.85 }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate" style={{ color: 'var(--sweet-text)' }}>{pp.title}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--sweet-text-faint)' }}>
                            {new Date(pp.createdAt).toLocaleDateString()} · {pp.totalVoters} voters
                          </p>
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {pp.status}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ================================================================ */}
      {/*  Create Proposal Modal                                           */}
      {/* ================================================================ */}
      <AnimatePresence>
        {modalOpen && (
          <Fragment>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-4 top-[10%] z-[70] mx-auto max-w-lg rounded-2xl p-6 shadow-2xl"
              style={{ background: 'var(--sweet-card)', border: '1px solid var(--sweet-border)' }}
            >
              <button onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 transition-colors"
                style={{ color: 'var(--sweet-text-faint)' }}>
                <XMarkIcon className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--sweet-text)' }}>
                Create Governance Proposal
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--sweet-text-muted)' }}>Title</label>
                  <input
                    value={formTitle} onChange={e => setFormTitle(e.target.value)}
                    placeholder="e.g. Increase cashback rate to 15%"
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text)' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--sweet-accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--sweet-border)')}
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--sweet-text-muted)' }}>Description</label>
                  <textarea
                    value={formDesc} onChange={e => setFormDesc(e.target.value)}
                    placeholder="Explain the rationale and expected impact..."
                    rows={4}
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none"
                    style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text)' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--sweet-accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--sweet-border)')}
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--sweet-text-muted)' }}>Category</label>
                  <select
                    value={formCategory} onChange={e => setFormCategory(e.target.value)}
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none appearance-none"
                    style={{ background: 'var(--sweet-input)', border: '1px solid var(--sweet-border)', color: 'var(--sweet-text)' }}
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--sweet-text-muted)' }}>Voting Duration</label>
                  <div className="flex gap-2">
                    {[3, 5, 7].map(d => (
                      <button key={d} onClick={() => setFormDuration(d)}
                        className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                        style={formDuration === d ? {
                          background: 'rgba(245,158,11,0.15)',
                          border: '1px solid rgba(245,158,11,0.40)',
                          color: 'var(--sweet-accent)',
                        } : {
                          background: 'var(--sweet-input)',
                          border: '1px solid var(--sweet-border)',
                          color: 'var(--sweet-text-muted)',
                        }}>
                        {d} days
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px]" style={{ color: 'var(--sweet-text-faint)' }}>
                  Requires 1,000+ SWEET to create a proposal. Quorum: 60% of circulating supply.
                </p>

                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!formTitle.trim() || createMutation.isPending}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'var(--sweet-accent)', color: 'var(--sweet-bg, #0d0b0a)' }}
                >
                  {createMutation.isPending ? 'Submitting...' : 'Submit Proposal'}
                </button>
              </div>
            </motion.div>
          </Fragment>
        )}
      </AnimatePresence>
    </div>
  );
}
