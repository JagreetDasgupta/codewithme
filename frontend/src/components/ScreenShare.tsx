import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FaDesktop, FaStop, FaPencilAlt, FaEraser, FaHighlighter, FaMousePointer, FaSave, FaExpand } from 'react-icons/fa';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  position: relative;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--surface-elevated);
  border-bottom: 1px solid var(--border-color);
`;

const ToolButton = styled.button<{ active?: boolean; variant?: 'danger' | 'success' }>`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${props =>
        props.variant === 'danger' ? '#dc3545' :
            props.variant === 'success' ? '#28a745' :
                props.active ? 'var(--primary-color)' : 'var(--border-color)'};
  background: ${props =>
        props.variant === 'danger' ? (props.active ? '#dc3545' : 'transparent') :
            props.variant === 'success' ? '#28a745' :
                props.active ? 'var(--primary-color)' : 'var(--surface-color)'};
  color: ${props =>
        (props.variant && props.active) || props.active || props.variant === 'success' ? 'white' : 'var(--text-color)'};
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8rem;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.9;
    border-color: var(--primary-color);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ColorPicker = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const ColorButton = styled.button<{ color: string; active?: boolean }>`
  width: 24px;
  height: 24px;
  border: 2px solid ${props => props.active ? '#fff' : 'transparent'};
  background: ${props => props.color};
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`;

const VideoContainer = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Video = styled.video`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const AnnotationCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: ${props => props.className === 'active' ? 'auto' : 'none'};
`;

const PlaceholderMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: var(--text-muted);
  text-align: center;
  padding: 2rem;
`;

const StatusBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0.5rem;
  background: var(--surface-elevated);
  border-top: 1px solid var(--border-color);
  font-size: 0.75rem;
  color: var(--text-muted);
`;

const StatusIndicator = styled.span<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.active ? '#28a745' : '#dc3545'};
    animation: ${props => props.active ? 'pulse 1.5s infinite' : 'none'};
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const ModalContent = styled.div`
  background: var(--surface-color);
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
`;

const ModalTitle = styled.h3`
  margin: 0 0 1rem;
`;

const ModalOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const ModalOption = styled.button`
  padding: 1rem;
  background: var(--surface-elevated);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &:hover {
    border-color: var(--primary-color);
    background: var(--surface-hover);
  }

  .icon {
    font-size: 1.5rem;
  }
`;

type AnnotationTool = 'pointer' | 'pen' | 'highlighter' | 'eraser';

interface ScreenShareProps {
    onShareStart?: (stream: MediaStream) => void;
    onShareEnd?: () => void;
    onAnnotation?: (imageData: string) => void;
    remoteStream?: MediaStream;
    isRemoteShare?: boolean;
}

const COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'];

