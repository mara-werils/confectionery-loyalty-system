import "@stdlib/deploy";

message AddLiquidity {
    amount: Int;
}

message RemoveLiquidity {
    amount: Int;
}

contract SweetLP with Deployable {
    owner: Address;
    total_liquidity: Int as coins;
    
    init(owner: Address) {
        self.owner = owner;
        self.total_liquidity = 0;
    }

    receive(msg: AddLiquidity) {
        self.total_liquidity = self.total_liquidity + msg.amount;
        dump("Liquidity Added");
    }

    receive(msg: RemoveLiquidity) {
        require(self.total_liquidity >= msg.amount, "Insufficient liquidity");
        self.total_liquidity = self.total_liquidity - msg.amount;
        dump("Liquidity Removed");
    }

    get fun get_apy(): Int {
        // Dynamic APY based on prompt: 15-25%
        // Start high to attract users
        return 25; 
    }

    get fun totalLiquidity(): Int {
        return self.total_liquidity;
    }
}
