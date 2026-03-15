
import { logger } from '../utils/logger';
import { MintingService } from './minting.service';

interface PaymentPayload {
    transactionId: string;
    amount: number;
    currency: string;
    partnerId: string; // The business receiving payment
    customerId?: string; // Optional: if we can identify the customer
    status: 'success' | 'failed' | 'pending';
    timestamp: number;
}

export class PaymentService {
    private static instance: PaymentService;
    private mintingService: MintingService;

    private constructor() {
        this.mintingService = MintingService.getInstance();
    }

    public static getInstance(): PaymentService {
        if (!PaymentService.instance) {
            PaymentService.instance = new PaymentService();
        }
        return PaymentService.instance;
    }

    /**
     * Simulates a payment webhook coming from Kaspi/Halyk
     */
    public async handlePaymentWebhook(payload: PaymentPayload): Promise<boolean> {
        logger.info(`Processing payment webhook: ${payload.transactionId}`, payload);

        if (payload.status !== 'success') {
            logger.warn(`Payment ${payload.transactionId} failed or pending. Skipping minting.`);
            return false;
        }

        try {
            // Logic: 
            // 1. Verify signature (skipped for mock)
            // 2. Log payment in DB (skipped for MVP init)

            // 3. Trigger Token Minting
            // 1000 KZT = 1000 SWEET (Ratio 1:1 for simplicity in MVP)
            const tokensToMint = payload.amount;

            await this.mintingService.mintTokens(tokensToMint, payload.partnerId, payload.customerId);

            return true;
        } catch (error) {
            logger.error(`Error processing payment webhook:`, error);
            throw error;
        }
    }

    /**
     * Simulator: Manually trigger a "fake" payment event for testing
     */
    public async simulateKaspiPayment(amount: number, partnerId: string, customerId?: string): Promise<any> {
        logger.info(`Simulating Kaspi Payment of ${amount} KZT for partner ${partnerId}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const mockPayload: PaymentPayload = {
            transactionId: `kaspi_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            amount: amount,
            currency: 'KZT',
            partnerId: partnerId,
            customerId: customerId,
            status: 'success',
            timestamp: Date.now()
        };

        return this.handlePaymentWebhook(mockPayload);
    }
}
