import logger from '../utils/logger';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface TakeHomeAssessment {
    id: string;
    title: string;
    description: string;
    instructions: string;
    questions: TakeHomeQuestion[];
    timeLimit: number; // minutes, 0 = no limit
    deadline: Date;
    createdBy: string;
    companyId?: string;
    isActive: boolean;
    settings: TakeHomeSettings;
    createdAt: Date;
    updatedAt: Date;
}

export interface TakeHomeQuestion {
    id: string;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    starterCode: Record<string, string>;
    testCases: Array<{
        input: string;
        expectedOutput: string;
        isHidden: boolean;
        points: number;
    }>;
    points: number;
    tags: string[];
}

export interface TakeHomeSettings {
    allowedLanguages: string[];
    allowCopyPaste: boolean;
    detectTabSwitch: boolean;
    requireWebcam: boolean;
    showHints: boolean;
    maxSubmissions: number;
    shuffleQuestions: boolean;
    antiPlagiarism: boolean;
}

export interface CandidateSubmission {
    id: string;
    assessmentId: string;
    candidateId: string;
    candidateEmail: string;
    accessToken: string;
    status: 'pending' | 'started' | 'submitted' | 'expired' | 'reviewed';
    startedAt?: Date;
    submittedAt?: Date;
    answers: CandidateAnswer[];
    totalScore?: number;
    maxScore: number;
    tabSwitches: number;
    timeSpent: number; // seconds
    feedback?: string;
    reviewedBy?: string;
    reviewedAt?: Date;
}

export interface CandidateAnswer {
    questionId: string;
    code: string;
    language: string;
    testResults: any[];
    score: number;
    maxScore: number;
    submittedAt: Date;
}

/**
 * Take-Home Assessment Service for async coding challenges
 */
