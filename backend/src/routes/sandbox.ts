import express from 'express';
import { CodeExecutionService } from '../services/codeExecutionService';
import { executionLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// GET /api/v1/languages -> get available languages from Piston
router.get('/languages', async (req, res) => {
  try {
    const runtimes = await CodeExecutionService.getAvailableRuntimes();
    const languages = runtimes.map(r => ({
      id: r.language,
      name: r.language.charAt(0).toUpperCase() + r.language.slice(1),
      version: r.version,
      monacoLanguage: r.language
    }));
    res.status(200).json({ status: 'success', data: { languages } });
  } catch (error: any) {
    // Fallback languages when Piston is unreachable
    const FALLBACK_LANGUAGES = [
      { id: 'javascript', name: 'JavaScript', version: 'ES2022', monacoLanguage: 'javascript' },
      { id: 'typescript', name: 'TypeScript', version: '5.0', monacoLanguage: 'typescript' },
      { id: 'python', name: 'Python', version: '3.11', monacoLanguage: 'python' },
      { id: 'java', name: 'Java', version: '17', monacoLanguage: 'java' },
      { id: 'cpp', name: 'C++', version: '17', monacoLanguage: 'cpp' },
      { id: 'c', name: 'C', version: 'C11', monacoLanguage: 'c' },
      { id: 'csharp', name: 'C#', version: '10', monacoLanguage: 'csharp' },
      { id: 'go', name: 'Go', version: '1.21', monacoLanguage: 'go' },
      { id: 'rust', name: 'Rust', version: '1.70', monacoLanguage: 'rust' },
      { id: 'ruby', name: 'Ruby', version: '3.2', monacoLanguage: 'ruby' },
      { id: 'php', name: 'PHP', version: '8.2', monacoLanguage: 'php' },
    ];
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