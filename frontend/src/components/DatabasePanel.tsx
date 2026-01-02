import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { SiPostgresql, SiMysql, SiMongodb } from 'react-icons/si';
import { FaPlay, FaTable, FaDatabase, FaHistory, FaPlus, FaTrash } from 'react-icons/fa';

const PanelContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface-color);
  color: var(--text-color);
`;

const TabsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface-elevated);
  min-height: 0;
`;

const Tab = styled.button<{ active?: boolean }>`
  padding: 0.4rem 0.6rem;
  border: none;
  background: ${props => props.active ? 'var(--surface-color)' : 'transparent'};
  color: ${props => props.active ? 'var(--primary-color)' : 'var(--text-muted)'};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  border-bottom: 2px solid ${props => props.active ? 'var(--primary-color)' : 'transparent'};
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: var(--surface-hover);
  }
`;

const QueryArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const QueryEditor = styled.textarea`
  flex: 1;
  min-height: 150px;
  padding: 1rem;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 14px;
  background: #1e1e1e;
  color: #d4d4d4;
  border: none;
  resize: none;
  outline: none;

  &::placeholder {
    color: #6a6a6a;
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--surface-elevated);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  min-width: 0;
`;

const ToolbarButton = styled.button<{ variant?: 'primary' | 'danger' }>`
  padding: 0.375rem 0.75rem;
  border: 1px solid ${props => props.variant === 'danger' ? '#dc3545' : 'var(--border-color)'};
  background: ${props => props.variant === 'primary' ? 'var(--primary-color)' :
        props.variant === 'danger' ? '#dc3545' : 'var(--surface-color)'};
  color: ${props => props.variant ? 'white' : 'var(--text-color)'};
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ResultsArea = styled.div`
  flex: 1;
  overflow: auto;
  min-height: 100px;
  background: var(--surface-color);
`;

const ResultsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;

  th, td {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    text-align: left;
  }

  th {
    background: var(--surface-elevated);
    font-weight: 600;
    position: sticky;
    top: 0;
  }

  tr:hover td {
    background: var(--surface-hover);
  }
`;

const SchemaPanel = styled.div`
  padding: 1rem;
  overflow: auto;
`;

const TableItem = styled.div`
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: var(--surface-elevated);
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background: var(--surface-hover);
  }
`;

const ColumnList = styled.ul`
  margin: 0.5rem 0 0 1rem;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
  color: var(--text-muted);
`;

const ColumnItem = styled.li`
  padding: 0.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  span.type {
    color: var(--primary-color);
    font-family: monospace;
    font-size: 0.75rem;
  }

  span.key {
    color: #ffc107;
    font-size: 0.7rem;
  }
`;

