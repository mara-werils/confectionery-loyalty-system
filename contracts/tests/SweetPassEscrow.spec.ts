import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import { LoyaltyToken, createJettonContent } from '../wrappers/LoyaltyToken';
import { JettonWallet, Opcodes as JettonOpcodes } from '../wrappers/JettonWallet';
import {
  SweetPassEscrow,
  OrderStatus,
  buildDepositPayload,
} from '../wrappers/SweetPassEscrow';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

const NOTIFICATION_OP = 0x7362d09c; // op::transfer_notification

describe('SweetPassEscrow', () => {
  let loyaltyTokenCode: Cell;
  let jettonWalletCode: Cell;
  let escrowCode: Cell;

  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>; // SWEET master admin + escrow admin
  let customer: SandboxContract<TreasuryContract>;
  let partner: SandboxContract<TreasuryContract>;
  let keeper: SandboxContract<TreasuryContract>; // permissionless refund caller
  let attacker: SandboxContract<TreasuryContract>;

  let sweetMaster: SandboxContract<LoyaltyToken>;
  let escrow: SandboxContract<SweetPassEscrow>;

  // Fixed clock for deterministic deadline tests.
  const NOW = 1_900_000_000;

  beforeAll(async () => {
    loyaltyTokenCode = await compile('LoyaltyToken');
    jettonWalletCode = await compile('JettonWallet');
    escrowCode = await compile('SweetPassEscrow');
  });

  // Helper: open the jetton wallet owned by `owner` under the SWEET master.
  async function sweetWalletOf(owner: Address): Promise<SandboxContract<JettonWallet>> {
    const addr = await sweetMaster.getWalletAddress(owner);
    return blockchain.openContract(JettonWallet.createFromAddress(addr));
  }

  async function balanceOf(owner: Address): Promise<bigint> {
    const wallet = await sweetWalletOf(owner);
    try {
      return await wallet.getBalance();
    } catch {
      return 0n; // wallet not yet deployed => zero balance
    }
  }

  // Helper: customer funds an escrow order by transferring SWEET with an order payload.
  async function deposit(opts: {
    orderId: bigint;
    amount: bigint;
    deadline: number;
    from?: SandboxContract<TreasuryContract>;
  }) {
    const from = opts.from ?? customer;
    const wallet = await sweetWalletOf(from.address);
    return wallet.sendTransfer(from.getSender(), {
      value: toNano('0.3'),
      toAddress: escrow.address,
      amount: opts.amount,
      forwardTonAmount: toNano('0.1'), // must be > 0 to trigger transfer_notification
      forwardPayload: buildDepositPayload({
        orderId: opts.orderId,
        partner: partner.address,
        deadline: opts.deadline,
      }),
    });
  }

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    blockchain.now = NOW;

    deployer = await blockchain.treasury('deployer');
    customer = await blockchain.treasury('customer');
    partner = await blockchain.treasury('partner');
    keeper = await blockchain.treasury('keeper');
    attacker = await blockchain.treasury('attacker');

    // Deploy SWEET master (LoyaltyToken jetton).
    sweetMaster = blockchain.openContract(
      LoyaltyToken.createFromConfig(
        {
          totalSupply: 0n,
          adminAddress: deployer.address,
          content: createJettonContent({ name: 'Sweet', symbol: 'SWEET', decimals: 9 }),
          jettonWalletCode,
        },
        loyaltyTokenCode
      )
    );
    await sweetMaster.sendDeploy(deployer.getSender(), toNano('0.5'));

    // Deploy the escrow, wired to the SWEET master + same wallet code.
    escrow = blockchain.openContract(
      SweetPassEscrow.createFromConfig(
        {
          adminAddress: deployer.address,
          jettonMasterAddress: sweetMaster.address,
          jettonWalletCode,
        },
        escrowCode
      )
    );
    const deployResult = await escrow.sendDeploy(deployer.getSender(), toNano('0.5'));
    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: escrow.address,
      deploy: true,
      success: true,
    });

    // Give the customer 1000 SWEET to spend.
    await sweetMaster.sendMint(deployer.getSender(), {
      value: toNano('0.2'),
      toAddress: customer.address,
      amount: toNano('1000'),
    });
  });

  describe('Deployment', () => {
    it('initializes admin, master and zero orders', async () => {
      expect((await escrow.getAdmin()).toString()).toBe(deployer.address.toString());
      expect((await escrow.getJettonMaster()).toString()).toBe(sweetMaster.address.toString());
      expect(await escrow.getOrderCount()).toBe(0n);
    });

    it('derives an escrow jetton wallet matching the SWEET master', async () => {
      const fromEscrow = await escrow.getEscrowJettonWallet();
      const fromMaster = await sweetMaster.getWalletAddress(escrow.address);
      expect(fromEscrow.toString()).toBe(fromMaster.toString());
    });
  });

  describe('Deposit -> FUNDED', () => {
    it('creates a FUNDED order when SWEET arrives with a valid payload', async () => {
      const deadline = NOW + 3600;
      await deposit({ orderId: 1n, amount: toNano('100'), deadline });

      const order = await escrow.getOrder(1n);
      expect(order.status).toBe(OrderStatus.Funded);
      expect(order.amount).toBe(toNano('100'));
      expect(order.deadline).toBe(deadline);
      expect(order.customer!.toString()).toBe(customer.address.toString());
      expect(order.partner!.toString()).toBe(partner.address.toString());
      expect(await escrow.getOrderCount()).toBe(1n);

      // The escrowed SWEET physically lives in the escrow's own jetton wallet.
      expect(await balanceOf(escrow.address)).toBe(toNano('100'));
      expect(await balanceOf(customer.address)).toBe(toNano('900'));
    });

    it('is idempotent: a duplicate deposit for the same order does not double-count', async () => {
      const deadline = NOW + 3600;
      await deposit({ orderId: 7n, amount: toNano('100'), deadline });
      await deposit({ orderId: 7n, amount: toNano('50'), deadline });

      const order = await escrow.getOrder(7n);
      expect(order.status).toBe(OrderStatus.Funded);
      // Amount stays at the first deposit; count stays 1.
      expect(order.amount).toBe(toNano('100'));
      expect(await escrow.getOrderCount()).toBe(1n);
    });

    it('rejects a spoofed transfer_notification not from the escrow jetton wallet', async () => {
      const body = beginCell()
        .storeUint(NOTIFICATION_OP, 32)
        .storeUint(0, 64)
        .storeCoins(toNano('100'))
        .storeAddress(attacker.address)
        .storeMaybeRef(
          buildDepositPayload({ orderId: 99n, partner: partner.address, deadline: NOW + 3600 })
        )
        .endCell();

      const result = await attacker.send({
        to: escrow.address,
        value: toNano('0.2'),
        body,
      });

      expect(result.transactions).toHaveTransaction({
        from: attacker.address,
        to: escrow.address,
        success: false,
        exitCode: 710, // ERR_NOT_JETTON_WALLET
      });
      expect(await escrow.getOrderCount()).toBe(0n);
    });
  });

  describe('Release (admin)', () => {
    it('pays the partner and marks the order RELEASED', async () => {
      await deposit({ orderId: 1n, amount: toNano('100'), deadline: NOW + 3600 });

      const result = await escrow.sendRelease(deployer.getSender(), {
        value: toNano('0.3'),
        orderId: 1n,
      });
      expect(result.transactions).toHaveTransaction({
        from: deployer.address,
        to: escrow.address,
        success: true,
      });

      const order = await escrow.getOrder(1n);
      expect(order.status).toBe(OrderStatus.Released);
      expect(await balanceOf(partner.address)).toBe(toNano('100'));
      expect(await balanceOf(escrow.address)).toBe(0n);
    });

    it('rejects release from a non-admin', async () => {
      await deposit({ orderId: 1n, amount: toNano('100'), deadline: NOW + 3600 });

      const result = await escrow.sendRelease(attacker.getSender(), {
        value: toNano('0.3'),
        orderId: 1n,
      });
      expect(result.transactions).toHaveTransaction({
        from: attacker.address,
        to: escrow.address,
        success: false,
        exitCode: 73, // ERR_NOT_ADMIN
      });
      expect((await escrow.getOrder(1n)).status).toBe(OrderStatus.Funded);
    });

    it('rejects release of an unknown order', async () => {
      const result = await escrow.sendRelease(deployer.getSender(), {
        value: toNano('0.3'),
        orderId: 404n,
      });
      expect(result.transactions).toHaveTransaction({
        from: deployer.address,
        to: escrow.address,
        success: false,
        exitCode: 720, // ERR_ORDER_NOT_FOUND
      });
    });

    it('rejects a double release (idempotent status guard)', async () => {
      await deposit({ orderId: 1n, amount: toNano('100'), deadline: NOW + 3600 });
      await escrow.sendRelease(deployer.getSender(), { value: toNano('0.3'), orderId: 1n });

      const second = await escrow.sendRelease(deployer.getSender(), {
        value: toNano('0.3'),
        orderId: 1n,
      });
      expect(second.transactions).toHaveTransaction({
        from: deployer.address,
        to: escrow.address,
        success: false,
        exitCode: 721, // ERR_BAD_STATUS
      });
      // Partner was paid exactly once.
      expect(await balanceOf(partner.address)).toBe(toNano('100'));
    });
  });

  describe('Refund (permissionless, deadline-gated)', () => {
    it('rejects refund before the deadline', async () => {
      await deposit({ orderId: 1n, amount: toNano('100'), deadline: NOW + 3600 });

      const result = await escrow.sendRefund(keeper.getSender(), {
        value: toNano('0.3'),
        orderId: 1n,
      });
      expect(result.transactions).toHaveTransaction({
        from: keeper.address,
        to: escrow.address,
        success: false,
        exitCode: 722, // ERR_DEADLINE_NOT_PASSED
      });
      expect((await escrow.getOrder(1n)).status).toBe(OrderStatus.Funded);
    });

    it('lets anyone refund the customer after the deadline', async () => {
      await deposit({ orderId: 1n, amount: toNano('100'), deadline: NOW + 3600 });

      // Fast-forward past the deadline.
      blockchain.now = NOW + 7200;

      const result = await escrow.sendRefund(keeper.getSender(), {
        value: toNano('0.3'),
        orderId: 1n,
      });
      expect(result.transactions).toHaveTransaction({
        from: keeper.address,
        to: escrow.address,
        success: true,
      });

      const order = await escrow.getOrder(1n);
      expect(order.status).toBe(OrderStatus.Refunded);
      // Customer made whole: 900 left after deposit + 100 refunded = 1000.
      expect(await balanceOf(customer.address)).toBe(toNano('1000'));
      expect(await balanceOf(escrow.address)).toBe(0n);
    });

    it('rejects release after a refund (no interleaving)', async () => {
      await deposit({ orderId: 1n, amount: toNano('100'), deadline: NOW + 3600 });
      blockchain.now = NOW + 7200;
      await escrow.sendRefund(keeper.getSender(), { value: toNano('0.3'), orderId: 1n });

      const release = await escrow.sendRelease(deployer.getSender(), {
        value: toNano('0.3'),
        orderId: 1n,
      });
      expect(release.transactions).toHaveTransaction({
        from: deployer.address,
        to: escrow.address,
        success: false,
        exitCode: 721, // ERR_BAD_STATUS
      });
      expect(await balanceOf(partner.address)).toBe(0n);
      expect(await balanceOf(customer.address)).toBe(toNano('1000'));
    });

    it('rejects refund after a release', async () => {
      await deposit({ orderId: 1n, amount: toNano('100'), deadline: NOW + 3600 });
      await escrow.sendRelease(deployer.getSender(), { value: toNano('0.3'), orderId: 1n });

      blockchain.now = NOW + 7200;
      const refund = await escrow.sendRefund(keeper.getSender(), {
        value: toNano('0.3'),
        orderId: 1n,
      });
      expect(refund.transactions).toHaveTransaction({
        from: keeper.address,
        to: escrow.address,
        success: false,
        exitCode: 721, // ERR_BAD_STATUS
      });
      // Partner keeps the funds; customer is not double-paid.
      expect(await balanceOf(partner.address)).toBe(toNano('100'));
      expect(await balanceOf(customer.address)).toBe(toNano('900'));
    });
  });

  describe('Admin rotation', () => {
    it('lets the admin hand over control', async () => {
      const newAdmin = await blockchain.treasury('newAdmin');
      await escrow.sendChangeAdmin(deployer.getSender(), {
        value: toNano('0.05'),
        newAdmin: newAdmin.address,
      });
      expect((await escrow.getAdmin()).toString()).toBe(newAdmin.address.toString());

      // Old admin can no longer release.
      await deposit({ orderId: 1n, amount: toNano('100'), deadline: NOW + 3600 });
      const result = await escrow.sendRelease(deployer.getSender(), {
        value: toNano('0.3'),
        orderId: 1n,
      });
      expect(result.transactions).toHaveTransaction({
        from: deployer.address,
        to: escrow.address,
        success: false,
        exitCode: 73,
      });
    });

    it('rejects admin rotation from a non-admin', async () => {
      const result = await escrow.sendChangeAdmin(attacker.getSender(), {
        value: toNano('0.05'),
        newAdmin: attacker.address,
      });
      expect(result.transactions).toHaveTransaction({
        from: attacker.address,
        to: escrow.address,
        success: false,
        exitCode: 73,
      });
    });
  });
});
