import axios from 'axios';
import { logger } from '../utils/logger';

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

interface DailyRoom {
    id: string;
    name: string;
    url: string;
    created_at: string;
    config: {
        exp?: number;
        nbf?: number;
        max_participants?: number;
    };
}

interface DailyToken {
    token: string;
}

export class DailyService {
    private static headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
    };

    /**
     * Create a Daily room for a session
     */
    static async createRoom(sessionId: string, expiryMinutes: number = 120): Promise<DailyRoom> {
        if (!DAILY_API_KEY) {
            throw new Error('DAILY_API_KEY not configured');
        }

        const roomName = `codewithme-${sessionId}`;
        const exp = Math.floor(Date.now() / 1000) + (expiryMinutes * 60);

        try {
            // Check if room already exists
            const existingRoom = await this.getRoom(roomName);
            if (existingRoom) {
                logger.info(`Daily room already exists: ${roomName}`);
                return existingRoom;
            }
        } catch (e) {
            // Room doesn't exist, create it
        }

        try {
            const response = await axios.post<DailyRoom>(
                `${DAILY_API_URL}/rooms`,
                {
                    name: roomName,
                    privacy: 'public', // Anyone with link can join
                    properties: {
                        exp,
                        max_participants: 10,
                        enable_chat: true,
                        enable_screenshare: true,
                        enable_knocking: false,
                        start_video_off: false,
                        start_audio_off: false
                    }
                },
                { headers: this.headers }
            );

            logger.info(`Created Daily room: ${response.data.name}`);
            return response.data;
        } catch (error: any) {
            logger.error('Failed to create Daily room:', error.response?.data || error.message);
            throw new Error('Failed to create video room');
        }
    }

    /**
     * Get an existing Daily room
     */
    static async getRoom(roomName: string): Promise<DailyRoom | null> {
        if (!DAILY_API_KEY) {
            throw new Error('DAILY_API_KEY not configured');
        }

        try {
            const response = await axios.get<DailyRoom>(
                `${DAILY_API_URL}/rooms/${roomName}`,
                { headers: this.headers }
            );
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Delete a Daily room
     */
    static async deleteRoom(roomName: string): Promise<void> {
        if (!DAILY_API_KEY) {
            throw new Error('DAILY_API_KEY not configured');
        }

        try {
            await axios.delete(
                `${DAILY_API_URL}/rooms/${roomName}`,
                { headers: this.headers }
            );
            logger.info(`Deleted Daily room: ${roomName}`);
        } catch (error: any) {
            if (error.response?.status !== 404) {
                logger.error('Failed to delete Daily room:', error.response?.data || error.message);
            }
        }
    }

    /**
     * Create a meeting token for a participant
     */
    static async createMeetingToken(
        roomName: string,
        userId: string,
        userName: string,
        isOwner: boolean = false
    ): Promise<string> {
        if (!DAILY_API_KEY) {
            throw new Error('DAILY_API_KEY not configured');
        }

        const exp = Math.floor(Date.now() / 1000) + (2 * 60 * 60); // 2 hours

        try {
            const response = await axios.post<DailyToken>(
                `${DAILY_API_URL}/meeting-tokens`,
                {
                    properties: {
                        room_name: roomName,
                        user_id: userId,
                        user_name: userName,
                        is_owner: isOwner,
                        exp,
                        enable_screenshare: true,
                        start_video_off: false,
                        start_audio_off: false
                    }
                },
                { headers: this.headers }
            );

            return response.data.token;
        } catch (error: any) {
            logger.error('Failed to create meeting token:', error.response?.data || error.message);
            throw new Error('Failed to create meeting token');
        }
    }
}
