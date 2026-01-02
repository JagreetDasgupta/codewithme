import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import styled from 'styled-components';
import { FaPlay, FaPause, FaStepBackward, FaStepForward, FaFastForward, FaFastBackward, FaDownload } from 'react-icons/fa';

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  background: var(--surface-elevated);
  border-top: 1px solid var(--border-color);
  padding: 0.5rem;
`;

const TimelineContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const Timeline = styled.div`
  flex: 1;
  height: 40px;
  background: var(--surface-color);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
`;

const TimelineProgress = styled.div<{ progress: number }>`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: ${props => props.progress}%;
  background: linear-gradient(90deg, var(--primary-color), #6b4aff);
  transition: width 0.1s linear;
`;

const TimelineEvents = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  display: flex;
  align-items: center;
`;

const EventMarker = styled.div<{ position: number; type: string }>`
  position: absolute;
  left: ${props => props.position}%;
  height: ${props => props.type === 'run' ? '80%' : props.type === 'error' ? '60%' : '40%'};
  width: 2px;
  background: ${props =>
        props.type === 'run' ? '#28a745' :
            props.type === 'error' ? '#dc3545' :
                props.type === 'file' ? '#ffc107' : '#17a2b8'};
  border-radius: 1px;
  transform: translateX(-50%);

  &:hover::after {
    content: '${props => props.type}';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.25rem 0.5rem;
    background: var(--surface-elevated);
    border-radius: 4px;
    font-size: 0.7rem;
    white-space: nowrap;
  }
`;

const PlaybackHandle = styled.div<{ position: number }>`
  position: absolute;
  left: ${props => props.position}%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid var(--primary-color);
  border-radius: 50%;
  cursor: grab;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);

  &:active {
    cursor: grabbing;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ControlButton = styled.button<{ active?: boolean }>`
  padding: 0.5rem;
  border: none;
  background: ${props => props.active ? 'var(--primary-color)' : 'var(--surface-color)'};
  color: ${props => props.active ? 'white' : 'var(--text-color)'};
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? 'var(--primary-hover)' : 'var(--surface-hover)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SpeedSelector = styled.select`
  padding: 0.375rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  color: var(--text-color);
  font-size: 0.875rem;
`;

const TimeDisplay = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  color: var(--text-muted);
  min-width: 100px;
  text-align: center;
`;

const StatsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  span.value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
  }
