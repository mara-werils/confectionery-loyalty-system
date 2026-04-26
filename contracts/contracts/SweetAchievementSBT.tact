import "@stdlib/deploy";

// ============================================================================
// MESSAGES  (explicit opcodes so the backend can encode them without the ABI)
// ============================================================================

/// Sent by the collection owner (backend wallet) → collection → SBT item
message(0x1c8c59d9) MintAchievement {
    recipient:        Address;
    achievement_code: String;
    achievement_name: String;
}

/// Standard TEP-62 transfer – blocked on SBT items
message(0x5fcc3d14) NftTransfer {
    query_id:             Int as uint64;
    new_owner:            Address;
    response_destination: Address;
    custom_payload:       Cell?;
    forward_amount:       Int as coins;
    forward_payload:      Slice as remaining;
}

// ============================================================================
// STRUCTS
// ============================================================================

struct SBTItemData {
    initialized:        Bool;
    index:              Int;
    collection_address: Address;
    owner_address:      Address;
    achievement_code:   String;
    achievement_name:   String;
}

struct CollectionData {
    next_item_index: Int;
    owner:           Address;
    collection_name: String;
}

// ============================================================================
// SBT ITEM CONTRACT
// ============================================================================

/// A non-transferable (soul-bound) NFT item.
/// Deployed by the collection; initialised by the first MintAchievement message.
contract SweetSBTItem {
    item_index:         Int as uint64;
    collection_address: Address;
    owner:              Address;
    achievement_code:   String;
    achievement_name:   String;
    initialized:        Bool;

    /// Storage init – only index and collection address are needed at deploy time.
    init(item_index: Int, collection_address: Address) {
        self.item_index         = item_index;
        self.collection_address = collection_address;
        self.owner              = collection_address; // placeholder
        self.achievement_code   = "";
        self.achievement_name   = "";
        self.initialized        = false;
    }

    /// Called once by the parent collection to populate owner + metadata.
    receive(msg: MintAchievement) {
        require(context().sender == self.collection_address, "Only collection can init");
        require(!self.initialized, "Already initialized");

        self.owner            = msg.recipient;
        self.achievement_code = msg.achievement_code;
        self.achievement_name = msg.achievement_name;
        self.initialized      = true;

        // Return excess gas to the collection
        send(SendParameters{
            to:    self.collection_address,
            value: 0,
            mode:  SendRemainingValue + SendIgnoreErrors,
            body:  "SBT_MINTED".asComment()
        });
    }

    /// TEP-62 Transfer is intentionally blocked for soul-bound tokens.
    receive(msg: NftTransfer) {
        throw(132); // error code 132 = not allowed
    }

    get fun get_nft_data(): SBTItemData {
        return SBTItemData{
            initialized:        self.initialized,
            index:              self.item_index,
            collection_address: self.collection_address,
            owner_address:      self.owner,
            achievement_code:   self.achievement_code,
            achievement_name:   self.achievement_name
        };
    }
}

// ============================================================================
// COLLECTION CONTRACT
// ============================================================================

/// Owns and mints SBT items for partner achievements.
/// Only the deployer (backend wallet) can call MintAchievement.
contract SweetAchievementCollection with Deployable {
    owner:           Address;
    next_item_index: Int as uint64;
    collection_name: String;

    init(owner: Address) {
        self.owner           = owner;
        self.next_item_index = 0;
        self.collection_name = "Sweet Loyalty Achievements";
    }

    /// Mint a new SBT item for a partner achievement.
    /// Requires at least 0.08 TON to cover item deploy + gas.
    receive(msg: MintAchievement) {
        require(context().sender == self.owner, "Only owner can mint");
        require(context().value >= ton("0.08"), "Send at least 0.08 TON");

        // Derive the deterministic address for the new item
        let itemInit:    StateInit = initOf SweetSBTItem(self.next_item_index, myAddress());
        let itemAddress: Address   = contractAddress(itemInit);

        // Deploy item and send the initialisation message in one step
        send(SendParameters{
            to:     itemAddress,
            value:  ton("0.05"),
            mode:   SendPayGasSeparately,
            bounce: true,
            code:   itemInit.code,
            data:   itemInit.data,
            body:   MintAchievement{
                recipient:        msg.recipient,
                achievement_code: msg.achievement_code,
                achievement_name: msg.achievement_name
            }.toCell()
        });

        self.next_item_index += 1;
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    get fun collection_data(): CollectionData {
        return CollectionData{
            next_item_index: self.next_item_index,
            owner:           self.owner,
            collection_name: self.collection_name
        };
    }

    /// Returns the address of the SBT item at the given index (pre-computable off-chain too).
    get fun nft_address_by_index(item_index: Int): Address {
        return contractAddress(initOf SweetSBTItem(item_index, myAddress()));
    }
}
