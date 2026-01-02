import logger from '../utils/logger';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import axios from 'axios';

export interface ATSIntegration {
    id: string;
    companyId: string;
    atsProvider: 'greenhouse' | 'lever' | 'workday' | 'icims' | 'taleo' | 'custom';
    apiKey: string;
    webhookSecret?: string;
    webhookUrl?: string;
    settings: ATSSettings;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ATSSettings {
    syncCandidates: boolean;
    syncResults: boolean;
    autoSchedule: boolean;
    notifyOnComplete: boolean;
    customFields: Record<string, string>;
}

export interface CandidateSync {
    candidateId: string;
    atsId: string;
    email: string;
    name: string;
    position: string;
    syncedAt: Date;
}

export interface WebhookPayload {
    event: 'assessment.completed' | 'assessment.started' | 'candidate.invited' | 'session.ended';
    timestamp: Date;
    data: Record<string, any>;
    signature: string;
}

/**
 * ATS Integration Service for recruitment platform connections
 */
export class ATSIntegrationService {
    private static readonly SUPPORTED_ATS = ['greenhouse', 'lever', 'workday', 'icims', 'taleo', 'custom'];

    /**
     * Register a new ATS integration
     */
    static async registerIntegration(
        companyId: string,
        provider: ATSIntegration['atsProvider'],
        apiKey: string,
        settings: ATSSettings = {
            syncCandidates: true,
            syncResults: true,
            autoSchedule: false,
            notifyOnComplete: true,
            customFields: {}
        }
    ): Promise<ATSIntegration> {
        try {
            const id = uuidv4();
            const webhookSecret = crypto.randomBytes(32).toString('hex');
            const now = new Date();

            // Encrypt API key for storage (in production, use proper key management)
            const encryptedKey = this.encryptApiKey(apiKey);

            await pool.query(
                `INSERT INTO ats_integrations 
         (id, company_id, ats_provider, api_key, webhook_secret, settings, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [id, companyId, provider, encryptedKey, webhookSecret, JSON.stringify(settings), true, now, now]
            );

            logger.info(`Registered ${provider} integration for company ${companyId}`);

            return {
                id,
                companyId,
                atsProvider: provider,
                apiKey: '[ENCRYPTED]',
                webhookSecret,
                settings,
                isActive: true,
                createdAt: now,
                updatedAt: now
            };
        } catch (error) {
            logger.error('Error registering ATS integration:', error);
            throw error;
        }
    }

    /**
     * Encrypt API key (simplified - use proper encryption in production)
     */
    private static encryptApiKey(apiKey: string): string {
        const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY || 'default-key-change-in-prod');
        let encrypted = cipher.update(apiKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    /**
     * Decrypt API key
     */
    private static decryptApiKey(encryptedKey: string): string {
        const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY || 'default-key-change-in-prod');
        let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    /**
     * Sync candidate from ATS
     */
    static async syncCandidate(
        integrationId: string,
        atsCandidateId: string
    ): Promise<CandidateSync> {
        try {
            const integration = await this.getIntegration(integrationId);
            const apiKey = this.decryptApiKey(integration.api_key);

            // Fetch candidate from ATS (provider-specific)
            const candidateData = await this.fetchCandidateFromATS(
                integration.ats_provider,
                apiKey,
                atsCandidateId
            );

            // Store or update local candidate record
            const syncId = uuidv4();
            await pool.query(
                `INSERT INTO candidate_syncs (id, integration_id, ats_candidate_id, email, name, position, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (integration_id, ats_candidate_id) 
         DO UPDATE SET email = $4, name = $5, position = $6, synced_at = NOW()`,
                [syncId, integrationId, atsCandidateId, candidateData.email, candidateData.name, candidateData.position]
            );

            logger.info(`Synced candidate ${atsCandidateId} from ${integration.ats_provider}`);

            return {
                candidateId: syncId,
                atsId: atsCandidateId,
                email: candidateData.email,
                name: candidateData.name,
                position: candidateData.position,
                syncedAt: new Date()
            };
        } catch (error) {
            logger.error('Error syncing candidate:', error);
            throw error;
        }
    }

    /**
     * Fetch candidate from ATS (provider-specific implementations)
     */
    private static async fetchCandidateFromATS(
        provider: string,
        apiKey: string,
        candidateId: string
    ): Promise<{ email: string; name: string; position: string }> {
        switch (provider) {
            case 'greenhouse':
                return this.fetchGreenhouseCandidate(apiKey, candidateId);
            case 'lever':
                return this.fetchLeverCandidate(apiKey, candidateId);
            default:
                throw new Error(`Unsupported ATS provider: ${provider}`);
        }
    }

    /**
     * Greenhouse API integration
     */
    private static async fetchGreenhouseCandidate(
        apiKey: string,
        candidateId: string
    ): Promise<{ email: string; name: string; position: string }> {
        try {
            const response = await axios.get(
                `https://harvest.greenhouse.io/v1/candidates/${candidateId}`,
                {
                    headers: {
                        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
                    }
                }
            );

            const candidate = response.data;
            return {
                email: candidate.email_addresses?.[0]?.value || '',
                name: `${candidate.first_name} ${candidate.last_name}`,
                position: candidate.applications?.[0]?.jobs?.[0]?.name || ''
            };
        } catch (error) {
            logger.error('Error fetching Greenhouse candidate:', error);
            throw error;
        }
    }

    /**
     * Lever API integration
     */
    private static async fetchLeverCandidate(
        apiKey: string,
        candidateId: string
    ): Promise<{ email: string; name: string; position: string }> {
        try {
            const response = await axios.get(
                `https://api.lever.co/v1/opportunities/${candidateId}`,
                {
                    headers: {
                        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
                    }
                }
            );

            const opportunity = response.data.data;
            return {
                email: opportunity.contact?.emails?.[0] || '',
                name: opportunity.contact?.name || '',
                position: opportunity.posting?.text || ''
            };
        } catch (error) {
            logger.error('Error fetching Lever candidate:', error);
            throw error;
        }
    }

    /**
     * Push assessment result to ATS
     */
    static async pushResultToATS(
        integrationId: string,
        candidateId: string,
        result: {
            score: number;
            maxScore: number;
            feedback: string[];
            completedAt: Date;
        }
    ): Promise<void> {
        try {
            const integration = await this.getIntegration(integrationId);

            if (!integration.settings.syncResults) {
                logger.info('Result sync disabled for integration');
                return;
            }

            const apiKey = this.decryptApiKey(integration.api_key);

            switch (integration.ats_provider) {
                case 'greenhouse':
                    await this.pushGreenhouseNote(apiKey, candidateId, result);
                    break;
                case 'lever':
                    await this.pushLeverNote(apiKey, candidateId, result);
                    break;
                default:
                    logger.warn(`Result push not implemented for ${integration.ats_provider}`);
            }

            logger.info(`Pushed result to ${integration.ats_provider} for candidate ${candidateId}`);
        } catch (error) {
            logger.error('Error pushing result to ATS:', error);
            throw error;
        }
    }

    /**
     * Push result to Greenhouse as a note
     */
    private static async pushGreenhouseNote(
        apiKey: string,
        candidateId: string,
        result: { score: number; maxScore: number; feedback: string[]; completedAt: Date }
    ): Promise<void> {
        const note = `
**CodeWithMe Assessment Result**
- Score: ${result.score}/${result.maxScore} (${Math.round(result.score / result.maxScore * 100)}%)
- Completed: ${result.completedAt.toISOString()}

**Feedback:**
${result.feedback.map(f => `• ${f}`).join('\n')}
    `.trim();

        await axios.post(
            `https://harvest.greenhouse.io/v1/candidates/${candidateId}/activity_feed/notes`,
            {
                user_id: 'codewithme-integration',
                body: note,
                visibility: 'public'
            },
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    /**
     * Push result to Lever as a note
     */
    private static async pushLeverNote(
        apiKey: string,
        opportunityId: string,
        result: { score: number; maxScore: number; feedback: string[]; completedAt: Date }
    ): Promise<void> {
        const note = {
            value: `CodeWithMe Assessment: ${result.score}/${result.maxScore} (${Math.round(result.score / result.maxScore * 100)}%)`,
            fields: [
                { text: `Completed: ${result.completedAt.toISOString()}` },
                { text: `Feedback: ${result.feedback.join('; ')}` }
            ]
        };

        await axios.post(
            `https://api.lever.co/v1/opportunities/${opportunityId}/notes`,
            note,
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    /**
     * Send webhook to external system
     */
    static async sendWebhook(
        integrationId: string,
        event: WebhookPayload['event'],
        data: Record<string, any>
    ): Promise<void> {
        try {
            const integration = await this.getIntegration(integrationId);

            if (!integration.webhook_url) {
                logger.info('No webhook URL configured');
                return;
            }

            const payload: WebhookPayload = {
                event,
                timestamp: new Date(),
                data,
                signature: this.generateWebhookSignature(integration.webhook_secret, data)
            };

            await axios.post(integration.webhook_url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': payload.signature
                },
                timeout: 10000
            });

            logger.info(`Sent ${event} webhook to ${integration.webhook_url}`);
        } catch (error) {
            logger.error('Error sending webhook:', error);
            // Don't throw - webhooks should fail silently
        }
    }

    /**
     * Generate HMAC signature for webhook
     */
    private static generateWebhookSignature(secret: string, data: any): string {
        return crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(data))
            .digest('hex');
    }

    /**
     * Verify incoming webhook signature
     */
    static verifyWebhookSignature(secret: string, signature: string, body: any): boolean {
        const expected = this.generateWebhookSignature(secret, body);
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    }

    /**
     * Get integration by ID
     */
    private static async getIntegration(integrationId: string): Promise<any> {
        const result = await pool.query(
            `SELECT * FROM ats_integrations WHERE id = $1`,
            [integrationId]
        );

        if (result.rows.length === 0) {
            throw new Error('Integration not found');
        }

        const row = result.rows[0];
        row.settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
        return row;
    }

    /**
     * List integrations for a company
     */
    static async listIntegrations(companyId: string): Promise<ATSIntegration[]> {
        try {
            const result = await pool.query(
                `SELECT * FROM ats_integrations WHERE company_id = $1 ORDER BY created_at DESC`,
                [companyId]
            );

            return result.rows.map(row => ({
                id: row.id,
                companyId: row.company_id,
                atsProvider: row.ats_provider,
                apiKey: '[ENCRYPTED]',
                webhookSecret: row.webhook_secret,
                webhookUrl: row.webhook_url,
                settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
                isActive: row.is_active,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));
        } catch (error) {
            logger.error('Error listing integrations:', error);
            throw error;
        }
    }
}
