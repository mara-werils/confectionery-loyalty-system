import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { successResponse } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { io } from '../index';

const router = Router();

// Voting power = SWEET token balance (minimum 100 to participate)
const MIN_VOTING_POWER = BigInt(100);

// Minimum balance to CREATE a proposal (SILVER/GOLD tier effectively)
const MIN_PROPOSAL_POWER = BigInt(1000);

/** GET /governance/proposals — list all proposals */
router.get('/proposals', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.user!.id;

    const proposals = await prisma.proposal.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        proposer: { select: { walletAddress: true, companyName: true, tier: true } },
        _count: { select: { votes: true } },
      },
    });

    // Get current user's votes for these proposals
    const myVotes = await prisma.vote.findMany({
      where: { partnerId, proposalId: { in: proposals.map(p => p.id) } },
      select: { proposalId: true, choice: true, votingPower: true },
    });
    const myVoteMap = new Map(myVotes.map(v => [v.proposalId, v]));

    // Get user's voting power
    const loyaltyPoints = await prisma.loyaltyPoints.findUnique({ where: { partnerId } });
    const votingPower = loyaltyPoints?.balance ?? BigInt(0);

    const data = proposals.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      status: p.status,
      proposer: {
        address: p.proposer.walletAddress.slice(0, 6) + '...' + p.proposer.walletAddress.slice(-4),
        name: p.proposer.companyName,
        tier: p.proposer.tier,
      },
      votesFor: p.votesFor.toString(),
      votesAgainst: p.votesAgainst.toString(),
      votesAbstain: p.votesAbstain.toString(),
      totalVoters: p.totalVoters,
      quorum: p.quorum,
      votingEndsAt: p.votingEndsAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
      userVote: myVoteMap.get(p.id)?.choice ?? null,
      userVotingPower: myVoteMap.get(p.id)?.votingPower.toString() ?? null,
    }));

    return successResponse(res, {
      proposals: data,
      myVotingPower: votingPower.toString(),
      canVote: votingPower >= MIN_VOTING_POWER,
      canPropose: votingPower >= MIN_PROPOSAL_POWER,
    });
  } catch (error) {
    return next(error);
  }
});

/** POST /governance/proposals — create a new proposal */
router.post('/proposals', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.user!.id;
    const { title, description, category, durationDays = 7 } = req.body;

    if (!title?.trim() || !description?.trim()) {
      throw new AppError('Title and description are required', 400, 'VALIDATION_ERROR');
    }

    // Check voting power
    const loyaltyPoints = await prisma.loyaltyPoints.findUnique({ where: { partnerId } });
    const votingPower = loyaltyPoints?.balance ?? BigInt(0);
    if (votingPower < MIN_PROPOSAL_POWER) {
      throw new AppError(`Need at least ${MIN_PROPOSAL_POWER} SWEET to create a proposal`, 403, 'INSUFFICIENT_POWER');
    }

    const votingEndsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const proposal = await prisma.proposal.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category || 'OTHER',
        status: 'ACTIVE',
        proposerId: partnerId,
        votingEndsAt,
      },
    });

    // Broadcast to live dashboard
    io.emit('governance:proposal_created', {
      id: proposal.id,
      title: proposal.title,
      category: proposal.category,
      timestamp: new Date().toISOString(),
    });

    res.status(201);
    return successResponse(res, { proposal });
  } catch (error) {
    return next(error);
  }
});