const ConnectionStatus = styled.div<{ connected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: ${props => props.connected ? '#28a745' : '#dc3545'};
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  background: ${props => props.connected ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)'};
  border-radius: 4px;
`;

const HistoryItem = styled.div`
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;

  &:hover {
    background: var(--surface-hover);
  }

  pre {
    margin: 0.25rem 0 0;
    font-size: 0.8rem;
    color: var(--text-muted);
    white-space: pre-wrap;
    word-break: break-all;
  }

  .time {
    font-size: 0.7rem;
    color: var(--text-muted);
  }
`;

interface QueryResult {
    columns: string[];
    rows: any[][];
    rowCount: number;
    executionTime: number;
    error?: string;
}

interface TableSchema {
    name: string;
    columns: Array<{
        name: string;
        type: string;
        isPrimaryKey?: boolean;
        isForeignKey?: boolean;
    }>;
}

interface QueryHistory {
    id: string;
    query: string;
    timestamp: Date;
    database: string;
}

interface DatabasePanelProps {
    sessionId: string;
    onQueryResult?: (result: QueryResult) => void;
}

const DatabasePanel: React.FC<DatabasePanelProps> = ({ sessionId, onQueryResult }) => {
    const [activeTab, setActiveTab] = useState<'query' | 'schema' | 'history'>('query');
    const [database, setDatabase] = useState<'postgresql' | 'mysql' | 'mongodb'>('postgresql');
    const [query, setQuery] = useState('SELECT * FROM users LIMIT 10;');
    const [isConnected, setIsConnected] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [schema, setSchema] = useState<TableSchema[]>([
        {
            name: 'users',
            columns: [
                { name: 'id', type: 'SERIAL', isPrimaryKey: true },
                { name: 'email', type: 'VARCHAR(255)' },
                { name: 'name', type: 'VARCHAR(100)' },
                { name: 'created_at', type: 'TIMESTAMP' },
            ],
        },
        {
            name: 'orders',
            columns: [
                { name: 'id', type: 'SERIAL', isPrimaryKey: true },
                { name: 'user_id', type: 'INTEGER', isForeignKey: true },
                { name: 'total', type: 'DECIMAL(10,2)' },
                { name: 'status', type: 'VARCHAR(50)' },
            ],
        },
    ]);
    const [history, setHistory] = useState<QueryHistory[]>([]);
    const queryRef = useRef<HTMLTextAreaElement>(null);

    const executeQuery = async () => {
        setIsExecuting(true);
        const startTime = Date.now();

        // Simulate query execution
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock result
        const mockResult: QueryResult = {
            columns: ['id', 'email', 'name', 'created_at'],
            rows: [
                [1, 'alice@example.com', 'Alice Smith', '2024-01-15 10:30:00'],
                [2, 'bob@example.com', 'Bob Jones', '2024-01-16 14:20:00'],
                [3, 'carol@example.com', 'Carol White', '2024-01-17 09:15:00'],
            ],
            rowCount: 3,
            executionTime: Date.now() - startTime,
        };

        setResult(mockResult);
        setHistory(prev => [
            {
                id: Date.now().toString(),
                query,
                timestamp: new Date(),
                database,
            },
            ...prev.slice(0, 49), // Keep last 50 queries
        ]);
        setIsExecuting(false);
        onQueryResult?.(mockResult);
    };

    const connectDatabase = () => {
        // Simulate connection
        setIsConnected(true);
    };

    const DatabaseIcon = database === 'postgresql' ? SiPostgresql :
        database === 'mysql' ? SiMysql : SiMongodb;

    return (
        <PanelContainer>
            <TabsContainer>
                <Tab active={activeTab === 'query'} onClick={() => setActiveTab('query')}>
                    <FaPlay size={12} /> Query
                </Tab>
                <Tab active={activeTab === 'schema'} onClick={() => setActiveTab('schema')}>
                    <FaTable size={12} /> Schema
                </Tab>
                <Tab active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
                    <FaHistory size={12} /> History
                </Tab>
                <ConnectionStatus connected={isConnected}>
                    <DatabaseIcon />
                    {isConnected ? 'Connected' : 'Disconnected'}
                </ConnectionStatus>
            </TabsContainer>

            {activeTab === 'query' && (
                <QueryArea>
                    <Toolbar>
                        <select
                            value={database}
                            onChange={(e) => setDatabase(e.target.value as any)}
                            style={{
                                padding: '0.375rem',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--surface-color)',
                                color: 'var(--text-color)',
                            }}
                        >
                            <option value="postgresql">PostgreSQL</option>
                            <option value="mysql">MySQL</option>
                            <option value="mongodb">MongoDB</option>
                        </select>
                        {!isConnected && (
                            <ToolbarButton variant="primary" onClick={connectDatabase}>
                                <FaDatabase /> Connect
                            </ToolbarButton>
                        )}
                        <ToolbarButton
                            variant="primary"
                            onClick={executeQuery}
                            disabled={!isConnected || isExecuting}
                        >
                            <FaPlay /> {isExecuting ? 'Running...' : 'Run Query'}
                        </ToolbarButton>
                        <ToolbarButton onClick={() => setQuery('')}>
                            <FaTrash /> Clear
                        </ToolbarButton>
                    </Toolbar>
                    <QueryEditor
                        ref={queryRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter your SQL query here..."
                        onKeyDown={(e) => {
                            if (e.ctrlKey && e.key === 'Enter') {
                                executeQuery();
                            }
                        }}
                    />
                    <ResultsArea>
                        {result?.error ? (
                            <div style={{ padding: '1rem', color: '#dc3545' }}>
                                Error: {result.error}
                            </div>
                        ) : result ? (
                            <>
                                <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {result.rowCount} rows returned in {result.executionTime}ms
                                </div>
                                <ResultsTable>
                                    <thead>
                                        <tr>
                                            {result.columns.map((col, i) => (
                                                <th key={i}>{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.rows.map((row, i) => (
                                            <tr key={i}>
                                                {row.map((cell, j) => (
                                                    <td key={j}>{cell?.toString() ?? 'NULL'}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </ResultsTable>
                            </>
                        ) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Run a query to see results
                            </div>
                        )}
                    </ResultsArea>
                </QueryArea>
            )}

            {activeTab === 'schema' && (
                <SchemaPanel>
                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FaDatabase /> Tables
                        <ToolbarButton onClick={() => { }} style={{ marginLeft: 'auto' }}>
                            <FaPlus /> New Table
                        </ToolbarButton>
                    </div>
                    {schema.map((table) => (
                        <TableItem key={table.name}>
                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FaTable size={12} /> {table.name}
                            </div>
                            <ColumnList>
                                {table.columns.map((col) => (
                                    <ColumnItem key={col.name}>
                                        {col.name}
                                        <span className="type">{col.type}</span>
                                        {col.isPrimaryKey && <span className="key">PK</span>}
                                        {col.isForeignKey && <span className="key">FK</span>}
                                    </ColumnItem>
                                ))}
                            </ColumnList>
                        </TableItem>
                    ))}
                </SchemaPanel>
            )}

            {activeTab === 'history' && (
                <div style={{ overflow: 'auto', flex: 1 }}>
                    {history.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No query history yet
                        </div>
                    ) : (
                        history.map((item) => (
                            <HistoryItem key={item.id} onClick={() => { setQuery(item.query); setActiveTab('query'); }}>
                                <div className="time">
                                    {item.timestamp.toLocaleTimeString()} - {item.database}
                                </div>
                                <pre>{item.query.slice(0, 100)}{item.query.length > 100 ? '...' : ''}</pre>
                            </HistoryItem>
                        ))
                    )}
                </div>
            )}
        </PanelContainer>
    );
};

export default DatabasePanel;
