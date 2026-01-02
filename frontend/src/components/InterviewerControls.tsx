import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
    FaLock, FaUnlock, FaEye, FaEyeSlash, FaPlay, FaPause, FaCog,
    FaUserCheck, FaClipboardCheck, FaClock, FaHistory, FaFlag,
    FaDownload, FaShare, FaComments, FaChartLine
} from 'react-icons/fa';

const ControlsContainer = styled.div`
  background: var(--surface-elevated);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const ControlsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-color);
`;

const ControlsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.5rem;
`;

const ControlButton = styled.button<{ active?: boolean; variant?: 'danger' | 'success' | 'warning' }>`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${props =>
        props.variant === 'danger' ? '#dc3545' :
            props.variant === 'success' ? '#28a745' :
                props.variant === 'warning' ? '#ffc107' :
                    props.active ? 'var(--primary-color)' : 'var(--border-color)'};
  background: ${props =>
        props.variant === 'danger' ? (props.active ? '#dc3545' : 'transparent') :
            props.variant === 'success' ? (props.active ? '#28a745' : 'transparent') :
                props.variant === 'warning' ? (props.active ? '#ffc107' : 'transparent') :
                    props.active ? 'var(--primary-color)' : 'var(--surface-color)'};
  color: ${props =>
        (props.active && props.variant) || props.active ? 'white' :
            props.variant === 'warning' && props.active ? 'black' : 'var(--text-color)'};
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  transition: all 0.2s;

  &:hover {
    opacity: 0.9;
    border-color: ${props => props.variant === 'danger' ? '#dc3545' : 'var(--primary-color)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Section = styled.div`
  margin-top: 1rem;
`;

const SectionTitle = styled.h4`
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ParticipantList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
`;

const ParticipantItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--surface-color);
  border-radius: 4px;
  font-size: 0.85rem;
`;

const ParticipantName = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ParticipantActions = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const SmallButton = styled.button<{ variant?: 'danger' | 'success' }>`
  padding: 0.25rem 0.5rem;
  border: none;
  background: ${props =>
        props.variant === 'danger' ? '#dc354520' :
            props.variant === 'success' ? '#28a74520' : 'var(--surface-hover)'};
  color: ${props =>
        props.variant === 'danger' ? '#dc3545' :
            props.variant === 'success' ? '#28a745' : 'var(--text-color)'};
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &:hover {
    opacity: 0.8;
  }
`;

const StatusIndicator = styled.span<{ status: 'active' | 'idle' | 'flagged' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props =>
        props.status === 'active' ? '#28a745' :
            props.status === 'flagged' ? '#dc3545' : '#ffc107'};
`;

const TimerDisplay = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 1.5rem;
  text-align: center;
  padding: 0.5rem;
  background: #1e1e1e;
  color: #00ff00;
  border-radius: 4px;
  margin-bottom: 0.5rem;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const MetricCard = styled.div`
  background: var(--surface-color);
  padding: 0.5rem;
  border-radius: 4px;
  text-align: center;

  .value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--primary-color);
  }

  .label {
    font-size: 0.7rem;
    color: var(--text-muted);
    text-transform: uppercase;
  }
