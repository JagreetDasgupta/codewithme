import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import styled from 'styled-components';
import { FaPencilAlt, FaEraser, FaSquare, FaCircle, FaMinus, FaFont, FaUndo, FaRedo, FaDownload, FaTrash, FaPalette } from 'react-icons/fa';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--surface-elevated);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
`;

const ToolGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding-right: 0.5rem;
  border-right: 1px solid var(--border-color);
`;

const ToolButton = styled.button<{ active?: boolean }>`
  width: 32px;
  height: 32px;
  border: 1px solid ${props => props.active ? 'var(--primary-color)' : 'var(--border-color)'};
  background: ${props => props.active ? 'var(--primary-color)' : 'var(--surface-color)'};
  color: ${props => props.active ? 'white' : 'var(--text-color)'};
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? 'var(--primary-color)' : 'var(--surface-hover)'};
    border-color: var(--primary-color);
  }
`;

const ColorButton = styled.button<{ color: string; active?: boolean }>`
  width: 24px;
  height: 24px;
  border: 2px solid ${props => props.active ? '#000' : 'transparent'};
  background: ${props => props.color};
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`;

const SizeSlider = styled.input`
  width: 80px;
`;

const CanvasContainer = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
  touch-action: none;
`;

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
`;

const StatusBar = styled.div`
  padding: 0.25rem 0.5rem;
  background: var(--surface-elevated);
  border-top: 1px solid var(--border-color);
  font-size: 0.75rem;
  color: var(--text-muted);
  display: flex;
  justify-content: space-between;
`;

type Tool = 'pencil' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text';

interface Point {
    x: number;
    y: number;
}

interface DrawAction {
    tool: Tool;
    color: string;
    size: number;
    points: Point[];
    text?: string;
}

export interface WhiteboardHandle {
    clear: () => void;
    undo: () => void;
    redo: () => void;
    getImageData: () => string;
    loadImageData: (data: string) => void;
}

interface WhiteboardProps {
    onDraw?: (action: DrawAction) => void;
    remoteActions?: DrawAction[];
}

const COLORS = ['#000000', '#ff0000', '#00aa00', '#0000ff', '#ff9900', '#9900ff', '#00aaaa', '#888888'];

