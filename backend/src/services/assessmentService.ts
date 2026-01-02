import logger from '../utils/logger';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface TestCase {
    id: string;
    input: string;
    expectedOutput: string;
    isHidden?: boolean;
    points?: number;
    timeout?: number; // ms
}

export interface TestResult {
    testCaseId: string;
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    executionTime: number;
    error?: string;
    points: number;
}

export interface AssessmentResult {
    id: string;
    sessionId: string;
    userId: string;
    questionId: string;
    code: string;
    language: string;
    testResults: TestResult[];
    totalTests: number;
    passedTests: number;
    score: number;
    maxScore: number;
    executionTime: number;
    codeQuality: CodeQualityMetrics;
    feedback: string[];
    createdAt: Date;
}

export interface CodeQualityMetrics {
    linesOfCode: number;
    complexity: number;
    readability: number;
    efficiency: number;
    styleScore: number;
    overallQuality: number;
}

/**
 * Automated Assessment Service for code evaluation and scoring
 */
export class AssessmentService {
    /**
     * Evaluate code against test cases and provide scoring
     */
    static async evaluateCode(
        sessionId: string,
        userId: string,
        questionId: string,
        code: string,
        language: string,
        testCases: TestCase[]
    ): Promise<AssessmentResult> {
        try {
            const startTime = Date.now();
            const testResults: TestResult[] = [];
            let totalScore = 0;
            let maxScore = 0;

            // Run each test case
            for (const testCase of testCases) {
                const result = await this.runTestCase(code, language, testCase);
                testResults.push(result);
                totalScore += result.points;
                maxScore += testCase.points || 10;
            }

            const executionTime = Date.now() - startTime;

            // Calculate code quality metrics
            const codeQuality = this.analyzeCodeQuality(code, language);

            // Generate feedback
            const feedback = this.generateFeedback(testResults, codeQuality);

            // Store assessment result
            const resultId = await this.storeAssessmentResult({
                sessionId,
                userId,
                questionId,
                code,
                language,
                testResults,
                totalTests: testCases.length,
                passedTests: testResults.filter(r => r.passed).length,
                score: totalScore,
                maxScore,
                executionTime,
                codeQuality,
                feedback
            });

            logger.info(`Assessment completed: ${totalScore}/${maxScore} for session ${sessionId}`);

            return {
                id: resultId,
                sessionId,
                userId,
                questionId,
                code,
                language,
                testResults,
                totalTests: testCases.length,
                passedTests: testResults.filter(r => r.passed).length,
                score: totalScore,
                maxScore,
                executionTime,
                codeQuality,
                feedback,
                createdAt: new Date()
            };
        } catch (error) {
            logger.error('Error evaluating code:', error);
            throw error;
        }
    }

    /**
     * Run a single test case against the code
     */
    private static async runTestCase(
        code: string,
        language: string,
        testCase: TestCase
    ): Promise<TestResult> {
        const startTime = Date.now();
        const timeout = testCase.timeout || 5000;
        const points = testCase.points || 10;

        try {
            // Simulate code execution (in production, use Docker sandboxed environment)
            const actualOutput = await this.executeCode(code, language, testCase.input, timeout);
            const executionTime = Date.now() - startTime;

            // Compare outputs
            const normalizedExpected = this.normalizeOutput(testCase.expectedOutput);
            const normalizedActual = this.normalizeOutput(actualOutput);
            const passed = normalizedExpected === normalizedActual;

            return {
                testCaseId: testCase.id,
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                actualOutput,
                passed,
                executionTime,
                points: passed ? points : 0
            };
        } catch (error: any) {
            return {
                testCaseId: testCase.id,
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                actualOutput: '',
                passed: false,
                executionTime: Date.now() - startTime,
                error: error.message || 'Execution failed',
                points: 0
            };
        }
    }