`;

interface Participant {
    id: string;
    name: string;
    status: 'active' | 'idle' | 'flagged';
    tabSwitches: number;
    codeExecutions: number;
}

interface InterviewerControlsProps {
    isHost: boolean;
    sessionId: string;
    participants?: Participant[];
    elapsedTime?: number;
    onLockEditor?: (locked: boolean) => void;
    onHideCode?: (hidden: boolean) => void;
    onPauseInterview?: (paused: boolean) => void;
    onEndInterview?: () => void;
    onExportSession?: () => void;
    onFlagParticipant?: (participantId: string) => void;
    onKickParticipant?: (participantId: string) => void;
}

const InterviewerControls: React.FC<InterviewerControlsProps> = ({
    isHost,
    sessionId,
    participants = [],
    elapsedTime = 0,
    onLockEditor,
    onHideCode,
    onPauseInterview,
    onEndInterview,
    onExportSession,
    onFlagParticipant,
    onKickParticipant
}) => {
    const [editorLocked, setEditorLocked] = useState(false);
    const [codeHidden, setCodeHidden] = useState(false);
    const [interviewPaused, setInterviewPaused] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    if (!isHost) {
        return null; // Only show to host/interviewer
    }

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleLockEditor = () => {
        setEditorLocked(!editorLocked);
        onLockEditor?.(!editorLocked);
    };

    const handleHideCode = () => {
        setCodeHidden(!codeHidden);
        onHideCode?.(!codeHidden);
    };

    const handlePauseInterview = () => {
        setInterviewPaused(!interviewPaused);
        onPauseInterview?.(!interviewPaused);
    };

    const totalTabSwitches = participants.reduce((sum, p) => sum + p.tabSwitches, 0);
    const totalExecutions = participants.reduce((sum, p) => sum + p.codeExecutions, 0);
    const flaggedCount = participants.filter(p => p.status === 'flagged').length;

    return (
        <ControlsContainer>
            <ControlsHeader>
                <Title>
                    <FaCog /> Interviewer Controls
                </Title>
                <ControlButton onClick={() => setShowSettings(!showSettings)}>
                    <FaCog /> Settings
                </ControlButton>
            </ControlsHeader>

            <TimerDisplay>{formatTime(elapsedTime)}</TimerDisplay>

            <ControlsGrid>
                <ControlButton active={editorLocked} onClick={handleLockEditor}>
                    {editorLocked ? <FaLock /> : <FaUnlock />}
                    {editorLocked ? 'Unlock Editor' : 'Lock Editor'}
                </ControlButton>

                <ControlButton active={codeHidden} onClick={handleHideCode}>
                    {codeHidden ? <FaEyeSlash /> : <FaEye />}
                    {codeHidden ? 'Show Code' : 'Hide Code'}
                </ControlButton>

                <ControlButton
                    active={interviewPaused}
                    variant={interviewPaused ? 'warning' : undefined}
                    onClick={handlePauseInterview}
                >
                    {interviewPaused ? <FaPlay /> : <FaPause />}
                    {interviewPaused ? 'Resume' : 'Pause'}
                </ControlButton>

                <ControlButton onClick={onExportSession}>
                    <FaDownload /> Export
                </ControlButton>

                <ControlButton variant="danger" onClick={onEndInterview}>
                    <FaFlag /> End Interview
                </ControlButton>
            </ControlsGrid>

            <MetricsGrid>
                <MetricCard>
                    <div className="value">{participants.length}</div>
                    <div className="label">Participants</div>
                </MetricCard>
                <MetricCard>
                    <div className="value">{totalTabSwitches}</div>
                    <div className="label">Tab Switches</div>
                </MetricCard>
                <MetricCard>
                    <div className="value">{totalExecutions}</div>
                    <div className="label">Executions</div>
                </MetricCard>
            </MetricsGrid>

            <Section>
                <SectionTitle>Participants</SectionTitle>
                <ParticipantList>
                    {participants.map(participant => (
                        <ParticipantItem key={participant.id}>
                            <ParticipantName>
                                <StatusIndicator status={participant.status} />
                                {participant.name}
                                {participant.tabSwitches > 3 && (
                                    <span style={{ color: '#dc3545', fontSize: '0.7rem' }}>
                                        ⚠️ {participant.tabSwitches} switches
                                    </span>
                                )}
                            </ParticipantName>
                            <ParticipantActions>
                                <SmallButton
                                    variant="danger"
                                    onClick={() => onFlagParticipant?.(participant.id)}
                                    title="Flag participant"
                                >
                                    <FaFlag />
                                </SmallButton>
                                <SmallButton
                                    variant="danger"
                                    onClick={() => onKickParticipant?.(participant.id)}
                                    title="Remove participant"
                                >
                                    ✕
                                </SmallButton>
                            </ParticipantActions>
                        </ParticipantItem>
                    ))}
                    {participants.length === 0 && (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                            No participants yet
                        </div>
                    )}
                </ParticipantList>
            </Section>
        </ControlsContainer>
    );
};

export default InterviewerControls;
