import logger from '../utils/logger';
import axios from 'axios';

// Piston API endpoint (free, public, no rate limits)
const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
    memoryUsed?: number;
    timedOut: boolean;
    compilationError?: string;
    language?: string;
    version?: string;
}

export interface ExecutionConfig {
    timeout?: number;       // ms (max 30000 for Piston)
    memoryLimit?: number;   // Not supported by public Piston API
    stdin?: string;         // Standard input
}

// Piston language versions (auto-detected if not specified)
interface PistonLanguage {
    language: string;
    version: string;
    aliases?: string[];
}

// Language mapping to Piston language names
const LANGUAGE_MAP: Record<string, { language: string; version?: string }> = {
    // Web languages
    javascript: { language: 'javascript' },
    typescript: { language: 'typescript' },

    // Popular languages
    python: { language: 'python' },
    java: { language: 'java' },
    csharp: { language: 'csharp' },
    cpp: { language: 'cpp' },
    c: { language: 'c' },
    go: { language: 'go' },
    rust: { language: 'rust' },
    ruby: { language: 'ruby' },
    php: { language: 'php' },
    swift: { language: 'swift' },
    kotlin: { language: 'kotlin' },
    scala: { language: 'scala' },
    r: { language: 'r' },
    dart: { language: 'dart' },

    // Scripting
    bash: { language: 'bash' },
    perl: { language: 'perl' },
    lua: { language: 'lua' },

    // Functional
    haskell: { language: 'haskell' },
    elixir: { language: 'elixir' },
    clojure: { language: 'clojure' },
    fsharp: { language: 'fsharp' },

    // Other
    sql: { language: 'sqlite3' },
    cobol: { language: 'cobol' },
    fortran: { language: 'fortran' },
    pascal: { language: 'pascal' },
    prolog: { language: 'prolog' },
};

const DEFAULT_CONFIG: ExecutionConfig = {
    timeout: 10000,  // 10 seconds
};

/**
 * Code Execution Service using Piston API
 * Piston is a free, open-source code execution engine
 * Public API: https://emkc.org/api/v2/piston
 */
export class CodeExecutionService {
    private static cachedRuntimes: PistonLanguage[] | null = null;

    /**
     * Initialize - fetch available runtimes
     */
    static async initialize(): Promise<void> {
        try {
            await this.fetchRuntimes();
            logger.info(`Piston API initialized with ${this.cachedRuntimes?.length || 0} languages`);
        } catch (error) {
            logger.warn('Failed to fetch Piston runtimes, will retry on first execution:', error);
        }
    }

    /**
     * Fetch available runtimes from Piston API
     */
    private static async fetchRuntimes(): Promise<PistonLanguage[]> {
        if (this.cachedRuntimes) {
            return this.cachedRuntimes;
        }

        const response = await axios.get<PistonLanguage[]>(`${PISTON_API_URL}/runtimes`);
        this.cachedRuntimes = response.data;
        return this.cachedRuntimes;
    }