/** POST /governance/proposals/:id/vote — cast a vote */
router.post('/proposals/:id/vote', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.user!.id;
    const proposalId = req.params.id!;
    const { choice } = req.body; // 'FOR' | 'AGAINST' | 'ABSTAIN'

    if (!['FOR', 'AGAINST', 'ABSTAIN'].includes(choice)) {
      throw new AppError('Invalid vote choice', 400, 'VALIDATION_ERROR');
    }

    const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new AppError('Proposal not found', 404, 'NOT_FOUND');
    if (proposal.status !== 'ACTIVE') throw new AppError('Voting is not active on this proposal', 400, 'NOT_ACTIVE');
    if (new Date() > proposal.votingEndsAt) throw new AppError('Voting period has ended', 400, 'VOTING_ENDED');

    // Get voting power (current SWEET balance)
    const loyaltyPoints = await prisma.loyaltyPoints.findUnique({ where: { partnerId } });
    const votingPower = loyaltyPoints?.balance ?? BigInt(0);
    if (votingPower < MIN_VOTING_POWER) {
      throw new AppError(`Need at least ${MIN_VOTING_POWER} SWEET to vote`, 403, 'INSUFFICIENT_POWER');
    }

    // Upsert vote (allows changing vote)
    const existingVote = await prisma.vote.findUnique({
      where: { proposalId_partnerId: { proposalId, partnerId } },
    });

    if (existingVote) {
      // Undo old vote counts
      const undoField = existingVote.choice === 'FOR' ? 'votesFor'
        : existingVote.choice === 'AGAINST' ? 'votesAgainst' : 'votesAbstain';

      await prisma.$transaction([
        prisma.proposal.update({
          where: { id: proposalId },
          data: {
            [undoField]: { decrement: existingVote.votingPower },
            totalVoters: { decrement: 1 },
          },
        }),
        prisma.vote.update({
          where: { proposalId_partnerId: { proposalId, partnerId } },
          data: { choice, votingPower },
        }),
      ]);
    } else {
      await prisma.vote.create({
        data: { proposalId, partnerId, choice, votingPower },
      });
    }

    // Apply new vote counts
    const applyField = choice === 'FOR' ? 'votesFor'
      : choice === 'AGAINST' ? 'votesAgainst' : 'votesAbstain';

    const updated = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        [applyField]: { increment: votingPower },
        totalVoters: existingVote ? { increment: 1 } : { increment: 1 },
      },
    });

    // Auto-resolve: check if voting period ended (for real-time)
    await checkAndFinalizeProposal(proposalId);

    // Broadcast live update
    io.emit('governance:vote_cast', {
      proposalId,
      choice,
      votingPower: votingPower.toString(),
      totalVoters: updated.totalVoters,
      timestamp: new Date().toISOString(),
    });

    return successResponse(res, {
      choice,
      votingPower: votingPower.toString(),
      proposal: {
        id: updated.id,
        votesFor: updated.votesFor.toString(),
        votesAgainst: updated.votesAgainst.toString(),
        votesAbstain: updated.votesAbstain.toString(),
        totalVoters: updated.totalVoters,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/** GET /governance/stats — overall DAO stats */
router.get('/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalProposals, activeProposals, totalVotes, totalInterventions] = await Promise.all([
      prisma.proposal.count(),
      prisma.proposal.count({ where: { status: 'ACTIVE' } }),
      prisma.vote.count(),
      prisma.churnIntervention.count(),
    ]);

    // Participation = unique voters / total active partners
    const [uniqueVoters, totalPartners] = await Promise.all([
      prisma.vote.groupBy({ by: ['partnerId'] }).then(r => r.length),
      prisma.partner.count({ where: { status: 'ACTIVE' } }),
    ]);

    // Treasury = sum of all SWEET in circulation
    const treasury = await prisma.loyaltyPoints.aggregate({ _sum: { balance: true } });
    const treasuryTotal = treasury._sum.balance ?? BigInt(0);

    return successResponse(res, {
      totalProposals,
      activeProposals,
      totalVotesCast: totalVotes,
      participationRate: totalPartners > 0 ? Math.round((uniqueVoters / totalPartners) * 100) : 0,
      treasuryBalance: treasuryTotal.toString(),
      totalInterventions,
    });
  } catch (error) {
    return next(error);
  }
});

/** Finalize expired proposals (called after each vote + by cron) */
export async function checkAndFinalizeProposal(proposalId: string) {
  const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
  if (!proposal || proposal.status !== 'ACTIVE') return;
  if (new Date() < proposal.votingEndsAt) return;

  const totalVotes = Number(proposal.votesFor) + Number(proposal.votesAgainst) + Number(proposal.votesAbstain);
  const totalSupply = await prisma.loyaltyPoints.aggregate({ _sum: { balance: true } });
  const supply = Number(totalSupply._sum.balance ?? BigInt(1));
  const quorumReached = (totalVotes / supply) * 100 >= proposal.quorum;
  const passed = quorumReached && Number(proposal.votesFor) > Number(proposal.votesAgainst);

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: passed ? 'PASSED' : 'REJECTED' },
  });
}

export default router;
