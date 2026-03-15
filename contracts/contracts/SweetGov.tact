import "@stdlib/deploy";

message Stake {
    amount: Int;
}

contract SweetGov with Deployable {
    owner: Address;
    total_staked: Int as coins;
    
    init(owner: Address) {
        self.owner = owner;
        self.total_staked = 0;
    }

    receive(msg: Stake) {
        self.total_staked = self.total_staked + msg.amount;
        // Logic for governance power calculation would go here
    }

    get fun votingPower(address: Address): Int {
        // Mock: returns 100 for now
        return 100;
    }
}