const Whiteboard = forwardRef<WhiteboardHandle, WhiteboardProps>(
    ({ onDraw, remoteActions }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const [tool, setTool] = useState<Tool>('pencil');
        const [color, setColor] = useState('#000000');
        const [size, setSize] = useState(3);
        const [isDrawing, setIsDrawing] = useState(false);
        const [history, setHistory] = useState<DrawAction[]>([]);
        const [redoStack, setRedoStack] = useState<DrawAction[]>([]);
        const [currentPath, setCurrentPath] = useState<Point[]>([]);
        const [startPoint, setStartPoint] = useState<Point | null>(null);

        // Resize canvas to container
        useEffect(() => {
            const resizeCanvas = () => {
                if (canvasRef.current && containerRef.current) {
                    const container = containerRef.current;
                    canvasRef.current.width = container.clientWidth;
                    canvasRef.current.height = container.clientHeight;
                    redrawCanvas();
                }
            };

            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
            return () => window.removeEventListener('resize', resizeCanvas);
        }, [history]);

        // Apply remote actions
        useEffect(() => {
            if (remoteActions && remoteActions.length > 0) {
                remoteActions.forEach(action => {
                    drawAction(action);
                });
            }
        }, [remoteActions]);

        const redrawCanvas = () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx || !canvasRef.current) return;

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            history.forEach(action => drawAction(action));
        };

        const drawAction = (action: DrawAction) => {
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;

            ctx.strokeStyle = action.tool === 'eraser' ? 'white' : action.color;
            ctx.fillStyle = action.color;
            ctx.lineWidth = action.tool === 'eraser' ? action.size * 3 : action.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const points = action.points;
            if (points.length === 0) return;

            switch (action.tool) {
                case 'pencil':
                case 'eraser':
                    ctx.beginPath();
                    ctx.moveTo(points[0].x, points[0].y);
                    points.forEach(p => ctx.lineTo(p.x, p.y));
                    ctx.stroke();
                    break;

                case 'line':
                    if (points.length >= 2) {
                        ctx.beginPath();
                        ctx.moveTo(points[0].x, points[0].y);
                        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
                        ctx.stroke();
                    }
                    break;

                case 'rectangle':
                    if (points.length >= 2) {
                        const start = points[0];
                        const end = points[points.length - 1];
                        ctx.beginPath();
                        ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
                        ctx.stroke();
                    }
                    break;

                case 'circle':
                    if (points.length >= 2) {
                        const start = points[0];
                        const end = points[points.length - 1];
                        const radius = Math.sqrt(
                            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
                        );
                        ctx.beginPath();
                        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    break;

                case 'text':
                    if (action.text && points.length > 0) {
                        ctx.font = `${action.size * 4}px Arial`;
                        ctx.fillText(action.text, points[0].x, points[0].y);
                    }
                    break;
            }
        };

        const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
            const canvas = canvasRef.current;
            if (!canvas) return { x: 0, y: 0 };

            const rect = canvas.getBoundingClientRect();
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            return {
                x: clientX - rect.left,
                y: clientY - rect.top,
            };
        };

        const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
            const point = getPoint(e);
            setIsDrawing(true);
            setStartPoint(point);
            setCurrentPath([point]);

            if (tool === 'pencil' || tool === 'eraser') {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) {
                    ctx.strokeStyle = tool === 'eraser' ? 'white' : color;
                    ctx.lineWidth = tool === 'eraser' ? size * 3 : size;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(point.x, point.y);
                }
            }
        };

        const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
            if (!isDrawing) return;

            const point = getPoint(e);
            setCurrentPath(prev => [...prev, point]);

            if (tool === 'pencil' || tool === 'eraser') {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) {
                    ctx.lineTo(point.x, point.y);
                    ctx.stroke();
                }
            } else {
                // Preview shapes
                redrawCanvas();
                const previewAction: DrawAction = {
                    tool,
                    color,
                    size,
                    points: startPoint ? [startPoint, point] : [point],
                };
                drawAction(previewAction);
            }
        };

        const handleEnd = () => {
            if (!isDrawing) return;
            setIsDrawing(false);

            if (currentPath.length > 0) {
                const action: DrawAction = {
                    tool,
                    color,
                    size,
                    points: currentPath,
                };

                setHistory(prev => [...prev, action]);
                setRedoStack([]);
                onDraw?.(action);
            }

            setCurrentPath([]);
            setStartPoint(null);
        };

        const handleTextClick = (e: React.MouseEvent) => {
            if (tool !== 'text') return;

            const point = getPoint(e);
            const text = prompt('Enter text:');
            if (text) {
                const action: DrawAction = {
                    tool: 'text',
                    color,
                    size,
                    points: [point],
                    text,
                };

                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = color;
                    ctx.font = `${size * 4}px Arial`;
                    ctx.fillText(text, point.x, point.y);
                }

                setHistory(prev => [...prev, action]);
                setRedoStack([]);
                onDraw?.(action);
            }
        };

        const undo = () => {
            if (history.length === 0) return;
            const last = history[history.length - 1];
            setHistory(prev => prev.slice(0, -1));
            setRedoStack(prev => [...prev, last]);
        };

        const redo = () => {
            if (redoStack.length === 0) return;
            const last = redoStack[redoStack.length - 1];
            setRedoStack(prev => prev.slice(0, -1));
            setHistory(prev => [...prev, last]);
        };

        const clear = () => {
            setHistory([]);
            setRedoStack([]);
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        };

        const download = () => {
            if (!canvasRef.current) return;
            const link = document.createElement('a');
            link.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvasRef.current.toDataURL('image/png');
            link.click();
        };

        // Expose methods via ref
        useImperativeHandle(ref, () => ({
            clear,
            undo,
            redo,
            getImageData: () => canvasRef.current?.toDataURL('image/png') || '',
            loadImageData: (data: string) => {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx && canvasRef.current) {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0);
                    };
                    img.src = data;
                }
            },
        }));

        useEffect(() => {
            redrawCanvas();
        }, [history]);

        return (
            <Container>
                <Toolbar>
                    <ToolGroup>
                        <ToolButton active={tool === 'pencil'} onClick={() => setTool('pencil')} title="Pencil">
                            <FaPencilAlt />
                        </ToolButton>
                        <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} title="Eraser">
                            <FaEraser />
                        </ToolButton>
                        <ToolButton active={tool === 'line'} onClick={() => setTool('line')} title="Line">
                            <FaMinus />
                        </ToolButton>
                        <ToolButton active={tool === 'rectangle'} onClick={() => setTool('rectangle')} title="Rectangle">
                            <FaSquare />
                        </ToolButton>
                        <ToolButton active={tool === 'circle'} onClick={() => setTool('circle')} title="Circle">
                            <FaCircle />
                        </ToolButton>
                        <ToolButton active={tool === 'text'} onClick={() => setTool('text')} title="Text">
                            <FaFont />
                        </ToolButton>
                    </ToolGroup>

                    <ToolGroup>
                        {COLORS.map(c => (
                            <ColorButton
                                key={c}
                                color={c}
                                active={color === c}
                                onClick={() => setColor(c)}
                                title={c}
                            />
                        ))}
                    </ToolGroup>

                    <ToolGroup>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Size:</span>
                        <SizeSlider
                            type="range"
                            min="1"
                            max="20"
                            value={size}
                            onChange={(e) => setSize(parseInt(e.target.value))}
                        />
                        <span style={{ fontSize: '0.75rem', minWidth: '20px' }}>{size}</span>
                    </ToolGroup>

                    <ToolGroup>
                        <ToolButton onClick={undo} disabled={history.length === 0} title="Undo">
                            <FaUndo />
                        </ToolButton>
                        <ToolButton onClick={redo} disabled={redoStack.length === 0} title="Redo">
                            <FaRedo />
                        </ToolButton>
                    </ToolGroup>

                    <ToolButton onClick={clear} title="Clear All">
                        <FaTrash />
                    </ToolButton>
                    <ToolButton onClick={download} title="Download">
                        <FaDownload />
                    </ToolButton>
                </Toolbar>

                <CanvasContainer ref={containerRef}>
                    <Canvas
                        ref={canvasRef}
                        onMouseDown={tool === 'text' ? handleTextClick : handleStart}
                        onMouseMove={handleMove}
                        onMouseUp={handleEnd}
                        onMouseLeave={handleEnd}
                        onTouchStart={handleStart}
                        onTouchMove={handleMove}
                        onTouchEnd={handleEnd}
                    />
                </CanvasContainer>

                <StatusBar>
                    <span>Tool: {tool.charAt(0).toUpperCase() + tool.slice(1)} | Size: {size}px</span>
                    <span>History: {history.length} actions</span>
                </StatusBar>
            </Container>
        );
    }
);

Whiteboard.displayName = 'Whiteboard';

export default Whiteboard;
