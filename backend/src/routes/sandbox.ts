import express from 'express';
import { CodeExecutionService } from '../services/codeExecutionService';
import { executionLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Fallback languages with proper structure matching frontend expectations
const FALLBACK_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', version: 'ES2022', monacoLanguage: 'javascript', category: 'web' },
  { id: 'typescript', name: 'TypeScript', version: '5.0', monacoLanguage: 'typescript', category: 'web' },
  { id: 'python', name: 'Python', version: '3.11', monacoLanguage: 'python', category: 'scripting' },
  { id: 'java', name: 'Java', version: '17', monacoLanguage: 'java', category: 'systems' },
  { id: 'cpp', name: 'C++', version: '17', monacoLanguage: 'cpp', category: 'systems' },
  { id: 'c', name: 'C', version: 'C11', monacoLanguage: 'c', category: 'systems' },
  { id: 'csharp', name: 'C#', version: '10', monacoLanguage: 'csharp', category: 'systems' },
  { id: 'go', name: 'Go', version: '1.21', monacoLanguage: 'go', category: 'systems' },
  { id: 'rust', name: 'Rust', version: '1.70', monacoLanguage: 'rust', category: 'systems' },
  { id: 'ruby', name: 'Ruby', version: '3.2', monacoLanguage: 'ruby', category: 'scripting' },
  { id: 'php', name: 'PHP', version: '8.2', monacoLanguage: 'php', category: 'scripting' },
  { id: 'swift', name: 'Swift', version: '5.8', monacoLanguage: 'swift', category: 'systems' },
  { id: 'kotlin', name: 'Kotlin', version: '1.9', monacoLanguage: 'kotlin', category: 'systems' },
  { id: 'bash', name: 'Bash', version: '5.2', monacoLanguage: 'shell', category: 'scripting' },
];

// Language category mapping
const LANGUAGE_CATEGORIES: Record<string, string> = {
  javascript: 'web', typescript: 'web', html: 'web', css: 'web',
  python: 'scripting', ruby: 'scripting', php: 'scripting', perl: 'scripting', lua: 'scripting', bash: 'scripting',
  java: 'systems', cpp: 'systems', c: 'systems', csharp: 'systems', go: 'systems', rust: 'systems', swift: 'systems', kotlin: 'systems', scala: 'systems', dart: 'systems',
  haskell: 'functional', elixir: 'functional', clojure: 'functional', fsharp: 'functional', erlang: 'functional',
  sql: 'data', r: 'data', julia: 'data',
};

// GET /api/v1/languages -> get available languages from Piston
router.get('/languages', async (req, res) => {
  try {
    const runtimes = await CodeExecutionService.getAvailableRuntimes();
    const languages = runtimes.map(r => ({
      id: r.language,
      name: r.language.charAt(0).toUpperCase() + r.language.slice(1),
      version: r.version,
      monacoLanguage: r.language,
      category: LANGUAGE_CATEGORIES[r.language] || 'other'
    }));
    res.status(200).json({ status: 'success', data: { languages } });
  } catch (error: any) {
    // Return fallback languages when Piston is unreachable
    res.status(200).json({ status: 'success', data: { languages: FALLBACK_LANGUAGES } });
  }
});

// POST /api/v1/execute -> execute code using Piston API
router.post('/execute', executionLimiter, async (req, res) => {
  try {
    const { code, language, stdin } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: code and language'
      });
    }

    const result = await CodeExecutionService.execute(code, language, stdin || '');

    res.status(200).json({
      status: 'success',
      data: {
        output: result.stdout,
        error: result.stderr,
        exitCode: result.exitCode,
        executionTime: result.executionTime,
        timedOut: result.timedOut,
        language: result.language,
        version: result.version
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Execution failed'
    });
  }
});

export default router;