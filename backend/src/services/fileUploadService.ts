import logger from '../utils/logger';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import multer from 'multer';
import { Request } from 'express';

export interface UploadedFile {
    id: string;
    sessionId: string;
    userId: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    isDirectory: boolean;
    parentId?: string;
    content?: string;
    hash: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface FileTree {
    id: string;
    name: string;
    type: 'file' | 'directory';
    size?: number;
    mimeType?: string;
    children?: FileTree[];
}

interface StorageConfig {
    type: 'local' | 's3';
    basePath: string;
    maxFileSize: number;      // bytes
    maxTotalSize: number;     // bytes per session
    allowedMimeTypes: string[];
}

const DEFAULT_CONFIG: StorageConfig = {
    type: 'local',
    basePath: process.env.UPLOAD_PATH || './uploads',
    maxFileSize: 10 * 1024 * 1024,     // 10 MB
    maxTotalSize: 100 * 1024 * 1024,   // 100 MB per session
    allowedMimeTypes: [
        'text/plain',
        'text/javascript',
        'text/typescript',
        'text/html',
        'text/css',
        'text/markdown',
        'text/x-python',
        'text/x-java-source',
        'text/x-c',
        'text/x-c++',
        'application/json',
        'application/javascript',
        'application/typescript',
        'application/octet-stream',
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/svg+xml'
    ]
};

/**
 * File Upload Service for project file management
 */
export class FileUploadService {
    private static config: StorageConfig = DEFAULT_CONFIG;

    /**
     * Initialize upload directory
     */
    static async initialize() {
        try {
            await fs.mkdir(this.config.basePath, { recursive: true });
            logger.info(`File upload directory: ${this.config.basePath}`);
        } catch (error) {
            logger.error('Failed to create upload directory:', error);
        }
    }

    /**
     * Configure multer for file uploads
     */
    static getMulterConfig() {
        const storage = multer.diskStorage({
            destination: async (req: Request, file, cb) => {
                const sessionId = (req.params as any).sessionId || 'temp';
                const sessionDir = path.join(this.config.basePath, sessionId);
                await fs.mkdir(sessionDir, { recursive: true });
                cb(null, sessionDir);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
                const ext = path.extname(file.originalname);
                cb(null, `${uniqueSuffix}${ext}`);
            }
        });

        const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
            if (this.config.allowedMimeTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error(`File type ${file.mimetype} not allowed`));
            }
        };

