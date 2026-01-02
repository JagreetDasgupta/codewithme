import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';

// Types
interface ChatInterfaceProps {
  isHost: boolean;
  sessionId: string;
  socket: any;
  username: string;
  userId: string;
  initialProblemStatement?: string;
}

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Styled Components with Glassmorphism
const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
  z-index: 60; /* Higher than EditorContainer */
  
  &:hover {
    box-shadow: 0 8px 32px rgba(31, 38, 135, 0.2);
  }
`;

const ProblemStatementContainer = styled.div<{ isHost: boolean }>`
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  h3 {
    margin: 0 0 0.75rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    display: flex;
    align-items: center;
    
    &:after {
      content: '';
      display: ${props => props.isHost ? 'block' : 'none'};
      width: 8px;
      height: 8px;
      background: #4CAF50;
      border-radius: 50%;
      margin-left: 8px;
      animation: ${pulse} 2s infinite;
    }
  }
`;

const ProblemTextArea = styled.textarea<{ isHost: boolean }>`
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: vertical;
  transition: all 0.2s ease;
  color: #333;
  
  &:focus {
    outline: none;
    border-color: #4285f4;
    box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
  }
  
  &:disabled {
    background: rgba(255, 255, 255, 0.5);
    cursor: not-allowed;
  }
  
  &::placeholder {
    color: rgba(0, 0, 0, 0.4);
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    
    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  }
`;

const MessageBubble = styled.div<{ isCurrentUser: boolean; isSystem?: boolean }>`
  max-width: 80%;
  padding: 0.75rem 1rem;
  border-radius: 18px;
  align-self: ${props => props.isCurrentUser ? 'flex-end' : 'flex-start'};
  background: ${props =>
    props.isSystem
      ? 'linear-gradient(90deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.05) 100%)'
      : props.isCurrentUser
        ? 'linear-gradient(135deg, #4285f4, #34a853)'
        : 'rgba(255, 255, 255, 0.8)'};
  color: ${props => props.isCurrentUser ? 'white' : '#333'};
  box-shadow: ${props => props.isCurrentUser
    ? '0 2px 10px rgba(66, 133, 244, 0.3)'
    : '0 2px 10px rgba(0, 0, 0, 0.05)'};
  animation: ${fadeIn} 0.3s ease;
  position: relative;
  
  ${props => props.isSystem && css`
    align-self: center;
    font-style: italic;
    font-size: 0.85rem;
    background-size: 200% 100%;
    animation: ${shimmer} 2s infinite linear;
  `}
  
  &:hover {
    transform: translateY(-1px);
    transition: transform 0.2s ease;
  }
  
  &:before {
    content: '';
    position: absolute;
    bottom: 0;
    ${props => props.isCurrentUser ? 'right: -6px;' : 'left: -6px;'}
    width: 12px;
    height: 12px;
    background: ${props =>
    props.isSystem
      ? 'transparent'
      : props.isCurrentUser
        ? '#34a853'
        : 'rgba(255, 255, 255, 0.8)'};
    transform: translateY(-50%) rotate(45deg);
    display: ${props => props.isSystem ? 'none' : 'block'};
  }
`;

const MessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  opacity: 0.8;
`;

const MessageInput = styled.div`
  display: flex;
  padding: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.95);
  flex-shrink: 0;
  position: relative;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  position: relative;
`;

const Input = styled.input`
  flex: 1;
  padding: 0.75rem 2.5rem 0.75rem 1rem; /* Extra padding on right for send button */
  border-radius: 24px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #f5f5f5;
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  width: 100%;
  
  &:focus {
    outline: none;
    border-color: #4285f4;
    background: white;
  }
`;

const SendButton = styled.button`
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #4285f4, #34a853);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  
  &:hover {
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.4);
  }
  
  &:active {
    transform: translateY(-50%) scale(0.95);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const ChatInterface: React.FC<ChatInterfaceProps> = ({ isHost, sessionId, socket, username, userId, initialProblemStatement }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [problemStatement, setProblemStatement] = useState(initialProblemStatement || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for incoming chat messages
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };

    socket.on('chat-message', handleChatMessage);

    // Add system message when component mounts
    setMessages([
      {
        id: 'system-welcome',
        userId: 'system',
        username: 'System',
        text: `Welcome to the chat! ${isHost ? 'As the host, you can set the problem statement.' : ''}`,
        timestamp: new Date().toISOString(),
        isSystem: true
      }
    ]);

    return () => {
      socket.off('chat-message', handleChatMessage);
    };
  }, [socket, isHost]);

  // Listen for problem statement updates
  useEffect(() => {
    if (!socket) return;

    const handleProblemUpdate = (data: { text: string }) => {
      setProblemStatement(data.text);
    };

    socket.on('problem-statement-update', handleProblemUpdate);

    return () => {
      socket.off('problem-statement-update', handleProblemUpdate);
    };
  }, [socket]);

  // Handle sending messages
  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    const messageData = {
      text: newMessage,
      userId,
      username,
      sessionId,
      timestamp: new Date().toISOString()
    };

    socket.emit('chat-message', messageData);
    setNewMessage('');
  };

  // Handle problem statement changes
  const handleProblemStatementChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setProblemStatement(newText);

    if (socket) {
      socket.emit('problem-statement-update', {
        sessionId,
        text: newText
      });
    }
  };

  // Handle key press for sending messages
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <ChatContainer>
      <ProblemStatementContainer isHost={isHost}>
        <h3>Problem Statement {isHost && '(Editable by you)'}</h3>
        <ProblemTextArea
          value={problemStatement}
          onChange={handleProblemStatementChange}
          placeholder={isHost ? "Type or paste the problem statement here..." : "Waiting for host to set the problem..."}
          disabled={!isHost}
          isHost={isHost}
        />
      </ProblemStatementContainer>

      <MessagesContainer>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            isCurrentUser={message.userId === userId}
            isSystem={message.isSystem}
          >
            <MessageHeader>
              <span>{message.username}</span>
              <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
            </MessageHeader>
            {message.text}
          </MessageBubble>
        ))}
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <MessageInput>
        <InputWrapper>
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
          />
          <SendButton onClick={handleSendMessage} title="Send message">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </SendButton>
        </InputWrapper>
      </MessageInput>
    </ChatContainer>
  );
};

export default ChatInterface;