`;

// Types for keystroke events
export interface KeystrokeEvent {
    timestamp: number;
    type: 'insert' | 'delete' | 'cursor' | 'selection' | 'run' | 'file' | 'error' | 'format';
    content?: string;
    position?: { line: number; column: number };
    range?: { startLine: number; startColumn: number; endLine: number; endColumn: number };
    metadata?: Record<string, any>;
}

export interface PlaybackSession {
    startTime: number;
    endTime: number;
    events: KeystrokeEvent[];
    duration: number;
}

interface PlaybackControlsProps {
    session?: PlaybackSession;
    onSeek?: (timestamp: number) => void;
    onPlayStateChange?: (isPlaying: boolean) => void;
    onSpeedChange?: (speed: number) => void;
}

export interface PlaybackControlsHandle {
    addEvent: (event: KeystrokeEvent) => void;
    getSession: () => PlaybackSession;
    reset: () => void;
}

const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
};

const PlaybackControls = forwardRef<PlaybackControlsHandle, PlaybackControlsProps>(
    ({ session: externalSession, onSeek, onPlayStateChange, onSpeedChange }, ref) => {
        const [isPlaying, setIsPlaying] = useState(false);
        const [currentTime, setCurrentTime] = useState(0);
        const [speed, setSpeed] = useState(1);
        const [events, setEvents] = useState<KeystrokeEvent[]>([]);
        const [startTime] = useState(Date.now());
        const playbackRef = useRef<number | null>(null);
        const lastTickRef = useRef<number>(0);

        // Internal session tracking
        const internalSession: PlaybackSession = {
            startTime,
            endTime: Date.now(),
            events,
            duration: Date.now() - startTime,
        };

        const session = externalSession || internalSession;
        const duration = session.duration || 1;
        const progress = (currentTime / duration) * 100;

        // Expose methods via ref
        useImperativeHandle(ref, () => ({
            addEvent: (event: KeystrokeEvent) => {
                setEvents(prev => [...prev, event]);
            },
            getSession: () => ({
                startTime,
                endTime: Date.now(),
                events,
                duration: Date.now() - startTime,
            }),
            reset: () => {
                setEvents([]);
                setCurrentTime(0);
                setIsPlaying(false);
            },
        }));

        // Playback loop
        useEffect(() => {
            if (isPlaying) {
                lastTickRef.current = Date.now();
                playbackRef.current = window.setInterval(() => {
                    const now = Date.now();
                    const delta = (now - lastTickRef.current) * speed;
                    lastTickRef.current = now;

                    setCurrentTime(prev => {
                        const next = prev + delta;
                        if (next >= duration) {
                            setIsPlaying(false);
                            onPlayStateChange?.(false);
                            return duration;
                        }
                        return next;
                    });
                }, 50);
            } else if (playbackRef.current) {
                clearInterval(playbackRef.current);
            }

            return () => {
                if (playbackRef.current) {
                    clearInterval(playbackRef.current);
                }
            };
        }, [isPlaying, speed, duration, onPlayStateChange]);

        const handlePlayPause = () => {
            const newState = !isPlaying;
            setIsPlaying(newState);
            onPlayStateChange?.(newState);
        };

        const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / rect.width;
            const newTime = percentage * duration;
            setCurrentTime(newTime);
            onSeek?.(newTime);
        };

        const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newSpeed = parseFloat(e.target.value);
            setSpeed(newSpeed);
            onSpeedChange?.(newSpeed);
        };

        const stepBack = () => {
            setCurrentTime(Math.max(0, currentTime - 5000));
        };

        const stepForward = () => {
            setCurrentTime(Math.min(duration, currentTime + 5000));
        };

        const skipToStart = () => {
            setCurrentTime(0);
        };

        const skipToEnd = () => {
            setCurrentTime(duration);
            setIsPlaying(false);
        };

        const downloadRecording = () => {
            const data = JSON.stringify(session, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        };

        // Count event types
        const stats = {
            keystrokes: events.filter(e => e.type === 'insert' || e.type === 'delete').length,
            runs: events.filter(e => e.type === 'run').length,
            errors: events.filter(e => e.type === 'error').length,
            fileChanges: events.filter(e => e.type === 'file').length,
        };

        return (
            <ControlsContainer>
                <TimelineContainer>
                    <TimeDisplay>{formatTime(currentTime)}</TimeDisplay>
                    <Timeline onClick={handleSeek}>
                        <TimelineProgress progress={progress} />
                        <TimelineEvents>
                            {events.map((event, i) => {
                                const eventTime = event.timestamp - startTime;
                                const position = (eventTime / duration) * 100;
                                if (position >= 0 && position <= 100) {
                                    return (
                                        <EventMarker
                                            key={i}
                                            position={position}
                                            type={event.type}
                                        />
                                    );
                                }
                                return null;
                            })}
                        </TimelineEvents>
                        <PlaybackHandle position={progress} />
                    </Timeline>
                    <TimeDisplay>{formatTime(duration)}</TimeDisplay>
                </TimelineContainer>

                <ButtonGroup>
                    <ControlButton onClick={skipToStart} title="Skip to Start">
                        <FaFastBackward />
                    </ControlButton>
                    <ControlButton onClick={stepBack} title="Step Back 5s">
                        <FaStepBackward />
                    </ControlButton>
                    <ControlButton active={isPlaying} onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying ? <FaPause /> : <FaPlay />}
                    </ControlButton>
                    <ControlButton onClick={stepForward} title="Step Forward 5s">
                        <FaStepForward />
                    </ControlButton>
                    <ControlButton onClick={skipToEnd} title="Skip to End">
                        <FaFastForward />
                    </ControlButton>

                    <SpeedSelector value={speed} onChange={handleSpeedChange}>
                        <option value="0.25">0.25x</option>
                        <option value="0.5">0.5x</option>
                        <option value="1">1x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2x</option>
                        <option value="4">4x</option>
                    </SpeedSelector>

                    <ControlButton onClick={downloadRecording} title="Download Recording">
                        <FaDownload />
                    </ControlButton>
                </ButtonGroup>

                <StatsContainer>
                    <StatItem>
                        <span className="value">{stats.keystrokes}</span>
                        <span>Keystrokes</span>
                    </StatItem>
                    <StatItem>
                        <span className="value">{stats.runs}</span>
                        <span>Executions</span>
                    </StatItem>
                    <StatItem>
                        <span className="value">{stats.errors}</span>
                        <span>Errors</span>
                    </StatItem>
                    <StatItem>
                        <span className="value">{stats.fileChanges}</span>
                        <span>File Changes</span>
                    </StatItem>
                </StatsContainer>
            </ControlsContainer>
        );
    }
);

PlaybackControls.displayName = 'PlaybackControls';

export default PlaybackControls;