    /**
     * Execute code in specified language using Piston API
     */
    static async execute(
        code: string,
        language: string,
        input: string = '',
        config: ExecutionConfig = {}
    ): Promise<ExecutionResult> {
        const mergedConfig = { ...DEFAULT_CONFIG, ...config };
        const startTime = Date.now();

        try {
            // Map language to Piston language
            const langMapping = LANGUAGE_MAP[language.toLowerCase()];
            if (!langMapping) {
                return {
                    stdout: '',
                    stderr: `Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_MAP).join(', ')}`,
                    exitCode: 1,
                    executionTime: 0,
                    timedOut: false
                };
            }

            // Get runtime version
            const runtimes = await this.fetchRuntimes();
            const runtime = runtimes.find(r =>
                r.language === langMapping.language ||
                r.aliases?.includes(langMapping.language)
            );

            if (!runtime) {
                return {
                    stdout: '',
                    stderr: `Language runtime not available on Piston: ${langMapping.language}`,
                    exitCode: 1,
                    executionTime: 0,
                    timedOut: false
                };
            }

            // Execute code via Piston API
            const response = await axios.post(`${PISTON_API_URL}/execute`, {
                language: runtime.language,
                version: runtime.version,
                files: [
                    {
                        name: this.getFilename(langMapping.language),
                        content: code
                    }
                ],
                stdin: input || config.stdin || '',
                args: [],
                compile_timeout: 10000,
                run_timeout: Math.min(mergedConfig.timeout || 10000, 30000), // Max 30 seconds
            }, {
                timeout: 35000 // Axios timeout slightly higher
            });

            const result = response.data;
            const executionTime = Date.now() - startTime;

            // Handle compilation step
            if (result.compile && result.compile.code !== 0) {
                return {
                    stdout: result.compile.stdout || '',
                    stderr: result.compile.stderr || result.compile.output || '',
                    exitCode: result.compile.code || 1,
                    executionTime,
                    timedOut: false,
                    compilationError: result.compile.stderr || result.compile.output,
                    language: runtime.language,
                    version: runtime.version
                };
            }

            // Return execution result
            return {
                stdout: result.run?.stdout || '',
                stderr: result.run?.stderr || '',
                exitCode: result.run?.code ?? 0,
                executionTime,
                timedOut: result.run?.signal === 'SIGKILL',
                language: runtime.language,
                version: runtime.version
            };

        } catch (error: any) {
            const executionTime = Date.now() - startTime;

            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNABORTED') {
                    return {
                        stdout: '',
                        stderr: 'Execution timed out',
                        exitCode: 124,
                        executionTime,
                        timedOut: true
                    };
                }

                return {
                    stdout: '',
                    stderr: `API Error: ${error.response?.data?.message || error.message}`,
                    exitCode: 1,
                    executionTime,
                    timedOut: false
                };
            }

            logger.error(`Piston execution error for ${language}:`, error);
            return {
                stdout: '',
                stderr: error.message || 'Execution failed',
                exitCode: 1,
                executionTime,
                timedOut: false
            };
        }
    }

    /**
     * Get appropriate filename for language
     */
    private static getFilename(language: string): string {
        const extensions: Record<string, string> = {
            javascript: 'index.js',
            typescript: 'index.ts',
            python: 'main.py',
            java: 'Main.java',
            csharp: 'Program.cs',
            cpp: 'main.cpp',
            c: 'main.c',
            go: 'main.go',
            rust: 'main.rs',
            ruby: 'main.rb',
            php: 'main.php',
            swift: 'main.swift',
            kotlin: 'Main.kt',
            scala: 'Main.scala',
            r: 'main.r',
            dart: 'main.dart',
            bash: 'script.sh',
            perl: 'script.pl',
            lua: 'main.lua',
            haskell: 'Main.hs',
            elixir: 'main.exs',
            clojure: 'main.clj',
            fsharp: 'Program.fs',
            sqlite3: 'query.sql',
            cobol: 'main.cob',
            fortran: 'main.f90',
            pascal: 'main.pas',
            prolog: 'main.pl',
        };
        return extensions[language] || 'main.txt';
    }

    /**
     * Get list of supported languages
     */
    static getSupportedLanguages(): string[] {
        return Object.keys(LANGUAGE_MAP);
    }

    /**
     * Get available runtimes with versions
     */
    static async getAvailableRuntimes(): Promise<PistonLanguage[]> {
        return this.fetchRuntimes();
    }

    /**
     * Check if Piston API is available
     */
    static async checkApiAvailable(): Promise<boolean> {
        try {
            const response = await axios.get(`${PISTON_API_URL}/runtimes`, { timeout: 5000 });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    /**
     * Health check
     */
    static async healthCheck(): Promise<{ status: string; runtimes: number }> {
        const available = await this.checkApiAvailable();
        const runtimes = available ? (await this.fetchRuntimes()).length : 0;
        return {
            status: available ? 'healthy' : 'unavailable',
            runtimes
        };
    }
}

// Initialize on module load
CodeExecutionService.initialize();
