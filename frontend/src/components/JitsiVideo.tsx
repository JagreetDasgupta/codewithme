import React from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1f2937;
  border-radius: 8px;
  overflow: hidden;
`;

const IframeWrapper = styled.div`
  flex: 1;
  min-height: 300px;
  
  iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 8px;
  }
`;

const StatusText = styled.div`
  text-align: center;
  color: #9ca3af;
  font-size: 0.85rem;
  padding: 8px;
  background: #374151;
`;

interface JitsiVideoProps {
    sessionId: string;
    userName: string;
    isHost: boolean;
}

export const JitsiVideo: React.FC<JitsiVideoProps> = ({
    sessionId,
    userName,
    isHost
}) => {
    // Create a unique room name based on session ID
    const roomName = `codewithme-${sessionId}`;

    // Jitsi Meet URL with configuration
    const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(userName)}"&config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;

    return (
        <VideoContainer>
            <IframeWrapper>
                <iframe
                    src={jitsiUrl}
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                    title="Video Call"
                />
            </IframeWrapper>
            <StatusText>
                {isHost ? 'Host' : 'Participant'} - Room: {roomName}
            </StatusText>
        </VideoContainer>
    );
};

export default JitsiVideo;