export class TakeHomeService {
    /**
     * Create a new take-home assessment
     */
    static async createAssessment(
        creatorId: string,
        data: Omit<TakeHomeAssessment, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>
    ): Promise<TakeHomeAssessment> {
        try {
            const id = uuidv4();
            const now = new Date();

            await pool.query(
                `INSERT INTO take_home_assessments 
         (id, title, description, instructions, questions, time_limit, deadline, 
          created_by, company_id, is_active, settings, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    id,
                    data.title,
                    data.description,
                    data.instructions,
                    JSON.stringify(data.questions),
                    data.timeLimit,
                    data.deadline,
                    creatorId,
                    data.companyId || null,
                    true,
                    JSON.stringify(data.settings),
                    now,
                    now
                ]
            );

            logger.info(`Created take-home assessment: ${id}`);

            return {
                id,
                ...data,
                isActive: true,
                createdAt: now,
                updatedAt: now
            };
        } catch (error) {
            logger.error('Error creating take-home assessment:', error);
            throw error;
        }
    }

    /**
     * Generate candidate invitation link
     */
    static async inviteCandidate(
        assessmentId: string,
        candidateEmail: string
    ): Promise<{ inviteLink: string; accessToken: string }> {
        try {
            const id = uuidv4();
            const accessToken = crypto.randomBytes(32).toString('hex');

            // Get assessment to calculate max score
            const assessment = await this.getAssessment(assessmentId);
            const maxScore = assessment.questions.reduce((sum, q) => sum + q.points, 0);

            await pool.query(
                `INSERT INTO candidate_submissions 
         (id, assessment_id, candidate_email, access_token, status, max_score, tab_switches, time_spent)
         VALUES ($1, $2, $3, $4, 'pending', $5, 0, 0)`,
                [id, assessmentId, candidateEmail, accessToken, maxScore]
            );

            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const inviteLink = `${baseUrl}/take-home/${assessmentId}?token=${accessToken}`;

            logger.info(`Generated invite for ${candidateEmail} to assessment ${assessmentId}`);

            return { inviteLink, accessToken };
        } catch (error) {
            logger.error('Error inviting candidate:', error);
            throw error;
        }
    }

    /**
     * Start assessment for candidate
     */
    static async startAssessment(
        assessmentId: string,
        accessToken: string
    ): Promise<{ submission: CandidateSubmission; assessment: TakeHomeAssessment }> {
        try {
            // Verify token and get submission
            const result = await pool.query(
                `SELECT * FROM candidate_submissions 
         WHERE assessment_id = $1 AND access_token = $2`,
                [assessmentId, accessToken]
            );

            if (result.rows.length === 0) {
                throw new Error('Invalid access token');
            }

            const submission = result.rows[0];

            if (submission.status === 'submitted') {
                throw new Error('Assessment already submitted');
            }

            if (submission.status === 'expired') {
                throw new Error('Assessment has expired');
            }

            // Get assessment
            const assessment = await this.getAssessment(assessmentId);

            // Check deadline
            if (new Date() > new Date(assessment.deadline)) {
                await pool.query(
                    `UPDATE candidate_submissions SET status = 'expired' WHERE id = $1`,
                    [submission.id]
                );
                throw new Error('Assessment deadline has passed');
            }

            // Update status to started if first time
            if (submission.status === 'pending') {
                await pool.query(
                    `UPDATE candidate_submissions 
           SET status = 'started', started_at = NOW() 
           WHERE id = $1`,
                    [submission.id]
                );
                submission.status = 'started';
                submission.started_at = new Date();
            }

            return {
                submission: this.mapSubmissionRow(submission),
                assessment
            };
        } catch (error) {
            logger.error('Error starting assessment:', error);
            throw error;
        }
    }

    /**
     * Submit answer for a question
     */
    static async submitAnswer(
        submissionId: string,
        data: CandidateAnswer
    ): Promise<void> {
        try {
            const result = await pool.query(
                `SELECT answers FROM candidate_submissions WHERE id = $1`,
                [submissionId]
            );

            if (result.rows.length === 0) {
                throw new Error('Submission not found');
            }

            const existingAnswers = result.rows[0].answers
                ? (typeof result.rows[0].answers === 'string'
                    ? JSON.parse(result.rows[0].answers)
                    : result.rows[0].answers)
                : [];

            // Replace or add answer
            const answerIndex = existingAnswers.findIndex((a: any) => a.questionId === data.questionId);
            if (answerIndex >= 0) {
                existingAnswers[answerIndex] = data;
            } else {
                existingAnswers.push(data);
            }

            // Calculate total score
            const totalScore = existingAnswers.reduce((sum: number, a: CandidateAnswer) => sum + a.score, 0);

            await pool.query(
                `UPDATE candidate_submissions 
         SET answers = $1, total_score = $2, updated_at = NOW()
         WHERE id = $3`,
                [JSON.stringify(existingAnswers), totalScore, submissionId]
            );

            logger.info(`Answer submitted for question ${data.questionId} in submission ${submissionId}`);
        } catch (error) {
            logger.error('Error submitting answer:', error);
            throw error;
        }
    }

    /**
     * Submit final assessment
     */
    static async submitAssessment(
        submissionId: string,
        timeSpent: number,
        tabSwitches: number
    ): Promise<CandidateSubmission> {
        try {
            await pool.query(
                `UPDATE candidate_submissions 
         SET status = 'submitted', submitted_at = NOW(), time_spent = $1, tab_switches = $2
         WHERE id = $3`,
                [timeSpent, tabSwitches, submissionId]
            );

            const result = await pool.query(
                `SELECT * FROM candidate_submissions WHERE id = $1`,
                [submissionId]
            );

            logger.info(`Assessment submitted: ${submissionId}`);

            return this.mapSubmissionRow(result.rows[0]);
        } catch (error) {
            logger.error('Error submitting assessment:', error);
            throw error;
        }
    }

    /**
     * Get assessment by ID
     */
    static async getAssessment(assessmentId: string): Promise<TakeHomeAssessment> {
        try {
            const result = await pool.query(
                `SELECT * FROM take_home_assessments WHERE id = $1`,
                [assessmentId]
            );

            if (result.rows.length === 0) {
                throw new Error('Assessment not found');
            }

            const row = result.rows[0];
            return {
                id: row.id,
                title: row.title,
                description: row.description,
                instructions: row.instructions,
                questions: typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions,
                timeLimit: row.time_limit,
                deadline: row.deadline,
                createdBy: row.created_by,
                companyId: row.company_id,
                isActive: row.is_active,
                settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            logger.error('Error fetching assessment:', error);
            throw error;
        }
    }

    /**
     * Get submissions for an assessment (for reviewers)
     */
    static async getSubmissions(assessmentId: string): Promise<CandidateSubmission[]> {
        try {
            const result = await pool.query(
                `SELECT * FROM candidate_submissions 
         WHERE assessment_id = $1 
         ORDER BY submitted_at DESC NULLS LAST`,
                [assessmentId]
            );

            return result.rows.map(this.mapSubmissionRow);
        } catch (error) {
            logger.error('Error fetching submissions:', error);
            throw error;
        }
    }

    /**
     * Review and grade submission
     */
    static async reviewSubmission(
        submissionId: string,
        reviewerId: string,
        feedback: string,
        adjustedScore?: number
    ): Promise<void> {
        try {
            const updates: string[] = ['status = $1', 'reviewed_by = $2', 'reviewed_at = NOW()', 'feedback = $3'];
            const values: any[] = ['reviewed', reviewerId, feedback];

            if (adjustedScore !== undefined) {
                updates.push(`total_score = $${values.length + 1}`);
                values.push(adjustedScore);
            }

            values.push(submissionId);

            await pool.query(
                `UPDATE candidate_submissions SET ${updates.join(', ')} WHERE id = $${values.length}`,
                values
            );

            logger.info(`Submission ${submissionId} reviewed by ${reviewerId}`);
        } catch (error) {
            logger.error('Error reviewing submission:', error);
            throw error;
        }
    }

    /**
     * Map database row to CandidateSubmission
     */
    private static mapSubmissionRow(row: any): CandidateSubmission {
        return {
            id: row.id,
            assessmentId: row.assessment_id,
            candidateId: row.candidate_id || row.id,
            candidateEmail: row.candidate_email,
            accessToken: row.access_token,
            status: row.status,
            startedAt: row.started_at,
            submittedAt: row.submitted_at,
            answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : (row.answers || []),
            totalScore: row.total_score,
            maxScore: row.max_score,
            tabSwitches: row.tab_switches || 0,
            timeSpent: row.time_spent || 0,
            feedback: row.feedback,
            reviewedBy: row.reviewed_by,
            reviewedAt: row.reviewed_at
        };
    }
}
