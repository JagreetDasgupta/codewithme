import logger from '../utils/logger';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import nodemailer from 'nodemailer';

export interface Notification {
    id: string;
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    channel: 'in-app' | 'email' | 'slack' | 'webhook';
    title: string;
    message: string;
    data?: Record<string, any>;
    read: boolean;
    createdAt: Date;
    sentAt?: Date;
    error?: string;
}

export interface NotificationSettings {
    userId: string;
    emailEnabled: boolean;
    emailAddress?: string;
    slackEnabled: boolean;
    slackWebhook?: string;
    webhookEnabled: boolean;
    webhookUrl?: string;
    inAppEnabled: boolean;
    preferences: {
        sessionStart: boolean;
        sessionEnd: boolean;
        assessmentComplete: boolean;
        candidateSubmit: boolean;
        dailyDigest: boolean;
    };
}

interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
}

/**
 * Notification Service for multi-channel alerts
 */
export class NotificationService {
    private static emailTransporter: nodemailer.Transporter | null = null;

    /**
     * Initialize email transporter
     */
    static async initialize() {
        const emailConfig: EmailConfig = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || ''
            },
            from: process.env.SMTP_FROM || 'CodeWithMe <noreply@codewithme.io>'
        };

        if (emailConfig.auth.user && emailConfig.auth.pass) {
            this.emailTransporter = nodemailer.createTransport({
                host: emailConfig.host,
                port: emailConfig.port,
                secure: emailConfig.secure,
                auth: emailConfig.auth
            });

            try {
                await this.emailTransporter.verify();
                logger.info('Email transporter initialized successfully');
            } catch (error) {
                logger.warn('Email transporter verification failed:', error);
                this.emailTransporter = null;
            }
        }
    }

    /**
     * Send notification to user
     */
    static async notify(
        userId: string,
        title: string,
        message: string,
        options: {
            type?: Notification['type'];
            channel?: Notification['channel'];
            data?: Record<string, any>;
        } = {}
    ): Promise<Notification> {
        const type = options.type || 'info';
        const channel = options.channel || 'in-app';

        const notification: Notification = {
            id: uuidv4(),
            userId,
            type,
            channel,
            title,
            message,
            data: options.data,
            read: false,
            createdAt: new Date()
        };

        try {
            // Store in database
            await this.storeNotification(notification);

            // Send through appropriate channel
            switch (channel) {
                case 'in-app':
                    // Already stored, will be fetched by frontend
                    break;
                case 'email':
                    await this.sendEmail(userId, title, message, type);
                    notification.sentAt = new Date();
                    break;
                case 'slack':
                    await this.sendSlack(userId, title, message, type);
                    notification.sentAt = new Date();
                    break;
                case 'webhook':
                    await this.sendWebhook(userId, notification);
                    notification.sentAt = new Date();
                    break;
            }

            logger.info(`Notification sent: ${channel} to ${userId}`);
            return notification;
        } catch (error: any) {
            notification.error = error.message;
            logger.error(`Failed to send notification:`, error);
            return notification;
        }
    }

    /**
     * Send notification to multiple channels
     */
    static async notifyMultiple(
        userId: string,
        title: string,
        message: string,
        channels: Notification['channel'][],
        type: Notification['type'] = 'info',
        data?: Record<string, any>
    ): Promise<Notification[]> {
        const notifications = await Promise.all(
            channels.map(channel =>
                this.notify(userId, title, message, { type, channel, data })
            )
        );
        return notifications;
    }

    /**
     * Store notification in database
     */
    private static async storeNotification(notification: Notification): Promise<void> {
        await pool.query(
            `INSERT INTO notifications 
       (id, user_id, type, channel, title, message, data, read, created_at, sent_at, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                notification.id,
                notification.userId,
                notification.type,
                notification.channel,
                notification.title,
                notification.message,
                JSON.stringify(notification.data || {}),
                notification.read,
                notification.createdAt,
                notification.sentAt || null,
                notification.error || null
            ]
        );
    }

    /**
     * Send email notification
     */
    private static async sendEmail(
        userId: string,
        title: string,
        message: string,
        type: Notification['type']
    ): Promise<void> {
        if (!this.emailTransporter) {
            throw new Error('Email not configured');
        }

        // Get user email
        const settings = await this.getUserSettings(userId);
        if (!settings?.emailEnabled || !settings.emailAddress) {
            throw new Error('Email notifications disabled for user');
        }

        const colors = {
            info: '#3b82f6',
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444'
        };

        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${colors[type]}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
            .footer { padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">${title}</h1>
            </div>
            <div class="content">
              <p>${message}</p>
            </div>
            <div class="footer">
              <p>CodeWithMe - Collaborative Coding Platform</p>
              <p><a href="${process.env.FRONTEND_URL}">Open Dashboard</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

        await this.emailTransporter.sendMail({
            from: process.env.SMTP_FROM || 'CodeWithMe <noreply@codewithme.io>',
            to: settings.emailAddress,
            subject: `[CodeWithMe] ${title}`,
            html
        });
    }

    /**
     * Send Slack notification
     */
    private static async sendSlack(
        userId: string,
        title: string,
        message: string,
        type: Notification['type']
    ): Promise<void> {
        const settings = await this.getUserSettings(userId);
        if (!settings?.slackEnabled || !settings.slackWebhook) {
            throw new Error('Slack notifications disabled for user');
        }

        const colors: Record<string, string> = {
            info: '#3b82f6',
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444'
        };

        await axios.post(settings.slackWebhook, {
            attachments: [
                {
                    color: colors[type],
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `*${title}*\n${message}`
                            }
                        },
                        {
                            type: 'context',
                            elements: [
                                {
                                    type: 'mrkdwn',
                                    text: `📧 Sent from CodeWithMe`
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    }

    /**
     * Send webhook notification
     */
    private static async sendWebhook(
        userId: string,
        notification: Notification
    ): Promise<void> {
        const settings = await this.getUserSettings(userId);
        if (!settings?.webhookEnabled || !settings.webhookUrl) {
            throw new Error('Webhook notifications disabled for user');
        }

        await axios.post(settings.webhookUrl, {
            event: 'notification',
            notification,
            timestamp: new Date().toISOString()
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-CodeWithMe-Signature': 'webhook-signature' // Add proper HMAC in production
            },
            timeout: 5000
        });
    }

    /**
     * Get user notification settings
     */
    static async getUserSettings(userId: string): Promise<NotificationSettings | null> {
        try {
            const result = await pool.query(
                `SELECT * FROM notification_settings WHERE user_id = $1`,
                [userId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0];
            return {
                userId: row.user_id,
                emailEnabled: row.email_enabled,
                emailAddress: row.email_address,
                slackEnabled: row.slack_enabled,
                slackWebhook: row.slack_webhook,
                webhookEnabled: row.webhook_enabled,
                webhookUrl: row.webhook_url,
                inAppEnabled: row.in_app_enabled,
                preferences: typeof row.preferences === 'string'
                    ? JSON.parse(row.preferences)
                    : row.preferences
            };
        } catch (error) {
            logger.error('Error fetching notification settings:', error);
            return null;
        }
    }

    /**
     * Update user notification settings
     */
    static async updateSettings(settings: NotificationSettings): Promise<void> {
        await pool.query(
            `INSERT INTO notification_settings 
       (user_id, email_enabled, email_address, slack_enabled, slack_webhook, 
        webhook_enabled, webhook_url, in_app_enabled, preferences)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO UPDATE SET
         email_enabled = $2, email_address = $3, slack_enabled = $4, slack_webhook = $5,
         webhook_enabled = $6, webhook_url = $7, in_app_enabled = $8, preferences = $9`,
            [
                settings.userId,
                settings.emailEnabled,
                settings.emailAddress,
                settings.slackEnabled,
                settings.slackWebhook,
                settings.webhookEnabled,
                settings.webhookUrl,
                settings.inAppEnabled,
                JSON.stringify(settings.preferences)
            ]
        );
    }

    /**
     * Get unread notifications for user
     */
    static async getUnread(userId: string): Promise<Notification[]> {
        const result = await pool.query(
            `SELECT * FROM notifications 
       WHERE user_id = $1 AND read = false AND channel = 'in-app'
       ORDER BY created_at DESC
       LIMIT 50`,
            [userId]
        );

        return result.rows.map(this.mapNotificationRow);
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId: string): Promise<void> {
        await pool.query(
            `UPDATE notifications SET read = true WHERE id = $1`,
            [notificationId]
        );
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead(userId: string): Promise<void> {
        await pool.query(
            `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
            [userId]
        );
    }

    /**
     * Map database row to Notification
     */
    private static mapNotificationRow(row: any): Notification {
        return {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            channel: row.channel,
            title: row.title,
            message: row.message,
            data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
            read: row.read,
            createdAt: row.created_at,
            sentAt: row.sent_at,
            error: row.error
        };
    }

    /**
     * Notify session participants of an event
     */
    static async notifySessionParticipants(
        sessionId: string,
        title: string,
        message: string,
        type: Notification['type'] = 'info',
        excludeUserId?: string
    ): Promise<void> {
        try {
            const result = await pool.query(
                `SELECT user_id FROM session_participants 
         WHERE session_id = $1 AND ($2::text IS NULL OR user_id != $2)`,
                [sessionId, excludeUserId]
            );

            await Promise.all(
                result.rows.map(row =>
                    this.notify(row.user_id, title, message, { type, channel: 'in-app' })
                )
            );
        } catch (error) {
            logger.error('Error notifying session participants:', error);
        }
    }
}

// Initialize on module load
NotificationService.initialize();
