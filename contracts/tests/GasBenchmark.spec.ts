import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { compile } from '@ton/blueprint';
import {
  PartnerRegistry,
  PartnerTier,
  PartnerStatus,
} from '../wrappers/PartnerRegistry';
import {
  LoyaltyToken,
  createJettonContent,
} from '../wrappers/LoyaltyToken';

type BenchmarkRow = {
  operation: string;
  expectedOutcome: 'accepted' | 'rejected';
  transactions: number;
  totalFeesNanoTon: string;
  totalFeesTon: string;
  emulatorMs: number;
};

type TxLike = {
  totalFees?: { coins: bigint };
  endStatus?: string;
};

type TxResultLike = {
  transactions: TxLike[];
};

function feesNanoTon(result: TxResultLike): bigint {
  return result.transactions.reduce((sum, tx) => sum + (tx.totalFees?.coins ?? 0n), 0n);
}

function toTon(nanoTon: bigint): string {
  const whole = nanoTon / 1_000_000_000n;
  const fraction = (nanoTon % 1_000_000_000n).toString().padStart(9, '0');
  return `${whole}.${fraction}`;
}

async function measure(
  operation: string,
  run: () => Promise<TxResultLike>,
  expectedOutcome: BenchmarkRow['expectedOutcome'] = 'accepted'
): Promise<BenchmarkRow> {
  const started = performance.now();
  const result = await run();
  const emulatorMs = performance.now() - started;
  const totalFeesNanoTon = feesNanoTon(result);

  return {
    operation,
    expectedOutcome,
    transactions: result.transactions.length,
    totalFeesNanoTon: totalFeesNanoTon.toString(),
    totalFeesTon: toTon(totalFeesNanoTon),
    emulatorMs: Number(emulatorMs.toFixed(2)),
  };
}

describe('TON gas and execution benchmark', () => {
  it('reports sandbox transaction fees for thesis evaluation', async () => {
    const partnerRegistryCode = await compile('PartnerRegistry');
    const loyaltyTokenCode = await compile('LoyaltyToken');
    const jettonWalletCode = await compile('JettonWallet');

    const blockchain = await Blockchain.create();
    const deployer = await blockchain.treasury('deployer');
    const partner = await blockchain.treasury('partner');
    const attacker = await blockchain.treasury('attacker');
    const customer = await blockchain.treasury('customer');

    const partnerRegistry: SandboxContract<PartnerRegistry> = blockchain.openContract(
      PartnerRegistry.createFromConfig(
        {
          adminAddress: deployer.address,
        },
        partnerRegistryCode
      )
    );

    const loyaltyToken: SandboxContract<LoyaltyToken> = blockchain.openContract(
      LoyaltyToken.createFromConfig(
        {
          totalSupply: 0n,
          adminAddress: deployer.address,
          content: createJettonContent({
            name: 'Loyalty Points',
            symbol: 'LOYAL',
            description: 'Confectionery Loyalty System Points',
            decimals: 9,
          }),
          jettonWalletCode,
        },
        loyaltyTokenCode
      )
    );

    const rows: BenchmarkRow[] = [];

    rows.push(await measure(
      'deploy_partner_registry',
      () => partnerRegistry.sendDeploy(deployer.getSender(), toNano('0.5'))
    ));

    rows.push(await measure(
      'register_partner',
      () => partnerRegistry.sendRegisterPartner(deployer.getSender(), {
          value: toNano('0.1'),
          partnerAddress: partner.address,
          tier: PartnerTier.Silver,
          kycHash: BigInt('0x' + 'a'.repeat(64)),
        })
    ));

    rows.push(await measure(
      'update_partner_status',
      () => partnerRegistry.sendUpdatePartnerStatus(deployer.getSender(), {
          value: toNano('0.1'),
          partnerAddress: partner.address,
          newStatus: PartnerStatus.Suspended,
        })
    ));

    rows.push(await measure(
      'record_partner_earning',
      () => partnerRegistry.sendRecordEarning(deployer.getSender(), {
          value: toNano('0.1'),
          partnerAddress: partner.address,
          amount: toNano('100'),
        })
    ));

    rows.push(await measure(
      'unauthorized_partner_registration',
      () => partnerRegistry.sendRegisterPartner(attacker.getSender(), {
          value: toNano('0.1'),
          partnerAddress: customer.address,
          tier: PartnerTier.Bronze,
          kycHash: 0n,
        }),
      'rejected'
    ));

    rows.push(await measure(
      'deploy_loyalty_token',
      () => loyaltyToken.sendDeploy(deployer.getSender(), toNano('0.5'))
    ));

    rows.push(await measure(
      'mint_loyalty_tokens_first_wallet',
      () => loyaltyToken.sendMint(deployer.getSender(), {
          value: toNano('0.1'),
          toAddress: customer.address,
          amount: toNano('1000'),
        })
    ));

    rows.push(await measure(
      'unauthorized_mint_attempt',
      () => loyaltyToken.sendMint(attacker.getSender(), {
          value: toNano('0.1'),
          toAddress: customer.address,
          amount: toNano('1000'),
        }),
      'rejected'
    ));

    console.log(`GAS_BENCHMARK_JSON=${JSON.stringify(rows)}`);

    expect(rows.length).toBe(8);
    expect(rows.every((row) => BigInt(row.totalFeesNanoTon) > 0n)).toBe(true);
  }, 60000);
});
