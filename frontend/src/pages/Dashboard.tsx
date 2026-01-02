import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import styled, { keyframes } from 'styled-components';
import { FiPlus, FiCopy, FiCheck, FiCalendar, FiUsers, FiCode, FiTrash2 } from 'react-icons/fi';

interface Session {
  id: string;
  title: string;
  description: string;
  createdAt?: string;
  created_at?: string;
  participants: number;
  status?: string;
  language?: string;
}

// Safe date formatter to handle undefined or invalid dates
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
};

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const DashboardContainer = styled.div`
  min-height: calc(100vh - 72px);
  padding: var(--spacing-2xl) var(--spacing-lg);
  background: linear-gradient(to bottom, var(--gray-50), white);
  animation: ${fadeIn} 0.5s ease-out;
`;

const Header = styled.div`
  max-width: 1400px;
  margin: 0 auto var(--spacing-2xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
`;

const WelcomeSection = styled.div`
  flex: 1;
  min-width: 300px;
`;

const WelcomeTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 var(--spacing-sm);
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const WelcomeSubtitle = styled.p`
  color: var(--text-muted);
  font-size: 1.125rem;
  margin: 0;
`;

const NewSessionButton = styled.button`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-md);
  white-space: nowrap;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    font-size: 1.25rem;
  }
`;

const ContentContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const NewSessionForm = styled.div`
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-2xl);
  margin-bottom: var(--spacing-2xl);
  box-shadow: var(--shadow-lg);
  animation: ${slideIn} 0.3s ease-out;
`;

const FormTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 var(--spacing-xl);
  color: var(--text-primary);
`;

const FormGrid = styled.div`
  display: grid;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
`;

const SessionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-2xl);
`;

const SessionCard = styled.div`
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
  animation: ${fadeIn} 0.5s ease-out;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl);
    border-color: var(--primary-light);
  }
`;

const SessionHeader = styled.div`
  margin-bottom: var(--spacing-md);
`;

const SessionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 var(--spacing-sm);
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const SessionDescription = styled.p`
  color: var(--text-secondary);
  font-size: 0.9375rem;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
`;

const SessionMeta = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin: var(--spacing-md) 0;
  padding: var(--spacing-md) 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  font-size: 0.875rem;
  color: var(--text-muted);
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  
  svg {
    font-size: 1rem;
  }