    /**
     * Execute code with given input (mock implementation)
     * In production, this would use Docker/sandboxed execution
     */
    private static async executeCode(
        code: string,
        language: string,
        input: string,
        timeout: number
    ): Promise<string> {
        // Mock execution - in production, use isolated Docker container
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    // Very basic mock execution for JavaScript
                    if (language === 'javascript' || language === 'typescript') {
                        // Create a safe eval context (in production, use VM2 or Docker)
                        const mockOutput = this.mockJsExecution(code, input);
                        resolve(mockOutput);
                    } else {
                        // For other languages, return placeholder
                        resolve('[Mock execution - requires backend executor]');
                    }
                } catch (error: any) {
                    reject(new Error(`Execution error: ${error.message}`));
                }
            }, Math.min(100, timeout)); // Mock delay
        });
    }

    /**
     * Mock JavaScript execution (for demo purposes)
     */
    private static mockJsExecution(code: string, input: string): string {
        // Simple pattern matching for Two Sum / common problems
        if (code.includes('twoSum') && input.includes('[')) {
            try {
                // Parse input like "[2,7,11,15], 9"
                const match = input.match(/\[([\d,\s]+)\],\s*(\d+)/);
                if (match) {
                    const nums = match[1].split(',').map(n => parseInt(n.trim()));
                    const target = parseInt(match[2]);

                    // Simple two sum solution
                    const map = new Map();
                    for (let i = 0; i < nums.length; i++) {
                        const complement = target - nums[i];
                        if (map.has(complement)) {
                            return `[${map.get(complement)},${i}]`;
                        }
                        map.set(nums[i], i);
                    }
                }
            } catch {
                return 'Error parsing input';
            }
        }
        return 'Output: ' + input;
    }

    /**
     * Normalize output for comparison
     */
    private static normalizeOutput(output: string): string {
        return output
            .trim()
            .replace(/\r\n/g, '\n')
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }

    /**
     * Analyze code quality metrics
     */
    private static analyzeCodeQuality(code: string, language: string): CodeQualityMetrics {
        const lines = code.split('\n');
        const linesOfCode = lines.filter(l => l.trim().length > 0 && !l.trim().startsWith('//')).length;

        // Complexity estimation (simple cyclomatic complexity proxy)
        const complexityPatterns = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', '?', '&&', '||'];
        let complexity = 1;
        for (const pattern of complexityPatterns) {
            complexity += (code.match(new RegExp(`\\b${pattern}\\b`, 'g')) || []).length;
        }

        // Readability score (based on naming conventions, comments, etc.)
        const hasComments = /\/\/|\/\*|\*\//.test(code);
        const hasCamelCase = /[a-z][A-Z]/.test(code);
        const hasDescriptiveNames = code.length > 0 && !/(var|let|const)\s+[a-z]\s*=/.test(code);
        const readability = (hasComments ? 30 : 0) + (hasCamelCase ? 35 : 0) + (hasDescriptiveNames ? 35 : 0);

        // Efficiency score (penalize obvious inefficiencies)
        let efficiency = 100;
        if (/\.sort\(\).*\.sort\(/.test(code)) efficiency -= 20; // Multiple sorts
        if (/for\s*\(.*for\s*\(.*for\s*\(/.test(code)) efficiency -= 30; // Triple nested loops
        if (/\.indexOf\(.*while/.test(code)) efficiency -= 15; // indexOf in loop

        // Style score
        const hasConsistentIndent = lines.every(l => l === '' || l.startsWith(' '.repeat(2)) || l.startsWith('\t') || !/^\s/.test(l));
        const hasLineLimit = lines.every(l => l.length <= 120);
        const styleScore = (hasConsistentIndent ? 50 : 0) + (hasLineLimit ? 50 : 0);

        const overallQuality = Math.round((readability + efficiency + styleScore) / 3);

        return {
            linesOfCode,
            complexity,
            readability,
            efficiency: Math.max(0, efficiency),
            styleScore,
            overallQuality
        };
    }

    /**
     * Generate feedback based on test results and code quality
     */
    private static generateFeedback(
        testResults: TestResult[],
        codeQuality: CodeQualityMetrics
    ): string[] {
        const feedback: string[] = [];

        const passedCount = testResults.filter(r => r.passed).length;
        const totalCount = testResults.length;

        if (passedCount === totalCount) {
            feedback.push('🎉 All test cases passed! Great job!');
        } else if (passedCount > 0) {
            feedback.push(`✅ ${passedCount}/${totalCount} test cases passed.`);
            feedback.push('💡 Review failing test cases for edge cases.');
        } else {
            feedback.push('❌ No test cases passed. Check your solution logic.');
        }

        // Code quality feedback
        if (codeQuality.complexity > 10) {
            feedback.push('⚠️ High complexity detected. Consider refactoring into smaller functions.');
        }

        if (codeQuality.readability < 50) {
            feedback.push('📝 Add comments to improve code readability.');
        }

        if (codeQuality.efficiency < 70) {
            feedback.push('🚀 Consider optimizing your solution for better performance.');
        }

        if (codeQuality.styleScore < 50) {
            feedback.push('✨ Improve code formatting and consistency.');
        }

        // Error-specific feedback
        for (const result of testResults) {
            if (result.error) {
                if (result.error.includes('timeout')) {
                    feedback.push(`⏱️ Test "${result.testCaseId}" timed out. Optimize your algorithm.`);
                } else if (result.error.includes('undefined')) {
                    feedback.push(`🐛 Undefined error in test "${result.testCaseId}". Check variable initialization.`);
                }
            }
        }

        return feedback;
    }

    /**
     * Store assessment result in database
     */
    private static async storeAssessmentResult(data: Omit<AssessmentResult, 'id' | 'createdAt'>): Promise<string> {
        try {
            const id = uuidv4();

            await pool.query(
                `INSERT INTO assessment_results 
         (id, session_id, user_id, question_id, code, language, test_results, 
          total_tests, passed_tests, score, max_score, execution_time, 
          code_quality, feedback, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
                [
                    id,
                    data.sessionId,
                    data.userId,
                    data.questionId,
                    data.code,
                    data.language,
                    JSON.stringify(data.testResults),
                    data.totalTests,
                    data.passedTests,
                    data.score,
                    data.maxScore,
                    data.executionTime,
                    JSON.stringify(data.codeQuality),
                    JSON.stringify(data.feedback)
                ]
            );

            return id;
        } catch (error) {
            logger.error('Error storing assessment result:', error);
            throw error;
        }
    }

    /**
     * Get assessment history for a user in a session
     */
    static async getAssessmentHistory(sessionId: string, userId: string): Promise<AssessmentResult[]> {
        try {
            const result = await pool.query(
                `SELECT * FROM assessment_results
         WHERE session_id = $1 AND user_id = $2
         ORDER BY created_at DESC`,
                [sessionId, userId]
            );

            return result.rows.map(row => ({
                id: row.id,
                sessionId: row.session_id,
                userId: row.user_id,
                questionId: row.question_id,
                code: row.code,
                language: row.language,
                testResults: typeof row.test_results === 'string' ? JSON.parse(row.test_results) : row.test_results,
                totalTests: row.total_tests,
                passedTests: row.passed_tests,
                score: row.score,
                maxScore: row.max_score,
                executionTime: row.execution_time,
                codeQuality: typeof row.code_quality === 'string' ? JSON.parse(row.code_quality) : row.code_quality,
                feedback: typeof row.feedback === 'string' ? JSON.parse(row.feedback) : row.feedback,
                createdAt: row.created_at
            }));
        } catch (error) {
            logger.error('Error fetching assessment history:', error);
            throw error;
        }
    }
}
