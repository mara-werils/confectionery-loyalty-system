import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Confectionery Loyalty System API',
      version: config.app.version,
      description: `
        API documentation for the Confectionery Loyalty System.
        
        This system provides:
        - Partner registration and management
        - Loyalty points earning and redemption
        - Reward catalog and claims
        - Commission distribution
        - Real-time updates via WebSocket
        
        ## Authentication
        Most endpoints require JWT authentication. Use the /auth/login endpoint to obtain a token.
        Include the token in the Authorization header: \`Bearer <token>\`
        
        ## WebSocket Events
        Connect to the WebSocket server for real-time updates:
        - \`subscribe:partner\` - Subscribe to partner-specific updates
        - \`balance:updated\` - Balance change notification
        - \`transaction:created\` - New transaction notification
        - \`reward:claimed\` - Reward claim notification
      `,
      contact: {
        name: 'AITU Diploma Team',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.app.port}${config.app.apiPrefix}`,
        description: 'Development server',
      },
      {
        url: `https://api.example.com${config.app.apiPrefix}`,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Partner: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            walletAddress: { type: 'string' },
            companyName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            tier: { type: 'string', enum: ['BRONZE', 'SILVER', 'GOLD'] },
            status: { type: 'string', enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        LoyaltyPoints: {
          type: 'object',
          properties: {
            balance: { type: 'string' },
            lifetimeEarned: { type: 'string' },
            lifetimeRedeemed: { type: 'string' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            amount: { type: 'string' },
            pointsEarned: { type: 'string' },
            type: { type: 'string', enum: ['PURCHASE', 'BONUS', 'REFERRAL', 'PROMOTION'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Reward: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            pointsRequired: { type: 'string' },
            category: { type: 'string', enum: ['DISCOUNT', 'PRODUCT', 'CASHBACK', 'SPECIAL'] },
            available: { type: 'integer' },
            isActive: { type: 'boolean' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);




