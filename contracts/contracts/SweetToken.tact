import "@stdlib/deploy";

// Messages
message Mint {
    amount: Int;
    recipient: Address;
}

message Burn {
    amount: Int;
    response_destination: Address;
}

message TokenTransfer {
    query_id: Int as uint64;
    amount: Int as coins;
    destination: Address;
    response_destination: Address;
    custom_payload: Cell?;
    forward_ton_amount: Int as coins;
    forward_payload: Slice as remaining;
}

contract SweetToken with Deployable {
    // Owner of the contract (The Backend/Master Service)
    owner: Address;
    total_supply: Int as coins;
    
    // Simple mock of Jetton content for MVP
    symbol: String = "SWEET"; 
    decimals: Int = 9;

    init(owner: Address) {
        self.owner = owner;
        self.total_supply = 0;
    }

    // Minting: Only Owner (Backend) can mint upon Fiat Payment
    receive(msg: Mint) {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Only owner can mint");
        
        self.total_supply = self.total_supply + msg.amount;
        
        // In a real Jetton, we would deploy a JettonWallet for the recipient
        // For this MVP Smart Contract Logic: We just track the supply and event
        
        dump("Minted tokens");
    }

    // Burning: Users burn to "Convert to Tenge"
    receive(msg: Burn) {
        let ctx: Context = context();
        // Check balance would happen in JettonWallet in full implementation
        
        self.total_supply = self.total_supply - msg.amount;
        require(self.total_supply >= 0, "Wait, total supply cannot be negative");
        
        // Emit event or send message back to owner to trigger Fiat Payout
        send(SendParameters{
            to: self.owner,
            value: 0,
            mode: SendRemainingValue,
            body: "PayoutInitiated".asComment()
        });
    }

    get fun get_kzt_value(amount: Int): Int {
        // PEG: 1 SWEET = 1 KZT
        return amount; 
    }

    get fun totalSupply(): Int {
        return self.total_supply;
    }
}