        return multer({
            storage,
            fileFilter,
            limits: {
                fileSize: this.config.maxFileSize
            }
        });
    }

    /**
     * Save uploaded file metadata to database
     */
    static async saveFile(
        sessionId: string,
        userId: string,
        file: Express.Multer.File,
        parentId?: string
    ): Promise<UploadedFile> {
        const fileId = uuidv4();
        const content = await this.readFileContent(file.path, file.mimetype);
        const hash = this.calculateHash(content || '');
        const now = new Date();

        const uploadedFile: UploadedFile = {
            id: fileId,
            sessionId,
            userId,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            isDirectory: false,
            parentId,
            content,
            hash,
            createdAt: now,
            updatedAt: now
        };

        await pool.query(
            `INSERT INTO session_files 
       (id, session_id, user_id, filename, original_name, mime_type, size, path, 
        is_directory, parent_id, content, hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                fileId, sessionId, userId, file.filename, file.originalname,
                file.mimetype, file.size, file.path, false, parentId,
                content, hash, now, now
            ]
        );

        logger.info(`File uploaded: ${file.originalname} to session ${sessionId}`);
        return uploadedFile;
    }

    /**
     * Create directory in session
     */
    static async createDirectory(
        sessionId: string,
        userId: string,
        name: string,
        parentId?: string
    ): Promise<UploadedFile> {
        const dirId = uuidv4();
        const dirPath = path.join(this.config.basePath, sessionId, dirId);
        await fs.mkdir(dirPath, { recursive: true });
        const now = new Date();

        const directory: UploadedFile = {
            id: dirId,
            sessionId,
            userId,
            filename: name,
            originalName: name,
            mimeType: 'application/x-directory',
            size: 0,
            path: dirPath,
            isDirectory: true,
            parentId,
            hash: '',
            createdAt: now,
            updatedAt: now
        };

        await pool.query(
            `INSERT INTO session_files 
       (id, session_id, user_id, filename, original_name, mime_type, size, path, 
        is_directory, parent_id, hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
                dirId, sessionId, userId, name, name,
                'application/x-directory', 0, dirPath, true, parentId,
                '', now, now
            ]
        );

        return directory;
    }

    /**
     * Save file content from editor (code files)
     */
    static async saveFileContent(
        sessionId: string,
        userId: string,
        filename: string,
        content: string,
        parentId?: string
    ): Promise<UploadedFile> {
        const fileId = uuidv4();
        const hash = this.calculateHash(content);
        const mimeType = this.getMimeType(filename);
        const size = Buffer.byteLength(content, 'utf8');
        const filePath = path.join(this.config.basePath, sessionId, fileId);
        const now = new Date();

        // Save to filesystem
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf8');

        // Check if file already exists (update instead)
        const existing = await pool.query(
            `SELECT id FROM session_files 
       WHERE session_id = $1 AND original_name = $2 AND (parent_id = $3 OR ($3 IS NULL AND parent_id IS NULL))`,
            [sessionId, filename, parentId]
        );

        if (existing.rows.length > 0) {
            await pool.query(
                `UPDATE session_files SET content = $1, hash = $2, size = $3, updated_at = $4 WHERE id = $5`,
                [content, hash, size, now, existing.rows[0].id]
            );
            return this.getFile(existing.rows[0].id);
        }

        const file: UploadedFile = {
            id: fileId,
            sessionId,
            userId,
            filename,
            originalName: filename,
            mimeType,
            size,
            path: filePath,
            isDirectory: false,
            parentId,
            content,
            hash,
            createdAt: now,
            updatedAt: now
        };

        await pool.query(
            `INSERT INTO session_files 
       (id, session_id, user_id, filename, original_name, mime_type, size, path, 
        is_directory, parent_id, content, hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                fileId, sessionId, userId, filename, filename,
                mimeType, size, filePath, false, parentId,
                content, hash, now, now
            ]
        );

        return file;
    }

    /**
     * Get file by ID
     */
    static async getFile(fileId: string): Promise<UploadedFile> {
        const result = await pool.query(
            `SELECT * FROM session_files WHERE id = $1`,
            [fileId]
        );

        if (result.rows.length === 0) {
            throw new Error('File not found');
        }

        return this.mapFileRow(result.rows[0]);
    }

    /**
     * Get file tree for session
     */
    static async getFileTree(sessionId: string): Promise<FileTree[]> {
        const result = await pool.query(
            `SELECT id, original_name, is_directory, size, mime_type, parent_id 
       FROM session_files WHERE session_id = $1
       ORDER BY is_directory DESC, original_name ASC`,
            [sessionId]
        );

        const files = result.rows;
        const fileMap = new Map<string, FileTree>();
        const rootFiles: FileTree[] = [];

        // First pass: create all nodes
        for (const file of files) {
            fileMap.set(file.id, {
                id: file.id,
                name: file.original_name,
                type: file.is_directory ? 'directory' : 'file',
                size: file.size,
                mimeType: file.mime_type,
                children: file.is_directory ? [] : undefined
            });
        }

        // Second pass: build tree
        for (const file of files) {
            const node = fileMap.get(file.id)!;
            if (file.parent_id && fileMap.has(file.parent_id)) {
                fileMap.get(file.parent_id)!.children!.push(node);
            } else {
                rootFiles.push(node);
            }
        }

        return rootFiles;
    }

    /**
     * Delete file or directory
     */
    static async deleteFile(fileId: string): Promise<void> {
        const file = await this.getFile(fileId);

        // Delete children first if directory
        if (file.isDirectory) {
            const children = await pool.query(
                `SELECT id FROM session_files WHERE parent_id = $1`,
                [fileId]
            );
            for (const child of children.rows) {
                await this.deleteFile(child.id);
            }
        }

        // Delete from filesystem
        try {
            if (file.isDirectory) {
                await fs.rm(file.path, { recursive: true, force: true });
            } else {
                await fs.unlink(file.path);
            }
        } catch (error) {
            // Ignore filesystem errors
        }

        // Delete from database
        await pool.query(`DELETE FROM session_files WHERE id = $1`, [fileId]);

        logger.info(`File deleted: ${file.originalName}`);
    }

    /**
     * Get total storage used by session
     */
    static async getSessionStorageUsed(sessionId: string): Promise<number> {
        const result = await pool.query(
            `SELECT COALESCE(SUM(size), 0) as total FROM session_files WHERE session_id = $1`,
            [sessionId]
        );
        return parseInt(result.rows[0].total);
    }

    /**
     * Read file content safely
     */
    private static async readFileContent(filePath: string, mimeType: string): Promise<string | undefined> {
        if (!mimeType.startsWith('text/') && !mimeType.includes('json') && !mimeType.includes('javascript')) {
            return undefined; // Don't store binary content as string
        }

        try {
            const content = await fs.readFile(filePath, 'utf8');
            return content.length <= 1024 * 1024 ? content : undefined; // Max 1MB content storage
        } catch {
            return undefined;
        }
    }

    /**
     * Calculate file hash
     */
    private static calculateHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
    }

    /**
     * Get MIME type from filename
     */
    private static getMimeType(filename: string): string {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.js': 'text/javascript',
            '.ts': 'text/typescript',
            '.jsx': 'text/javascript',
            '.tsx': 'text/typescript',
            '.py': 'text/x-python',
            '.java': 'text/x-java-source',
            '.c': 'text/x-c',
            '.cpp': 'text/x-c++',
            '.h': 'text/x-c',
            '.hpp': 'text/x-c++',
            '.html': 'text/html',
            '.css': 'text/css',
            '.json': 'application/json',
            '.md': 'text/markdown',
            '.txt': 'text/plain',
            '.go': 'text/x-go',
            '.rs': 'text/x-rust',
            '.rb': 'text/x-ruby',
            '.php': 'text/x-php'
        };
        return mimeTypes[ext] || 'text/plain';
    }

    /**
     * Map database row to UploadedFile
     */
    private static mapFileRow(row: any): UploadedFile {
        return {
            id: row.id,
            sessionId: row.session_id,
            userId: row.user_id,
            filename: row.filename,
            originalName: row.original_name,
            mimeType: row.mime_type,
            size: row.size,
            path: row.path,
            isDirectory: row.is_directory,
            parentId: row.parent_id,
            content: row.content,
            hash: row.hash,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}

// Initialize on module load
FileUploadService.initialize();