`;

const SessionActions = styled.div`
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: 0.75rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);

  ${props => props.variant === 'primary' ? `
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: white;
    box-shadow: var(--shadow-sm);

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
  ` : `
    background: var(--gray-100);
    color: var(--text-primary);
    border: 1px solid var(--border-color);

    &:hover {
      background: var(--gray-200);
      border-color: var(--gray-300);
    }
  `}

  svg {
    font-size: 1rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: var(--spacing-2xl) var(--spacing-lg);
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: var(--spacing-lg);
`;

const EmptyTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 var(--spacing-sm);
  color: var(--text-primary);
`;

const EmptyDescription = styled.p`
  color: var(--text-muted);
  font-size: 1rem;
  margin: 0 0 var(--spacing-xl);
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid var(--gray-200);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionDescription, setNewSessionDescription] = useState('');
  const [newSessionLanguage, setNewSessionLanguage] = useState('javascript');
  const [newSessionPassword, setNewSessionPassword] = useState('');
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const availableLanguages = [
    { id: 'javascript', name: 'JavaScript', icon: '🟨' },
    { id: 'typescript', name: 'TypeScript', icon: '🔷' },
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'java', name: 'Java', icon: '☕' },
    { id: 'cpp', name: 'C++', icon: '⚙️' },
    { id: 'csharp', name: 'C#', icon: '🟣' },
    { id: 'go', name: 'Go', icon: '🔵' },
    { id: 'rust', name: 'Rust', icon: '🦀' },
    { id: 'ruby', name: 'Ruby', icon: '💎' },
    { id: 'php', name: 'PHP', icon: '🐘' },
  ];

  // Use ref for synchronous locking to prevent double-submit race conditions
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await axios.get('/api/v1/sessions');
        const data = res?.data?.data?.sessions ?? [];
        setSessions(data);
      } catch (err: any) {
        // Don't show error for 401 - user is just logged out
        if (err?.response?.status === 401) {
          return;
        }
        const msg = err?.response?.data?.message || (err instanceof Error ? err.message : 'An error occurred');
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isCreating) return;

    setError(null);
    setIsCreating(true);
    isSubmittingRef.current = true;

    try {
      const res = await axios.post('/api/v1/sessions', {
        title: newSessionTitle,
        description: newSessionDescription,
        language: newSessionLanguage,
        password: newSessionPassword || undefined,
      });
      const created = res?.data?.data?.session;
      if (!created) {
        throw new Error('Invalid create session response');
      }
      setSessions([created, ...sessions]);
      setNewSessionTitle('');
      setNewSessionDescription('');
      setNewSessionLanguage('javascript');
      setNewSessionPassword('');
      setShowNewSessionForm(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to create session');
      setError(msg);
    } finally {
      setIsCreating(false);
      isSubmittingRef.current = false;
    }
  };

  const copyInviteLink = async (id: string) => {
    const url = `${window.location.origin}/session/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      setError('Failed to copy invite link');
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post('/api/v1/sessions/join', {
        id: joinId,
        password: joinPassword || undefined,
      });
      const session = res?.data?.data?.session;
      if (session) {
        navigate(`/session/${session.id}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to join session. Please check ID and password.';
      setError(msg);
    }
  };

  const handleDeleteSession = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }
    setError(null);
    try {
      await axios.delete(`/api/v1/sessions/${id}`);
      setSessions(sessions.filter(s => s.id !== id));
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete session';
      setError(msg);
    }
  };

  if (loading) {
    return (
      <DashboardContainer>
        <LoadingContainer>
          <Spinner />
        </LoadingContainer>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <Header>
        <WelcomeSection>
          <WelcomeTitle>Welcome back, {user?.name}! 👋</WelcomeTitle>
          <WelcomeSubtitle>Manage your coding interview sessions</WelcomeSubtitle>
        </WelcomeSection>
        {sessions.length > 0 && (
          <NewSessionButton onClick={() => setShowNewSessionForm(!showNewSessionForm)} disabled={isCreating}>
            <FiPlus />
            {showNewSessionForm ? 'Cancel' : 'New Session'}
          </NewSessionButton>
        )}
      </Header>

      <ContentContainer>
        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--spacing-xl)' }}>
            {error}
          </div>
        )}

        {showNewSessionForm && (
          <NewSessionForm>
            <FormTitle>Create New Session</FormTitle>
            <form onSubmit={handleCreateSession}>
              <FormGrid>
                <div className="form-group">
                  <label htmlFor="title">Session Title</label>
                  <input
                    type="text"
                    id="title"
                    className="form-control"
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                    placeholder="e.g., Frontend Developer Interview"
                    required
                    disabled={isCreating}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    className="form-control"
                    value={newSessionDescription}
                    onChange={(e) => setNewSessionDescription(e.target.value)}
                    placeholder="Brief description of the interview session..."
                    rows={3}
                    required
                    disabled={isCreating}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="language">Programming Language</label>
                  <select
                    id="language"
                    className="form-control"
                    value={newSessionLanguage}
                    onChange={(e) => setNewSessionLanguage(e.target.value)}
                    disabled={isCreating}
                  >
                    {availableLanguages.map(lang => (
                      <option key={lang.id} value={lang.id}>
                        {lang.icon} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password (Optional)</label>
                  <input
                    type="password"
                    id="password"
                    className="form-control"
                    value={newSessionPassword}
                    onChange={(e) => setNewSessionPassword(e.target.value)}
                    placeholder="Leave empty for public session"
                    autoComplete="new-password"
                    disabled={isCreating}
                  />
                </div>
              </FormGrid>
              <FormActions>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowNewSessionForm(false);
                    setNewSessionTitle('');
                    setNewSessionDescription('');
                  }}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Session'}
                </button>
              </FormActions>
            </form>
          </NewSessionForm>
        )}

        {showJoinForm && (
          <NewSessionForm>
            <form onSubmit={handleJoinSession}>
              <h3>Join Meeting</h3>
              <p style={{ color: 'var(--text-muted)' }}>Enter the meeting ID and password to join.</p>

              <FormGrid>
                <div className="form-group">
                  <label htmlFor="join-id">Meeting ID</label>
                  <input
                    type="text"
                    id="join-id"
                    className="form-control"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value)}
                    placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="join-password">Password</label>
                  <input
                    type="password"
                    id="join-password"
                    className="form-control"
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    placeholder="Session password"
                  />
                </div>
              </FormGrid>
              <FormActions>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowJoinForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Join Session
                </button>
              </FormActions>
            </form>
          </NewSessionForm>
        )}

        {sessions.length === 0 ? (
          <EmptyState>
            <EmptyIcon>📝</EmptyIcon>
            <EmptyTitle>No sessions yet</EmptyTitle>
            <EmptyDescription>
              Create your first coding interview session to get started!
            </EmptyDescription>
            <NewSessionButton onClick={() => setShowNewSessionForm(true)}>
              <FiPlus /> New Session
            </NewSessionButton>
            <NewSessionButton onClick={() => setShowJoinForm(true)} style={{ background: 'var(--gray-800)' }}>
              <FiCode /> Join Meeting
            </NewSessionButton>
          </EmptyState>
        ) : (
          <SessionsGrid>
            {sessions.map((session) => (
              <SessionCard key={session.id}>
                <SessionHeader>
                  <SessionTitle>{session.title}</SessionTitle>
                  <SessionDescription>{session.description || 'No description'}</SessionDescription>
                </SessionHeader>
                <SessionMeta>
                  <MetaItem>
                    <FiCalendar />
                    {formatDate(session.createdAt || session.created_at)}
                  </MetaItem>
                  <MetaItem>
                    <FiUsers />
                    {session.participants || 0} participants
                  </MetaItem>
                </SessionMeta>
                <SessionActions>
                  <Link to={`/session/${session.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                    <ActionButton variant="primary" as="div">
                      <FiCode />
                      Join
                    </ActionButton>
                  </Link>
                  <ActionButton
                    variant="secondary"
                    onClick={() => copyInviteLink(session.id)}
                    title="Copy invite link"
                  >
                    {copiedId === session.id ? <FiCheck /> : <FiCopy />}
                  </ActionButton>
                  <ActionButton
                    variant="secondary"
                    onClick={() => handleDeleteSession(session.id, session.title)}
                    title="Delete session"
                    style={{ color: 'var(--error-color, #dc3545)' }}
                  >
                    <FiTrash2 />
                  </ActionButton>
                </SessionActions>
              </SessionCard>
            ))}
          </SessionsGrid>
        )}
      </ContentContainer>
    </DashboardContainer>
  );
};

export default Dashboard;
