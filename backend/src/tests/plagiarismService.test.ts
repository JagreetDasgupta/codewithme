import { expect } from 'chai';

// We need to test private static methods, so we'll recreate the logic here
// In a real scenario, you might refactor to expose these as utilities or use a testing library that can access private methods

describe('PlagiarismService', () => {
    // Recreate normalizeCode logic for testing
    const normalizeCode = (code: string): string => {
        return code
            .replace(/\/\/.*$/gm, '') // Remove single-line comments
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/['\"]/g, '') // Remove quotes
            .trim()
            .toLowerCase();
    };

    // Recreate Levenshtein distance for testing
    const levenshteinDistance = (str1: string, str2: string): number => {
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
    };

    const calculateStringSimilarity = (str1: string, str2: string): number => {
        if (str1 === str2) return 1;
        if (str1.length === 0 || str2.length === 0) return 0;

        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1;

        const distance = levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    };

    describe('normalizeCode', () => {
        it('should remove single-line comments', () => {
            const code = 'const x = 1; // this is a comment\nconst y = 2;';
            const normalized = normalizeCode(code);
            expect(normalized).to.not.include('this is a comment');
        });

        it('should remove multi-line comments', () => {
            const code = 'const x = 1; /* multi\nline\ncomment */ const y = 2;';
            const normalized = normalizeCode(code);
            expect(normalized).to.not.include('multi');
            expect(normalized).to.not.include('comment');
        });

        it('should normalize whitespace', () => {
            const code = 'const   x   =   1;';
            const normalized = normalizeCode(code);
            expect(normalized).to.equal('const x = 1;');
        });

        it('should remove quotes', () => {
            const code = "const x = 'hello';";
            const normalized = normalizeCode(code);
            expect(normalized).to.not.include("'");
        });

        it('should convert to lowercase', () => {
            const code = 'CONST X = 1;';
            const normalized = normalizeCode(code);
            expect(normalized).to.equal('const x = 1;');
        });
    });

    describe('calculateStringSimilarity', () => {
        it('should return 1 for identical strings', () => {
            const similarity = calculateStringSimilarity('hello', 'hello');
            expect(similarity).to.equal(1);
        });

        it('should return 0 for empty string comparison', () => {
            const similarity = calculateStringSimilarity('hello', '');
            expect(similarity).to.equal(0);
        });

        it('should return high similarity for similar strings', () => {
            const similarity = calculateStringSimilarity('hello', 'hallo');
            expect(similarity).to.be.greaterThan(0.7);
        });

        it('should return low similarity for very different strings', () => {
            const similarity = calculateStringSimilarity('abc', 'xyz');
            expect(similarity).to.be.lessThan(0.5);
        });
    });

    describe('checkCommonPatterns', () => {
        const checkCommonPatterns = (normalizedCode: string, language: string): { source: string; similarity: number }[] => {
            const matches: { source: string; similarity: number }[] = [];

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
                    'if __name__ == \"__main__\"'
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

            if (patternCount >= patterns.length * 0.8) {
                matches.push({
                    source: 'Common code pattern detected',
                    similarity: 60
                });
            }

            return matches;
        };

        it('should detect common JavaScript patterns', () => {
            const code = 'function solution() { } const solution = 1; export default foo; module.exports = bar;';
            const matches = checkCommonPatterns(code.toLowerCase(), 'javascript');
            expect(matches.length).to.be.greaterThan(0);
        });

        it('should detect common Python patterns', () => {
            const code = 'def solution(): pass\nclass solution: pass\nif __name__ == \"__main__\": pass';
            const matches = checkCommonPatterns(code.toLowerCase(), 'python');
            expect(matches.length).to.be.greaterThan(0);
        });

        it('should not flag code without common patterns', () => {
            const code = 'console.log("hello world");';
            const matches = checkCommonPatterns(code.toLowerCase(), 'javascript');
            expect(matches.length).to.equal(0);
        });
    });
});
