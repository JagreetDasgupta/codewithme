import React, { useEffect, useRef, useCallback, useState } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
`;

const VideoWrapper = styled.div`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #1f2937, #374151);
  flex: 1;
  min-height: 120px;
`;

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
`;

const PlaceholderAvatar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #374151, #1f2937);
`;

const AvatarCircle = styled.div<{ color: string }>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  margin-bottom: 0.5rem;
`;

const NameLabel = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: white;
`;

const ControlBar = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 8px;
`;

const ControlButton = styled.button<{ active?: boolean; danger?: boolean }>`
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  background: ${props => props.danger ? '#ef4444' : props.active ? '#22c55e' : '#4b5563'};
  color: white;
  
  &:hover {
    opacity: 0.9;
    transform: scale(1.02);
  }
`;

const StatusText = styled.div`
  text-align: center;
  color: #9ca3af;
  font-size: 0.85rem;
  padding: 8px;
`;

interface DailyVideoProps {
    roomUrl: string;
    token: string;
    userName: string;
    isHost: boolean;
    onLeave?: () => void;
}

export const DailyVideo: React.FC<DailyVideoProps> = ({
    roomUrl,
    token,
    userName,
    isHost,
    onLeave
}) => {
    const [callObject, setCallObject] = useState<DailyCall | null>(null);
    const [joined, setJoined] = useState(false);
    const [localVideoOn, setLocalVideoOn] = useState(true);
    const [localAudioOn, setLocalAudioOn] = useState(true);
    const [remoteParticipant, setRemoteParticipant] = useState<string | null>(null);
    const [status, setStatus] = useState('Connecting...');

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // Initialize Daily call
    useEffect(() => {
        if (!roomUrl || !token) return;

        const daily = DailyIframe.createCallObject({
            audioSource: true,
            videoSource: true,
        });

        setCallObject(daily);

        // Event handlers
        daily.on('joined-meeting', () => {
            setJoined(true);
            setStatus('Connected');
            console.log('[Daily] Joined meeting');
        });

        daily.on('left-meeting', () => {
            setJoined(false);
            setStatus('Disconnected');
            console.log('[Daily] Left meeting');
        });

        daily.on('participant-joined', (event) => {
            if (event?.participant && !event.participant.local) {
                console.log('[Daily] Participant joined:', event.participant.user_name);
                setRemoteParticipant(event.participant.user_name || 'Participant');
            }
        });

        daily.on('participant-left', (event) => {
            if (event?.participant && !event.participant.local) {
                console.log('[Daily] Participant left:', event.participant.user_name);
                setRemoteParticipant(null);
            }
        });

        daily.on('track-started', (event) => {
            if (!event?.participant || !event.track) return;

            const { participant, track } = event;
            console.log('[Daily] Track started:', participant.local ? 'local' : 'remote', track.kind);

            if (track.kind === 'video') {
                const stream = new MediaStream([track]);
                if (participant.local && localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                    localVideoRef.current.play().catch(console.error);
                } else if (!participant.local && remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = stream;
                    remoteVideoRef.current.play().catch(console.error);
                }
            }
        });

        daily.on('error', (error) => {
            console.error('[Daily] Error:', error);
            setStatus('Error: ' + (error?.errorMsg || 'Unknown'));
        });

        // Join the room
        daily.join({ url: roomUrl, token, userName })
            .then(() => {
                console.log('[Daily] Join successful');
            })
            .catch((err) => {
                console.error('[Daily] Join failed:', err);
                setStatus('Failed to join');
            });

        return () => {
            daily.leave();
            daily.destroy();
        };
    }, [roomUrl, token, userName]);

    // Update local video stream when tracks change
    useEffect(() => {
        if (!callObject || !joined) return;

        const participants = callObject.participants();
        const local = participants.local;

        if (local?.tracks?.video?.track && localVideoRef.current) {
            const stream = new MediaStream([local.tracks.video.track]);
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(console.error);
        }

        // Check for remote participants
        Object.values(participants).forEach((p: any) => {
            if (!p.local && p.tracks?.video?.track && remoteVideoRef.current) {
                const stream = new MediaStream([p.tracks.video.track]);
                remoteVideoRef.current.srcObject = stream;
                remoteVideoRef.current.play().catch(console.error);
                setRemoteParticipant(p.user_name || 'Participant');
            }
        });
    }, [callObject, joined]);

    const toggleVideo = useCallback(() => {
        if (callObject) {
            callObject.setLocalVideo(!localVideoOn);
            setLocalVideoOn(!localVideoOn);
        }
    }, [callObject, localVideoOn]);

    const toggleAudio = useCallback(() => {
        if (callObject) {
            callObject.setLocalAudio(!localAudioOn);
            setLocalAudioOn(!localAudioOn);
        }
    }, [callObject, localAudioOn]);

    const handleLeave = useCallback(() => {
        if (callObject) {
            callObject.leave();
        }
        onLeave?.();
    }, [callObject, onLeave]);

    return (
        <VideoContainer>
            {/* Remote Video */}
            <VideoWrapper>
                {!remoteParticipant && (
                    <PlaceholderAvatar>
                        <AvatarCircle color="linear-gradient(135deg, #f59e0b, #d97706)">
                            👤
                        </AvatarCircle>
                        <span style={{ color: 'white', fontSize: '0.9rem' }}>
                            {isHost ? 'Waiting for participant...' : 'Waiting for host...'}
                        </span>
                    </PlaceholderAvatar>
                )}
                <VideoElement ref={remoteVideoRef} autoPlay playsInline />
                {remoteParticipant && (
                    <NameLabel>{remoteParticipant} {!isHost && '(Host)'}</NameLabel>
                )}
            </VideoWrapper>

            {/* Local Video */}
            <VideoWrapper style={{ maxHeight: '120px' }}>
                {!localVideoOn && (
                    <PlaceholderAvatar>
                        <AvatarCircle color="linear-gradient(135deg, #3b82f6, #1d4ed8)">
                            👤
                        </AvatarCircle>
                        <span style={{ color: 'white', fontSize: '0.8rem' }}>Camera Off</span>
                    </PlaceholderAvatar>
                )}
                <VideoElement ref={localVideoRef} autoPlay playsInline muted />
                <NameLabel>You {isHost && '(Host)'}</NameLabel>
            </VideoWrapper>

            {/* Controls */}
            <ControlBar>
                <ControlButton active={localVideoOn} onClick={toggleVideo}>
                    {localVideoOn ? '📹 Video' : '📷 Video Off'}
                </ControlButton>
                <ControlButton active={localAudioOn} onClick={toggleAudio}>
                    {localAudioOn ? '🎤 Mic' : '🔇 Muted'}
                </ControlButton>
                <ControlButton danger onClick={handleLeave}>
                    📞 Leave
                </ControlButton>
            </ControlBar>

            <StatusText>{status}</StatusText>
        </VideoContainer>
    );
};

export default DailyVideo;