const ScreenShare: React.FC<ScreenShareProps> = ({
    onShareStart,
    onShareEnd,
    onAnnotation,
    remoteStream,
    isRemoteShare = false
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('pointer');
    const [annotationColor, setAnnotationColor] = useState('#ff0000');
    const [showShareModal, setShowShareModal] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

    // Handle remote stream
    useEffect(() => {
        if (remoteStream && videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            setIsSharing(true);
        }
    }, [remoteStream]);

    const startScreenShare = async (shareType: 'screen' | 'window' | 'tab') => {
        try {
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    displaySurface: shareType === 'screen' ? 'monitor' : shareType === 'window' ? 'window' : 'browser'
                } as any,
                audio: true
            });

            setStream(mediaStream);
            setIsSharing(true);
            setShowShareModal(false);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }

            // Handle stream end
            mediaStream.getTracks().forEach(track => {
                track.onended = () => {
                    stopScreenShare();
                };
            });

            onShareStart?.(mediaStream);
        } catch (error) {
            console.error('Error starting screen share:', error);
        }
    };

    const stopScreenShare = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        setStream(null);
        setIsSharing(false);
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        onShareEnd?.();
    };

    const clearAnnotations = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const saveAnnotation = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const imageData = canvas.toDataURL('image/png');
        onAnnotation?.(imageData);

        // Also download
        const link = document.createElement('a');
        link.download = `annotation-${Date.now()}.png`;
        link.href = imageData;
        link.click();
    };

    const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (annotationTool === 'pointer') return;
        setIsDrawing(true);
        setLastPoint(getCanvasPoint(e));
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || annotationTool === 'pointer') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const point = getCanvasPoint(e);

        if (lastPoint) {
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(point.x, point.y);

            switch (annotationTool) {
                case 'pen':
                    ctx.strokeStyle = annotationColor;
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    break;
                case 'highlighter':
                    ctx.strokeStyle = annotationColor + '40'; // 40 = 25% opacity in hex
                    ctx.lineWidth = 20;
                    ctx.lineCap = 'round';
                    break;
                case 'eraser':
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 20;
                    ctx.lineCap = 'round';
                    ctx.globalCompositeOperation = 'destination-out';
                    break;
            }

            ctx.stroke();

            if (annotationTool === 'eraser') {
                ctx.globalCompositeOperation = 'source-over';
            }
        }

        setLastPoint(point);
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
        setLastPoint(null);
    };

    // Resize canvas to match video
    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current && videoRef.current) {
                canvasRef.current.width = videoRef.current.clientWidth;
                canvasRef.current.height = videoRef.current.clientHeight;
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [isSharing]);

    return (
        <Container>
            <Toolbar>
                {!isSharing && !isRemoteShare && (
                    <ToolButton variant="success" onClick={() => setShowShareModal(true)}>
                        <FaDesktop /> Share Screen
                    </ToolButton>
                )}
                {isSharing && !isRemoteShare && (
                    <ToolButton variant="danger" active onClick={stopScreenShare}>
                        <FaStop /> Stop Sharing
                    </ToolButton>
                )}

                {isSharing && (
                    <>
                        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.5rem' }} />

                        <ToolButton
                            active={annotationTool === 'pointer'}
                            onClick={() => setAnnotationTool('pointer')}
                            title="Pointer"
                        >
                            <FaMousePointer />
                        </ToolButton>
                        <ToolButton
                            active={annotationTool === 'pen'}
                            onClick={() => setAnnotationTool('pen')}
                            title="Pen"
                        >
                            <FaPencilAlt />
                        </ToolButton>
                        <ToolButton
                            active={annotationTool === 'highlighter'}
                            onClick={() => setAnnotationTool('highlighter')}
                            title="Highlighter"
                        >
                            <FaHighlighter />
                        </ToolButton>
                        <ToolButton
                            active={annotationTool === 'eraser'}
                            onClick={() => setAnnotationTool('eraser')}
                            title="Eraser"
                        >
                            <FaEraser />
                        </ToolButton>

                        <ColorPicker>
                            {COLORS.slice(0, 6).map(color => (
                                <ColorButton
                                    key={color}
                                    color={color}
                                    active={annotationColor === color}
                                    onClick={() => setAnnotationColor(color)}
                                    title={color}
                                />
                            ))}
                        </ColorPicker>

                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                            <ToolButton onClick={clearAnnotations} title="Clear annotations">
                                <FaEraser /> Clear
                            </ToolButton>
                            <ToolButton onClick={saveAnnotation} title="Save annotation">
                                <FaSave /> Save
                            </ToolButton>
                        </div>
                    </>
                )}
            </Toolbar>

            <VideoContainer>
                {isSharing ? (
                    <>
                        <Video ref={videoRef} autoPlay playsInline muted={!isRemoteShare} />
                        <AnnotationCanvas
                            ref={canvasRef}
                            className={annotationTool !== 'pointer' ? 'active' : ''}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        />
                    </>
                ) : (
                    <PlaceholderMessage>
                        <FaDesktop style={{ fontSize: '3rem' }} />
                        <div>
                            <strong>{isRemoteShare ? 'Waiting for screen share...' : 'Share your screen'}</strong>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
                                {isRemoteShare
                                    ? 'The other participant will share their screen'
                                    : 'Click the button above to start sharing your screen'}
                            </p>
                        </div>
                    </PlaceholderMessage>
                )}
            </VideoContainer>

            <StatusBar>
                <StatusIndicator active={isSharing}>
                    {isSharing ? 'Screen sharing active' : 'Not sharing'}
                </StatusIndicator>
                {isSharing && annotationTool !== 'pointer' && (
                    <span>Annotation mode: {annotationTool}</span>
                )}
            </StatusBar>

            {showShareModal && (
                <Modal onClick={() => setShowShareModal(false)}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <ModalTitle>Share your screen</ModalTitle>
                        <ModalOptions>
                            <ModalOption onClick={() => startScreenShare('screen')}>
                                <span className="icon">🖥️</span>
                                <div>
                                    <strong>Entire Screen</strong>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Share your entire display
                                    </div>
                                </div>
                            </ModalOption>
                            <ModalOption onClick={() => startScreenShare('window')}>
                                <span className="icon">🪟</span>
                                <div>
                                    <strong>Application Window</strong>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Share a specific application
                                    </div>
                                </div>
                            </ModalOption>
                            <ModalOption onClick={() => startScreenShare('tab')}>
                                <span className="icon">🌐</span>
                                <div>
                                    <strong>Browser Tab</strong>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Share a single browser tab
                                    </div>
                                </div>
                            </ModalOption>
                        </ModalOptions>
                        <ToolButton onClick={() => setShowShareModal(false)} style={{ width: '100%' }}>
                            Cancel
                        </ToolButton>
                    </ModalContent>
                </Modal>
            )}
        </Container>
    );
};

export default ScreenShare;
