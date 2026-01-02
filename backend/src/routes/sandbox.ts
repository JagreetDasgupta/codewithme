import express from 'express';
import { AppError } from '../middleware/errorHandler';
import { executionLimiter } from '../middleware/rateLimiter';

const router = express.Router();
const SANDBOX_URL = process.env.SANDBOX_URL || 'http://sandbox:5000';

// Fallback languages when sandbox is unavailable (for development)
const FALLBACK_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', version: 'ES2022', icon: '🟨', monacoLanguage: 'javascript' },
  { id: 'typescript', name: 'TypeScript', version: '5.0', icon: '🔷', monacoLanguage: 'typescript' },
  { id: 'python', name: 'Python', version: '3.11', icon: '🐍', monacoLanguage: 'python' },
  { id: 'java', name: 'Java', version: '17', icon: '☕', monacoLanguage: 'java' },
  { id: 'cpp', name: 'C++', version: '17', icon: '⚙️', monacoLanguage: 'cpp' },
  { id: 'c', name: 'C', version: 'C11', icon: '🔧', monacoLanguage: 'c' },
  { id: 'csharp', name: 'C#', version: '10', icon: '🟣', monacoLanguage: 'csharp' },
  { id: 'go', name: 'Go', version: '1.21', icon: '🐹', monacoLanguage: 'go' },
  { id: 'rust', name: 'Rust', version: '1.70', icon: '🦀', monacoLanguage: 'rust' },
  { id: 'ruby', name: 'Ruby', version: '3.2', icon: '💎', monacoLanguage: 'ruby' },
  { id: 'php', name: 'PHP', version: '8.2', icon: '🐘', monacoLanguage: 'php' },
  { id: 'swift', name: 'Swift', version: '5.8', icon: '🍎', monacoLanguage: 'swift' },
  { id: 'kotlin', name: 'Kotlin', version: '1.9', icon: '🟠', monacoLanguage: 'kotlin' },
  { id: 'sql', name: 'SQL', version: 'Standard', icon: '🗃️', monacoLanguage: 'sql' },
];

// GET /api/v1/languages -> proxy to sandbox (with fallback)
router.get('/languages', async (req, res, next) => {
  try {
    const resp = await fetch(`${SANDBOX_URL}/api/v1/languages`);
    if (!resp.ok) {
      // Return fallback instead of error
      return res.status(200).json({ status: 'success', data: { languages: FALLBACK_LANGUAGES } });
    }
    const data = await resp.json();
    res.status(200).json(data);
  } catch (error: any) {
    // Return fallback languages when sandbox is unreachable
    res.status(200).json({ status: 'success', data: { languages: FALLBACK_LANGUAGES } });
  }
});

// POST /api/v1/execute -> proxy to sandbox (with rate limiting)
router.post('/execute', executionLimiter, async (req, res, next) => {
  try {
    const resp = await fetch(`${SANDBOX_URL}/api/v1/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return next(new AppError(`Sandbox execute error: ${resp.statusText} - ${errText}`, resp.status));
    }
    const data = await resp.json();
    res.status(200).json(data);
  } catch (error: any) {
    next(new AppError(`Sandbox execute request failed: ${error.message || error}`, 500));
  }
});

export default router;