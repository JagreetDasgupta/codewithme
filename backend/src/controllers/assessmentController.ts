import { Request, Response, NextFunction } from 'express';
import { AssessmentService, TestCase } from '../services/assessmentService';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

/**
 * Evaluate code against test cases
 */
export const evaluateCode = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id: sessionId } = req.params;
        const { code, language, questionId, testCases } = req.body;
        const userId = (req as any).user?.id || 'anonymous';

        if (!code || !language) {
            return next(new AppError('code and language are required', 400));
        }

        if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
            return next(new AppError('testCases array is required', 400));
        }

        // Validate test cases
        const validTestCases: TestCase[] = testCases.map((tc: any, index: number) => ({
            id: tc.id || `test_${index + 1}`,
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || tc.expected || '',
            isHidden: tc.isHidden || false,
            points: tc.points || 10,
            timeout: tc.timeout || 5000
        }));

        const result = await AssessmentService.evaluateCode(
            sessionId,
            userId,
            questionId || 'default',
            code,
            language,
            validTestCases
        );

        res.status(200).json({
            status: 'success',
            data: { assessment: result }
        });
    } catch (error) {
        logger.error('Error evaluating code:', error);
        next(new AppError('Failed to evaluate code', 500));
    }
};

/**
 * Get assessment history for a session
 */
export const getAssessmentHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id: sessionId } = req.params;
        const userId = (req as any).user?.id || req.query.userId as string;

        if (!userId) {
            return next(new AppError('userId is required', 400));
        }

        const history = await AssessmentService.getAssessmentHistory(sessionId, userId);

        res.status(200).json({
            status: 'success',
            data: { history }
        });
    } catch (error) {
        logger.error('Error fetching assessment history:', error);
        next(new AppError('Failed to fetch assessment history', 500));
    }
};

/**
 * Run quick test (single test case)
 */
export const runQuickTest = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { code, language, input, expectedOutput } = req.body;

        if (!code || !language) {
            return next(new AppError('code and language are required', 400));
        }

        const testCase: TestCase = {
            id: 'quick_test',
            input: input || '',
            expectedOutput: expectedOutput || '',
            points: 10,
            timeout: 5000
        };

        const result = await AssessmentService.evaluateCode(
            'quick_test',
            'anonymous',
            'quick_test',
            code,
            language,
            [testCase]
        );

        res.status(200).json({
            status: 'success',
            data: {
                passed: result.passedTests === 1,
                output: result.testResults[0]?.actualOutput,
                expected: expectedOutput,
                executionTime: result.executionTime,
                feedback: result.feedback
            }
        });
    } catch (error) {
        logger.error('Error running quick test:', error);
        next(new AppError('Failed to run test', 500));
    }
};
