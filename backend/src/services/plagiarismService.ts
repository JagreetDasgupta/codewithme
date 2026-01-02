import logger from '../utils/logger';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface PlagiarismCheck {
  id: string;
  session_id: string;
  code_snippet: string;
  similarity_score: number;
  matches: PlagiarismMatch[];
  checked_at: Date;
}

export interface PlagiarismMatch {
  source: string;
  similarity: number;
  url?: string;
  snippet?: string;
}

/**
 * Plagiarism detection service using multiple strategies
 */
export class PlagiarismService {
  /**
   * Check code for plagiarism using multiple methods
   */
  static async checkPlagiarism(
    sessionId: string,
    code: string,
    language: string
  ): Promise<PlagiarismCheck> {
    try {
      // Normalize code for comparison
      const normalizedCode = this.normalizeCode(code);

      // Check against previous submissions in this session
      const sessionMatches = await this.checkAgainstSession(sessionId, normalizedCode);

      // Check against common patterns (simple heuristic-based check)
      const patternMatches = this.checkCommonPatterns(normalizedCode, language);

      // Combine matches
      const allMatches = [...sessionMatches, ...patternMatches];

      // Calculate overall similarity score
      const similarityScore = this.calculateSimilarityScore(allMatches);

      // Store check result
      const checkId = await this.storeCheckResult(sessionId, code, similarityScore, allMatches);

      logger.info(`Plagiarism check completed for session ${sessionId}: ${similarityScore}% similarity`);

      return {
        id: checkId,
        session_id: sessionId,
        code_snippet: code,
        similarity_score: similarityScore,
        matches: allMatches,
        checked_at: new Date()
      };
    } catch (error) {
      logger.error('Error checking plagiarism:', error);
      throw error;
    }
  }

  /**
   * Normalize code for comparison (remove whitespace, comments, etc.)
   */
  private static normalizeCode(code: string): string {
    return code
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/['"]/g, '') // Remove quotes
      .trim()
      .toLowerCase();
  }

  /**
   * Check code against previous submissions in the session
   */
  private static async checkAgainstSession(
    sessionId: string,
    normalizedCode: string
  ): Promise<PlagiarismMatch[]> {
    try {
      const result = await pool.query(
        `SELECT DISTINCT content, user_id, created_at
         FROM code_snippets
         WHERE session_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [sessionId]
      );

      const matches: PlagiarismMatch[] = [];

      for (const row of result.rows) {
        const normalized = this.normalizeCode(row.content);
        const similarity = this.calculateStringSimilarity(normalizedCode, normalized);

        if (similarity > 0.7) { // 70% similarity threshold
          matches.push({
            source: `Previous submission in session`,
            similarity: similarity * 100,
            snippet: row.content.substring(0, 200) // First 200 chars
          });
        }
      }

      return matches;
    } catch (error) {
      logger.error('Error checking against session:', error);
      return [];
    }
  }

  /**
   * Check for common code patterns that might indicate plagiarism
   */
  private static checkCommonPatterns(
    normalizedCode: string,
    language: string
  ): PlagiarismMatch[] {
    const matches: PlagiarismMatch[] = [];

    // Common boilerplate patterns
    const commonPatterns: Record<string, string[]> = {
      javascript: [
        'function solution',
        'const solution =',
        'export default',
        'module.exports'
      ],
      python: [
        'def solution',
        'class solution',
        'if __name__ == "__main__"'
      ],
      java: [
        'public class solution',
        'public static void main',
        'class solution'
      ]
    };

    const patterns = commonPatterns[language] || [];
    let patternCount = 0;

    for (const pattern of patterns) {
      if (normalizedCode.includes(pattern.toLowerCase())) {
        patternCount++;
      }
    }

    // If too many common patterns, flag it
    if (patternCount >= patterns.length * 0.8) {
      matches.push({
        source: 'Common code pattern detected',
        similarity: 60,
        snippet: 'Multiple standard patterns found'
      });
    }

    return matches;
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate overall similarity score from matches
   */
  private static calculateSimilarityScore(matches: PlagiarismMatch[]): number {
    if (matches.length === 0) return 0;

    const totalSimilarity = matches.reduce((sum, match) => sum + match.similarity, 0);
    return Math.min(100, totalSimilarity / matches.length);
  }

  /**
   * Store plagiarism check result in database
   */
  private static async storeCheckResult(
    sessionId: string,
    code: string,
    similarityScore: number,
    matches: PlagiarismMatch[]
  ): Promise<string> {
    try {
      const id = uuidv4();

      await pool.query(
        `INSERT INTO plagiarism_checks (id, session_id, code_snippet, similarity_score, matches, checked_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [id, sessionId, code, similarityScore, JSON.stringify(matches)]
      );

      return id;
    } catch (error) {
      logger.error('Error storing plagiarism check:', error);
      throw error;
    }
  }

  /**
   * Get plagiarism checks for a session
   */
  static async getSessionChecks(sessionId: string): Promise<PlagiarismCheck[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM plagiarism_checks
         WHERE session_id = $1
         ORDER BY checked_at DESC`,
        [sessionId]
      );

      return result.rows.map(row => ({
        ...row,
        matches: typeof row.matches === 'string' 
          ? JSON.parse(row.matches) 
          : row.matches
      }));
    } catch (error) {
      logger.error('Error fetching plagiarism checks:', error);
      throw error;
    }
  }
}

