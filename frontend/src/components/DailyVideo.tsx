import React, { useEffect, useRef, useState } from 'react';
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

const ErrorBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  background: linear-gradient(135deg, #374151, #1f2937);
  border-radius: 8px;
  color: #ef4444;
  padding: 1rem;
  text-align: center;
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
    isHost
}) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [status, setStatus] = useState('Loading video...');
    const [error, setError] = useState<string | null>(null);

    // Build the Daily Prebuilt URL with token
    const prebuiltUrl = roomUrl ? `${roomUrl}?t=${token}&userName=${encodeURIComponent(userName)}` : null;

    useEffect(() => {
        if (prebuiltUrl) {
            setStatus('Connecting to video room...');
            console.log('[Daily] Loading prebuilt URL:', prebuiltUrl);
        }
    }, [prebuiltUrl]);

    // Handle iframe load
    const handleLoad = () => {
        setStatus(`Connected as ${isHost ? 'Host' : 'Participant'}`);
        console.log('[Daily] Prebuilt iframe loaded');
    };

    const handleError = () => {
        setError('Failed to load video room');
        console.error('[Daily] Prebuilt iframe error');
    };

    if (error) {
        return (
            <VideoContainer>
                <ErrorBox>
                    <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</span>
                    <span>{error}</span>
                </ErrorBox>
            </VideoContainer>
        );
    }

    if (!prebuiltUrl) {
        return (
            <VideoContainer>
                <StatusText>Initializing video...</StatusText>
            </VideoContainer>
        );
    }

    return (
        <VideoContainer>
            <IframeWrapper>
                <iframe
                    ref={iframeRef}
                    src={prebuiltUrl}
                    allow="camera; microphone; fullscreen; display-capture"
                    onLoad={handleLoad}
                    onError={handleError}
                    title="Video Call"
                />
            </IframeWrapper>
            <StatusText>{status}</StatusText>
        </VideoContainer>
    );
};

export default DailyVideo;
