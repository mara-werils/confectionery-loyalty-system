/**
 * TypeScript wrapper for SweetAchievementCollection (Tact-generated ABI shim).
 * Used by the deploy script and optionally by the backend.
 */

import {
  Address,
  beginCell,
  Cell,
  Contract,
  ContractProvider,
  contractAddress,
  Sender,
  SendMode,
  toNano,
  TupleBuilder,
} from '@ton/core';

// ─── Op codes (must match SweetAchievementSBT.tact) ─────────────────────────
export const SBT_OPCODES = {
  mintAchievement: 0x1c8c59d9,
  deploy:          0x946a98b6, // stdlib Deploy opcode
} as const;

// ─── Config ─────────────────────────────────────────────────────────────────

export type SweetAchievementCollectionConfig = {
  owner: Address;
};

/** Encode init storage for the collection (matches Tact `init(owner)`) */
function configToInitCell(config: SweetAchievementCollectionConfig): Cell {
  return beginCell()
    .storeAddress(config.owner) // owner
    .storeUint(0, 64)           // next_item_index
    .endCell();
}

// ─── Wrapper ─────────────────────────────────────────────────────────────────

export class SweetAchievementCollection implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new SweetAchievementCollection(address);
  }

  static async fromInit(owner: Address): Promise<SweetAchievementCollection> {
    // The Tact compiler generates a specific init cell layout.
    // For deployment we use a simplified version that matches the Tact output.
    const data = configToInitCell({ owner });

    // Code cell is filled by Blueprint from the compiled artefact.
    // We use a placeholder here; Blueprint replaces it at deploy time.
    const code = Cell.EMPTY;

    const init = { code, data };
    const address = contractAddress(0, init);
    return new SweetAchievementCollection(address, init);
  }

  // ── Send helpers ───────────────────────────────────────────────────────────

  async send(
    provider: ContractProvider,
    via: Sender,
    args: { value: bigint; bounce?: boolean },
    body: { $$type: 'Deploy'; queryId: bigint } | { $$type: 'MintAchievement'; recipient: Address; achievement_code: string; achievement_name: string }
  ) {
    let bodyCell: Cell;

    if (body.$$type === 'Deploy') {
      bodyCell = beginCell()
        .storeUint(SBT_OPCODES.deploy, 32)
        .storeUint(body.queryId, 64)
        .endCell();
    } else {
      bodyCell = beginCell()
        .storeUint(SBT_OPCODES.mintAchievement, 32)
        .storeAddress(body.recipient)
        .storeRef(beginCell().storeStringTail(body.achievement_code).endCell())
        .storeRef(beginCell().storeStringTail(body.achievement_name).endCell())
        .endCell();
    }

    await provider.internal(via, {
      value: args.value,
      bounce: args.bounce ?? true,
      body: bodyCell,
    });
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  async getCollectionData(provider: ContractProvider): Promise<{
    next_item_index: bigint;
    owner: Address;
    collection_name: string;
  }> {
    const result = await provider.get('collection_data', []);
    const stack = result.stack;
    return {
      next_item_index: stack.readBigNumber(),
      owner:           stack.readAddress(),
      collection_name: stack.readString ? stack.readString() : 'Sweet Loyalty Achievements',
    };
  }

  async getNftAddressByIndex(provider: ContractProvider, index: bigint): Promise<Address> {
    const tb = new TupleBuilder();
    tb.writeNumber(index);
    const result = await provider.get('nft_address_by_index', tb.build());
    return result.stack.readAddress();
  }
}
