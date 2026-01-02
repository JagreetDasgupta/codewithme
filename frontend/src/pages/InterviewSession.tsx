import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Editor from '@monaco-editor/react';
import styled from 'styled-components';
import { FiShare2, FiSidebar, FiLayout, FiCopy, FiCheck, FiX } from 'react-icons/fi';
import {
  SiJavascript, SiTypescript, SiPython, SiCplusplus, SiHtml5, SiCss3, SiJson, SiGnubash,
  SiRuby, SiGo, SiRust, SiSwift, SiKotlin, SiScala, SiPhp, SiPerl, SiLua, SiR,
  SiHaskell, SiClojure, SiElixir, SiErlang, SiJulia, SiDart, SiFsharp, SiOcaml,
  SiSolidity, SiReact, SiAngular, SiVuedotjs, SiSvelte, SiNextdotjs, SiNodedotjs,
  SiDjango, SiSpring, SiPostgresql, SiMysql, SiMongodb, SiTerraform,
  SiDocker, SiKubernetes, SiMarkdown, SiYaml, SiGraphql, SiCoffeescript, SiPowershell,
  SiRubyonrails, SiCsharp
} from 'react-icons/si';
import { FaJava, FaDatabase, FaCode } from 'react-icons/fa';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import io from 'socket.io-client';
import SimplePeer from 'simple-peer';
import axios from 'axios';
import ChatInterface from '../components/ChatInterface';
import DatabasePanel from '../components/DatabasePanel';
import PlaybackControls, { PlaybackControlsHandle } from '../components/PlaybackControls';
import QuestionBank, { Question } from '../components/QuestionBank';
import Whiteboard, { WhiteboardHandle } from '../components/Whiteboard';
import { FiHelpCircle, FiEdit3, FiPlay } from 'react-icons/fi';

// Extend window for Monaco access
declare global {
  interface Window {
    monaco?: any;
  }
}

const SessionContainer = styled.div`
display: flex;
height: 100vh;
overflow: hidden;
@media(max-width: 1024px) {
  flex-direction: column;
  height: auto;
  min-height: 100vh;
}
`;

const Resizer = styled.div`
width: 5px;
background-color: var(--border-color);
cursor: col-resize;
transition: background-color 0.2s;
z-index: 20;
  
  &: hover, &.resizing {
  background-color: var(--primary-color);
}
`;

const LeftPanel = styled.div<{ width?: number }>`
width: ${props => props.width ? `${props.width}px` : '300px'};
min-width: 200px;
border-right: 1px solid var(--border-color);
display: flex;
flex-direction: column;
overflow: visible; /* Allow elements like buttons to not be clipped */
background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1);
flex-shrink: 0;
position: relative;
z-index: 50; /* Ensure LeftPanel is above EditorContainer */
@media(max-width: 1024px) {
  width: 100% !important;
  border-right: none;
  border-bottom: 1px solid var(--border-color);
  height: auto;
}
`;

const TopPane = styled.div<{ height?: string }>`
height: ${props => props.height || '50%'};
min-height: 150px; /* Ensure minimum height for content */
max-height: 80%;
overflow: auto; /* Changed to auto for proper scrolling within */
display: flex;
flex-direction: column;
`;

const BottomPane = styled.div`
flex: 1;
overflow: hidden;
display: flex;
flex-direction: column;
`;

const VerticalResizer = styled.div`
height: 5px;
background-color: var(--border-color);
cursor: row-resize;
transition: background-color 0.2s;
z-index: 20;
width: 100%;
flex-shrink: 0;
  &: hover, &.resizing {
  background-color: var(--primary-color);
}
`;

const FileTree = styled.div`
flex: 1;
overflow-y: auto;
padding: 0.5rem;
`;

const EditorContainer = styled.div`
flex: 1;
display: flex;
flex-direction: column;
position: relative;
min-width: 0;
overflow: visible; /* Allow dropdowns to overflow */
`;

const EditorToolbar = styled.div`
display: flex;
align-items: center;
flex-wrap: wrap; /* Allow wrapping */
gap: 0.5rem;
padding: 0.5rem;
border-bottom: 1px solid var(--border-color);
background-color: #f5f5f5;
flex-shrink: 0;
min-height: 48px;
max-height: 100px;
overflow-y: auto;
position: relative;
z-index: 100; /* Ensure dropdowns appear above editor */

  /* Hide scrollbar for cleaner look */
  &:: -webkit-scrollbar {
  display: none;
}
-ms-overflow-style: none;
scrollbar-width: none;
`;

const EditorWrapper = styled.div`
flex: 1;
overflow: hidden;
position: relative;
z-index: 1; /* Lower z-index so toolbar dropdown can appear above */
`;

const RightPanel = styled.div<{ width?: number }>`
width: ${props => props.width ? `${props.width}px` : '450px'};
min-width: 400px;
border-left: 1px solid var(--border-color);
display: flex;
flex-direction: column;
background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1);
flex-shrink: 0;
@media(max-width: 1024px) {
  width: 100% !important;
  border-left: none;
  border-top: 1px solid var(--border-color);
  height: auto;
}
`;

// ... (skipping VideoPanel etc for brevity but ensuring offsets remain correct)
const VideoPanel = styled.div`
flex: 1;
min-height: 200px;
border-bottom: 1px solid var(--border-color);
padding: 1rem;
display: flex;
flex-direction: column;
`;

const VideoContainer = styled.div`
display: flex;
flex-wrap: wrap;
gap: 0.5rem;
flex: 1;
min-height: 150px;
`;

const VideoTile = styled.video`
width: calc(50% - 0.25rem);
flex: 1;
min-width: 100px;
background-color: #333;
border-radius: 4px;
object-fit: cover;
@media(max-width: 640px) {
  width: 100%;
  height: 200px;
  flex: none;
}
`;

const OutputConsole = styled.div`
flex: 1;
min-height: 150px;
padding: 1rem;
background-color: #1e1e1e;
color: #fff;
font-family: 'Courier New', monospace;
overflow-y: auto;
`;

const ActivityLog = styled.div`
flex: 1;
min-height: 100px;
max-height: 300px;
border-top: 1px solid var(--border-color);
padding: 1rem;
overflow-y: auto;
`;

const ToolbarButton = styled.button`
display: flex;
align-items: center;
justify-content: center;
padding: 0.25rem 0.5rem;
border-radius: 4px;
border: 1px solid var(--border-color);
background-color: white;
cursor: pointer;
height: 32px;
white-space: nowrap;
font-size: 0.85rem;
flex-shrink: 0;
  
  &:hover {
  background-color: #f0f0f0;
}
`;

const LanguageSelector = styled.div`
position: relative;
z-index: 200; /* Higher than toolbar to ensure dropdown visibility */
`;

const LanguageButton = styled.button`
display: flex;
align-items: center;
gap: 0.5rem;
padding: 0.5rem 0.75rem;
border: 1px solid var(--border-color);
border-radius: 6px;
background: white;
cursor: pointer;
font-size: 0.875rem;
min-width: 150px;
justify-content: space-between;
  
  &:hover {
  background-color: #f0f0f0;
  border-color: var(--primary-color);
}
`;

const LanguageMenu = styled.div<{ $show: boolean }>`
position: fixed; /* Changed from absolute to fixed for portal-like behavior */
margin-top: 0.25rem;
background: white;
border: 1px solid var(--border-color);
border-radius: 8px;
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
z-index: 9999; /* Very high to ensure it's above everything */
max-height: 400px;
overflow-y: auto;
min-width: 300px;
display: ${props => props.$show ? 'block' : 'none'};
`;

const LanguageCategory = styled.div`
padding: 0.5rem 0.75rem;
font-weight: 600;
font-size: 0.75rem;
text-transform: uppercase;
color: var(--text-muted);
background: var(--gray-50);
border-bottom: 1px solid var(--border-color);
`;

const LanguageOption = styled.button<{ $active?: boolean }>`
width: 100%;
display: flex;
align-items: center;
gap: 0.75rem;
padding: 0.75rem 1rem;
border: none;
background: ${props => props.$active ? 'var(--gray-50)' : 'white'};
cursor: pointer;
text-align: left;
font-size: 0.875rem;
transition: background 0.2s;
  
  &:hover {
  background: var(--gray-50);
}
  
  .icon {
  font-size: 1.25rem;
  width: 24px;
  text-align: center;
}
  
  .name {
  flex: 1;
  font-weight: ${props => props.$active ? '600' : '400'};
}
  
  .version {
  font-size: 0.75rem;
  color: var(--text-muted);
}
`;

const Overlay = styled.div`
position: fixed;
inset: 0;
background: #1f2937;
display: flex;
align-items: center;
justify-content: center;
z-index: 1000;
`;

const OverlayCard = styled.div`
box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
padding: 2rem;
max-width: 480px;
width: 90%;
`;

const ShareModal = styled.div`
background: white;
padding: 1.5rem;
border-radius: 12px;
width: 90%;
max-width: 500px;
box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
`;

const ShareField = styled.div`
margin-bottom: 1rem;
  
  label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}
  
  .input-group {
  display: flex;
  gap: 0.5rem;
    
    input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--gray-50);
    font-family: monospace;
  }
    
    button {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color);
    background: white;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
      
      &:hover {
      background: var(--gray-50);
    }
  }
}
`;
const ProgressBar = styled.div<{ value: number }>`
width: 100%;
height: 10px;
background: var(--border-color);
border-radius: 6px;
overflow: hidden;
margin-top: 0.75rem;
  &:before {
  content: '';
  display: block;
  height: 100%;
  width: ${props => Math.max(0, Math.min(100, props.value))}%;
  background: var(--primary-color);
  transition: width 0.3s ease;
}
`;

const Spinner = styled.div`
width: 24px;
height: 24px;
border: 3px solid var(--border-color);
border-top-color: var(--primary-color);
border-radius: 50%;
animation: spin 0.8s linear infinite;
@keyframes spin { to { transform: rotate(360deg); } }
`;

const InterviewSession: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, token } = useAuth();
  // Use axios baseURL configured in AuthContext; fallback to env/default
  // Ensure API_BASE is an absolute URL for socket.io
  const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
  const WS_URL = `${API_BASE.replace(/^http/, 'ws')}/yjs`;
  const [language, setLanguage] = useState('javascript');
  const [languages, setLanguages] = useState<{
    id: string;
    name: string;
    icon?: React.ReactNode;
    color?: string;
    category?: string;
    monacoLanguage?: string;
    version?: string;
  }[]>([
    // Web Languages
    { id: 'javascript', name: 'JavaScript', icon: <SiJavascript color="#F7DF1E" />, category: 'web', monacoLanguage: 'javascript' },
    { id: 'typescript', name: 'TypeScript', icon: <SiTypescript color="#3178C6" />, category: 'web', monacoLanguage: 'typescript' },
    { id: 'html', name: 'HTML', icon: <SiHtml5 color="#E34F26" />, category: 'web', monacoLanguage: 'html' },
    { id: 'css', name: 'CSS', icon: <SiCss3 color="#1572B6" />, category: 'web', monacoLanguage: 'css' },
    { id: 'coffeescript', name: 'CoffeeScript', icon: <SiCoffeescript color="#2F2625" />, category: 'web', monacoLanguage: 'coffeescript' },

    // Systems Languages
    { id: 'python', name: 'Python', icon: <SiPython color="#3776AB" />, category: 'scripting', monacoLanguage: 'python' },
    { id: 'java', name: 'Java', icon: <FaJava color="#007396" />, category: 'systems', monacoLanguage: 'java' },
    { id: 'cpp', name: 'C++', icon: <SiCplusplus color="#00599C" />, category: 'systems', monacoLanguage: 'cpp' },
    { id: 'c', name: 'C', icon: <FaCode color="#A8B9CC" />, category: 'systems', monacoLanguage: 'c' },
    { id: 'csharp', name: 'C#', icon: <SiCsharp color="#239120" />, category: 'systems', monacoLanguage: 'csharp' },
    { id: 'rust', name: 'Rust', icon: <SiRust color="#000000" />, category: 'systems', monacoLanguage: 'rust' },
    { id: 'go', name: 'Go', icon: <SiGo color="#00ADD8" />, category: 'systems', monacoLanguage: 'go' },
    { id: 'swift', name: 'Swift', icon: <SiSwift color="#FA7343" />, category: 'systems', monacoLanguage: 'swift' },
    { id: 'kotlin', name: 'Kotlin', icon: <SiKotlin color="#7F52FF" />, category: 'systems', monacoLanguage: 'kotlin' },
    { id: 'scala', name: 'Scala', icon: <SiScala color="#DC322F" />, category: 'systems', monacoLanguage: 'scala' },

    // Scripting Languages
    { id: 'ruby', name: 'Ruby', icon: <SiRuby color="#CC342D" />, category: 'scripting', monacoLanguage: 'ruby' },
    { id: 'php', name: 'PHP', icon: <SiPhp color="#777BB4" />, category: 'scripting', monacoLanguage: 'php' },
    { id: 'perl', name: 'Perl', icon: <SiPerl color="#39457E" />, category: 'scripting', monacoLanguage: 'perl' },
    { id: 'lua', name: 'Lua', icon: <SiLua color="#2C2D72" />, category: 'scripting', monacoLanguage: 'lua' },
    { id: 'bash', name: 'Bash', icon: <SiGnubash color="#4EAA25" />, category: 'scripting', monacoLanguage: 'shell' },
    { id: 'powershell', name: 'PowerShell', icon: <SiPowershell color="#5391FE" />, category: 'scripting', monacoLanguage: 'powershell' },

    // Data/Statistics Languages
    { id: 'r', name: 'R', icon: <SiR color="#276DC3" />, category: 'data', monacoLanguage: 'r' },
    { id: 'julia', name: 'Julia', icon: <SiJulia color="#9558B2" />, category: 'data', monacoLanguage: 'julia' },

    // Functional Languages
    { id: 'haskell', name: 'Haskell', icon: <SiHaskell color="#5D4F85" />, category: 'functional', monacoLanguage: 'haskell' },
    { id: 'clojure', name: 'Clojure', icon: <SiClojure color="#5881D8" />, category: 'functional', monacoLanguage: 'clojure' },
    { id: 'elixir', name: 'Elixir', icon: <SiElixir color="#4B275F" />, category: 'functional', monacoLanguage: 'elixir' },
    { id: 'erlang', name: 'Erlang', icon: <SiErlang color="#A90533" />, category: 'functional', monacoLanguage: 'erlang' },
    { id: 'fsharp', name: 'F#', icon: <SiFsharp color="#378BBA" />, category: 'functional', monacoLanguage: 'fsharp' },
    { id: 'ocaml', name: 'OCaml', icon: <SiOcaml color="#EC6813" />, category: 'functional', monacoLanguage: 'ocaml' },

    // Mobile
    { id: 'dart', name: 'Dart', icon: <SiDart color="#0175C2" />, category: 'mobile', monacoLanguage: 'dart' },

    // Web3/Blockchain
    { id: 'solidity', name: 'Solidity', icon: <SiSolidity color="#363636" />, category: 'web3', monacoLanguage: 'sol' },

    // Data Formats
    { id: 'json', name: 'JSON', icon: <SiJson color="#000000" />, category: 'data', monacoLanguage: 'json' },
    { id: 'yaml', name: 'YAML', icon: <SiYaml color="#CB171E" />, category: 'data', monacoLanguage: 'yaml' },
    { id: 'markdown', name: 'Markdown', icon: <SiMarkdown color="#000000" />, category: 'data', monacoLanguage: 'markdown' },
    { id: 'graphql', name: 'GraphQL', icon: <SiGraphql color="#E10098" />, category: 'data', monacoLanguage: 'graphql' },

    // Databases
    { id: 'sql', name: 'SQL', icon: <FaDatabase color="#4479A1" />, category: 'database', monacoLanguage: 'sql' },
    { id: 'mysql', name: 'MySQL', icon: <SiMysql color="#4479A1" />, category: 'database', monacoLanguage: 'sql' },
    { id: 'postgresql', name: 'PostgreSQL', icon: <SiPostgresql color="#336791" />, category: 'database', monacoLanguage: 'pgsql' },
    { id: 'mongodb', name: 'MongoDB', icon: <SiMongodb color="#47A248" />, category: 'database', monacoLanguage: 'javascript' },

    // Frontend Frameworks
    { id: 'react', name: 'React/JSX', icon: <SiReact color="#61DAFB" />, category: 'framework', monacoLanguage: 'javascript' },
    { id: 'angular', name: 'Angular', icon: <SiAngular color="#DD0031" />, category: 'framework', monacoLanguage: 'typescript' },
    { id: 'vue', name: 'Vue.js', icon: <SiVuedotjs color="#4FC08D" />, category: 'framework', monacoLanguage: 'javascript' },
    { id: 'svelte', name: 'Svelte', icon: <SiSvelte color="#FF3E00" />, category: 'framework', monacoLanguage: 'javascript' },
    { id: 'nextjs', name: 'Next.js', icon: <SiNextdotjs color="#000000" />, category: 'framework', monacoLanguage: 'typescript' },

    // Backend Frameworks
    { id: 'nodejs', name: 'Node.js', icon: <SiNodedotjs color="#339933" />, category: 'framework', monacoLanguage: 'javascript' },
    { id: 'django', name: 'Django', icon: <SiDjango color="#092E20" />, category: 'framework', monacoLanguage: 'python' },
    { id: 'spring', name: 'Spring', icon: <SiSpring color="#6DB33F" />, category: 'framework', monacoLanguage: 'java' },
    { id: 'rails', name: 'Ruby on Rails', icon: <SiRubyonrails color="#CC0000" />, category: 'framework', monacoLanguage: 'ruby' },

    // DevOps
    { id: 'docker', name: 'Dockerfile', icon: <SiDocker color="#2496ED" />, category: 'devops', monacoLanguage: 'dockerfile' },
    { id: 'kubernetes', name: 'Kubernetes', icon: <SiKubernetes color="#326CE5" />, category: 'devops', monacoLanguage: 'yaml' },
    { id: 'terraform', name: 'Terraform', icon: <SiTerraform color="#7B42BC" />, category: 'devops', monacoLanguage: 'hcl' },
  ]);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [stdin] = useState('');
  const [output, setOutput] = useState('');
  const [activities, setActivities] = useState<string[]>([]);
  const getFileExtension = (langId: string): string => {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      csharp: 'cs',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rust: 'rs',
      ruby: 'rb',
      php: 'php',
      swift: 'swift',
      kotlin: 'kt',
      scala: 'scala',
      r: 'r',
      dart: 'dart',
      haskell: 'hs',
      lua: 'lua',
      perl: 'pl',
      bash: 'sh',
      sql: 'sql',
      html: 'html',
      css: 'css',
      json: 'json',
      yaml: 'yaml',
      xml: 'xml'
    };
    return extensions[langId] || 'txt';
  };

  const [files, setFiles] = useState([{ name: `solution.${getFileExtension('javascript')} `, content: '// Your solution here' }]);

  // Update file extension when language changes
  useEffect(() => {
    // Save to local storage
    localStorage.setItem('codewithme_language', language);
  }, [language]);

  // Fetch session details (including password)
  useEffect(() => {
    if (!sessionId) return;
    const fetchSessionDetails = async () => {
      try {
        const res = await axios.get(`/api/v1/sessions/${sessionId}`);
        const session = res?.data?.data?.session;
        if (session) {
          setSessionTitle(session.title);
          // Set the host ID to the session creator
          if (session.created_by) {
            setHostId(session.created_by);
          }
          // Only set password if it exists
          if (session.password) {
            setSessionPassword(session.password);
          }
          // Apply session language from database
          if (session.language) {
            setLanguage(session.language);
            // Update current file extension to match session language
            const newExt = getFileExtension(session.language);
            setFiles(prev => prev.map((file, idx) => {
              if (idx === 0) { // Update first/default file extension
                const baseName = file.name.includes('.')
                  ? file.name.substring(0, file.name.lastIndexOf('.'))
                  : file.name;
                return { ...file, name: `${baseName}.${newExt}` };
              }
              return file;
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch session details', error);
      }
    };
    fetchSessionDetails();
  }, [sessionId, API_BASE]);
  const [currentFile, setCurrentFile] = useState(0);
  const [participants, setParticipants] = useState<{ userId: string; username: string; socketId: string }[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const isHost = !!(user?.id && hostId && user.id === hostId);

  // Waiting room and admission states
  const [admitted, setAdmitted] = useState(false);
  const [waitingForHost, setWaitingForHost] = useState(false);
  const [waitingMessage, setWaitingMessage] = useState('');
  const [_waitingRoom, setWaitingRoom] = useState<{ socketId: string; userId: string; username: string; requestedAt: Date }[]>([]);
  const [admissionRequests, setAdmissionRequests] = useState<{ socketId: string; userId: string; username: string; requestedAt: Date }[]>([]);
  const [autoAdmit, setAutoAdmit] = useState(false);

  const [highContrast, setHighContrast] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [joinProgress, setJoinProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [ready, setReady] = useState(false);

  // Tab state for left panel (Chat, Questions, Whiteboard)
  const [leftPanelTab, _setLeftPanelTab] = useState<'chat' | 'questions' | 'whiteboard'>('chat');
  // Tab state for right panel (Video, Output, Database, Playback)
  const [rightPanelTab, setRightPanelTab] = useState<'video' | 'output' | 'database' | 'playback'>('video');

  // Refs for new components
  const playbackRef = useRef<PlaybackControlsHandle>(null);
  const whiteboardRef = useRef<WhiteboardHandle>(null);

  // Current question loaded from QuestionBank
  const [_currentQuestion, setCurrentQuestion] = useState<Question | null>(null);


  // UI State
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [leftWidth, setLeftWidth] = useState(400);
  const [rightWidth, setRightWidth] = useState(300);
  const [filesHeight, setFilesHeight] = useState('70%'); // TopPane takes 70%, BottomPane (Files) takes 30%
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddFile, setShowAddFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingFileIndex, setRenamingFileIndex] = useState<number | null>(null);
  const [renameFileName, setRenameFileName] = useState('');
  const [sessionPassword, setSessionPassword] = useState('');
  const [_sessionTitle, setSessionTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [activeTab, setActiveTab] = useState<'problem' | 'chat' | 'questions' | 'whiteboard'>('problem');

  // Right Panel vertical resizing state (percentages)
  const [videoHeight, setVideoHeight] = useState('25%');
  const [outputHeight, setOutputHeight] = useState('20%');
  // Activity/Database/Playback tabs take remaining space

  const [cursorStyles, setCursorStyles] = useState('');

  // Meeting Timer State
  const [sessionStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  // Tab Detection State (bulletproof)
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isTabActive, setIsTabActive] = useState(true);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Audio/Video Controls State
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Speaking Indicator State
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);

  // Speaking Detection Effect - uses Web Audio API to analyze audio levels
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animationId: number | null = null;
    let mediaStream: MediaStream | null = null;

    const startAudioAnalysis = async () => {
      try {
        // Get microphone access directly
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(mediaStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;
        source.connect(analyser);

        console.log('[Speaking] Audio analysis started successfully!');

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkAudioLevel = () => {
          if (!analyser) return;

          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

          // Set speaking state based on audio level (threshold ~10-15)
          if (!isMuted) {
            setIsLocalSpeaking(average > 12);
          } else {
            setIsLocalSpeaking(false);
          }

          animationId = requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
      } catch (error) {
        console.error('[Speaking] Error starting audio analysis:', error);
      }
    };

    startAudioAnalysis();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (audioContext) {
        audioContext.close();
      }
      // Don't stop mediaStream tracks as they might be used by video
    };
  }, [isMuted]);

  // Refs
  const editorRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<any>(null);
  const peerRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const presenceDecorationsRef = useRef<Map<number, string[]>>(new Map());
  const presenceWidgetsRef = useRef<Map<number, any>>(new Map());
  const typingTimeoutRef = useRef<any>(null);
  const locksRef = useRef<any>(null);
  const [lockedRanges, setLockedRanges] = useState<Array<{ key: string; ownerId: string; range: { start: { line: number; column: number }; end: { line: number; column: number } } }>>([]);
  const restoredTextRef = useRef<string | null>(null);
  const saveTimerRef = useRef<any>(null);
  const sessionKeyRef = useRef<string>('');
  const completeJoinRef = useRef<() => void>(() => { });

  // Resizing Refs
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);
  const isResizingVertical = useRef(false);
  const isResizingVideo = useRef(false); // Between Video and Output
  const isResizingOutput = useRef(false); // Between Output and Activity

  // Language dropdown positioning
  const languageButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Calculate dropdown position when menu opens
  const handleLanguageMenuOpen = () => {
    if (languageButtonRef.current) {
      const rect = languageButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
    setShowLanguageMenu(!showLanguageMenu);
  };

  // Resize Handlers
  const startResizingLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingLeft.current = true;
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
  };

  const startResizingRight = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRight.current = true;
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
  };

  const startResizingVertical = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingVertical.current = true;
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'row-resize';
  };

  const startResizingVideo = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingVideo.current = true;
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'row-resize';
  };

  const startResizingOutput = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingOutput.current = true;
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'row-resize';
  };

  const resize = (e: MouseEvent) => {
    if (isResizingLeft.current) {
      const newWidth = Math.max(200, Math.min(e.clientX, window.innerWidth - 400));
      setLeftWidth(newWidth);
    } else if (isResizingRight.current) {
      const newWidth = Math.max(200, Math.min(window.innerWidth - e.clientX, window.innerWidth - 400));
      setRightWidth(newWidth);
    } else if (isResizingVertical.current) {
      // Calculate percentage height relative to container (approx 100vh-header)
      const containerHeight = window.innerHeight - 64;
      const newHeight = Math.max(20, Math.min(80, (e.clientY / containerHeight) * 100));
      setFilesHeight(`${newHeight}% `);
    } else if (isResizingVideo.current) {
      const containerHeight = window.innerHeight - 64;
      // We need to know relative position within RightPanel, but simplistic approach:
      // The mouse Y relative to top of viewport approx maps to video height for top element
      const newHeight = Math.max(20, Math.min(80, (e.clientY / containerHeight) * 100));
      setVideoHeight(`${newHeight}% `);
    } else if (isResizingOutput.current) {
      // This moves the border between Output and Activity.
      // Activity is at bottom. Output is middle.
      // e.clientY is position of second resizer. 
      const containerHeight = window.innerHeight - 64;
      const splitPoint = (e.clientY / containerHeight) * 100;
      // Video height is fixed percentage. Output height + Video height = splitPoint.
      // So Output height = splitPoint-parseFloat(videoHeight)
      const vidH = parseFloat(videoHeight);
      const newOutH = Math.max(10, splitPoint - vidH);
      if (vidH + newOutH < 90) { // Safety buffer
        setOutputHeight(`${newOutH}% `);
      }
    }
  };

  const stopResizing = () => {
    isResizingLeft.current = false;
    isResizingRight.current = false;
    isResizingVertical.current = false;
    isResizingVideo.current = false;
    isResizingOutput.current = false;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
  };

  const handleProblemChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setProblemStatement(val);
    socketRef.current?.emit('problem-statement-update', { text: val });
  };

  // Listen for Awareness Updates for Cursors
  useEffect(() => {
    if (!providerRef.current) return;
    const awareness = providerRef.current.awareness;

    const handleAwarenessChange = () => {
      let styles = '';
      awareness.getStates().forEach((state: any, clientId: number) => {
        if (state.user && state.user.name && state.user.color) {
          const safeColor = state.user.color.replace(/;/g, '');
          const safeName = (state.user.name || 'User').replace(/["\\]/g, '').split(' ')[0];
          styles += `
  .yRemoteSelectionHead - ${clientId} { border-left-color: ${safeColor} !important; }
                .yRemoteSelectionHead - ${clientId}::after {
  content: "${safeName}";
  position: absolute;
  top: -1.4em;
  left: -1px;
  background: ${safeColor};
  color: white;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 10px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 50;
}
`;
        }
      });
      setCursorStyles(styles);
    };

    awareness.on('change', handleAwarenessChange);
    return () => {
      awareness.off('change', handleAwarenessChange);
    };
  }, [providerRef.current]); // Re-run when provider attaches

  const handleAddFile = () => {
    if (!newFileName.trim()) return;
    const name = newFileName.trim();

    // Detect language from extension
    let lang = 'javascript'; // default
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext) {
      const langMap: Record<string, string> = {
        'js': 'javascript', 'ts': 'typescript', 'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c', 'html': 'html', 'css': 'css', 'json': 'json'
      };
      if (langMap[ext]) lang = langMap[ext];
    }

    setFiles(prev => [...prev, { name, content: `// ${name}` }]);
    setLanguage(lang);
    // Also update current file index to the new file
    setCurrentFile(files.length); // length before add is index of new file? No, prev gives length. 
    // Wait for next render cycle or use functional updates carefully. 
    // Better:
    const newFiles = [...files, { name, content: `// ${name}` }];
    setFiles(newFiles);
    socketRef.current?.emit('file-update', { files: newFiles });
    setCurrentFile(newFiles.length - 1);

    setNewFileName('');
    setShowAddFile(false);

    // Emit language change
    socketRef.current?.emit('language-change', { language: lang });
  };

  // Meeting Timer-update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  // Keyboard Shortcuts: Ctrl+Enter/Cmd+Enter to run code, Ctrl+S/Cmd+S to save & run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to run code
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCode();
        addActivity('⌨️ Code executed via Ctrl+Enter');
      }
      // Ctrl+S or Cmd+S to save snapshot and run
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveSnapshot();
        runCode();
        addActivity('⌨️ Saved & executed via Ctrl+S');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Bulletproof Tab Detection using Page Visibility API + blur/focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabActive(false);
        setTabSwitchCount(prev => prev + 1);
        addActivity(`⚠️ Tab switched away (Total: ${tabSwitchCount + 1})`);
        socketRef.current?.emit('tab-switch', { count: tabSwitchCount + 1, timestamp: Date.now() });
      } else {
        setIsTabActive(true);
        addActivity('✅ Returned to tab');
      }
    };

    const handleWindowBlur = () => {
      if (!document.hidden) {
        // Window lost focus but document not hidden (e.g., clicked outside browser)
        setIsTabActive(false);
        setTabSwitchCount(prev => prev + 1);
        addActivity(`⚠️ Window focus lost (Total: ${tabSwitchCount + 1})`);
        socketRef.current?.emit('tab-switch', { count: tabSwitchCount + 1, timestamp: Date.now() });
      }
    };

    const handleWindowFocus = () => {
      setIsTabActive(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [tabSwitchCount]);

  // Format elapsed time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording Functions-Captures current browser tab only
  const startRecording = async () => {
    try {
      // Request tab capture with preferCurrentTab to encourage tab-only recording
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser', // Prefer browser tab
        } as any,
        audio: true,
        // @ts-ignore-These are newer API options
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        surfaceSwitching: 'exclude',
        systemAudio: 'exclude'
      });

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-recording-${new Date().toISOString().slice(0, 10)}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        addActivity('📹 Recording saved');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      addActivity('🔴 Recording started');
    } catch (err) {
      console.error('Failed to start recording:', err);
      addActivity('❌ Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Fetch session details to determine host
  useEffect(() => {
    if (!sessionId) return;
    sessionKeyRef.current = `cwms:${sessionId}`;
    setStatusText('Restoring session');
    setJoinProgress(10);
    try {
      const raw = localStorage.getItem(sessionKeyRef.current);
      if (raw) {
        const parsed = JSON.parse(raw);
        const validLang = typeof parsed?.language === 'string' && parsed.language.length > 0;
        const validFile = typeof parsed?.currentFile === 'number' && parsed.currentFile >= 0;
        const validText = typeof parsed?.editorText === 'string';
        if (validLang) setLanguage(parsed.language);
        if (validFile) setCurrentFile(parsed.currentFile);
        if (validText) restoredTextRef.current = parsed.editorText;
      }
      setJoinProgress(25);
      setStatusText('Connecting collaboration');
    } catch (e: any) {
      setRestoreError('Failed to restore previous session');
    }
    (async () => {
      try {
        const res = await axios.get(`/api/v1/sessions/${sessionId}`);
        const createdBy = res?.data?.data?.session?.created_by;
        if (createdBy) setHostId(createdBy);
      } catch (e) { }
    })();
  }, [sessionId]);

  // Initialize collaborative editor
  useEffect(() => {
    if (!sessionId) return;

    // Create Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Connect to WebSocket provider
    const wsProvider = new WebsocketProvider(
      WS_URL,
      `session-${sessionId}`,
      ydoc,
      { params: { token: token || '' } }
    );
    providerRef.current = wsProvider;

    // Awareness (cursor positions, user info)
    const awareness = wsProvider.awareness;
    awareness.setLocalStateField('user', {
      name: user?.name,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    });

    // Log connection status
    wsProvider.on('status', (event: { status: string }) => {
      if (event.status === 'connected') {
        addActivity('Connected to collaboration server');
        setStatusText('Connected collaboration');
        setJoinProgress((p) => (p < 80 ? 80 : p));
      } else if (event.status === 'disconnected') {
        addActivity('Disconnected from collaboration server');
      }
    });

    // Clean up on unmount
    return () => {
      if (wsProvider) {
        wsProvider.disconnect();
      }
      ydoc.destroy();
    };
  }, [sessionId, token, user]);

  // Initialize WebRTC and Socket.IO
  useEffect(() => {
    // Wait for session ID and Host ID to be resolved before connecting
    // This prevents race conditions where the socket connects, then reconnects (changing ID)
    // when hostId loads, causing the user to be stuck in the waiting room.
    if (!sessionId || !hostId) return;

    // ICE servers for WebRTC (STUN + free TURN servers)
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.relay.metered.ca:80' },
      {
        urls: 'turn:global.relay.metered.ca:80',
        username: 'open',
        credential: 'open'
      },
      {
        urls: 'turn:global.relay.metered.ca:443',
        username: 'open',
        credential: 'open'
      },
      {
        urls: 'turn:global.relay.metered.ca:443?transport=tcp',
        username: 'open',
        credential: 'open'
      }
    ];

    // Connect to signaling server
    const socket = io(API_BASE, {
      auth: { token }
    });
    socketRef.current = socket;
    setStatusText('Connecting signaling');
    setJoinProgress((p) => (p < 60 ? 60 : p));

    socket.on('connect', () => {
      console.log('[Socket] Connected with ID:', socket.id);
      setStatusText('Joined signaling');
      setJoinProgress((p) => (p < 90 ? 90 : p));
    });

    socket.on('connect_error', () => {
      setRestoreError('Failed to connect to signaling server');
    });

    // Join session with isCreator flag - check if current user is the session creator
    // Join session logic moved to after getUserMedia to prevent race conditions
    // where host sends offer before we have set up signal listeners.

    // Admission status - determines if user can enter session
    socket.on('admission-status', (status: {
      admitted: boolean;
      isHost: boolean;
      waitingForHost?: boolean;
      message?: string;
    }) => {
      if (status.admitted) {
        setAdmitted(true);
        setWaitingForHost(false);
        setWaitingMessage('');
        // Now ready to enter session
        completeJoinRef.current();
        addActivity(status.isHost ? '👑 Joined as host' : '👤 Joined as participant');
      } else {
        setAdmitted(false);
        setWaitingForHost(status.waitingForHost || false);
        setWaitingMessage(status.message || 'Waiting for admission...');
      }
    });

    // Host receives admission requests
    socket.on('admission-request', (request: {
      socketId: string;
      userId: string;
      username: string;
      requestedAt: Date;
    }) => {
      setAdmissionRequests(prev => [...prev, request]);
      addActivity(`🔔 ${request.username} is waiting to join`);
    });

    // Host receives waiting room list
    socket.on('waiting-room-list', (list: {
      socketId: string;
      userId: string;
      username: string;
      requestedAt: Date;
    }[]) => {
      setWaitingRoom(list);
    });

    // Participant gets rejected
    socket.on('admission-rejected', (data: { message: string }) => {
      setRestoreError(data.message);
      setWaitingMessage('');
      setWaitingForHost(false);
    });

    // Participant notified when host joins
    socket.on('host-joined', () => {
      setWaitingForHost(false);
      setWaitingMessage('Host has joined. Waiting for admission...');
    });

    // Auto-admit setting updated
    socket.on('auto-admit-updated', (data: { enabled: boolean }) => {
      setAutoAdmit(data.enabled);
      addActivity(`Auto-admit ${data.enabled ? 'enabled' : 'disabled'}`);
    });

    socket.on('session-participants', (list: any[]) => {
      setParticipants(list as any);
      addActivity(`Participants loaded: ${list.length} `);
    });

    socket.on('user-joined', (payload: { userId: string; username: string; socketId: string }) => {
      setParticipants(prev => [...prev, payload]);
      addActivity(`User ${payload.username} joined the session`);
    });

    socket.on('user-left', (payload: { userId: string; username: string; socketId: string }) => {
      setParticipants(prev => prev.filter(p => p.socketId !== payload.socketId));
      addActivity(`User ${payload.username} left the session`);
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    });

    // Buffer for signals received before peer is ready
    let pendingSignals: Array<{ from: string; signal: any; username: string }> = [];
    let localStream: MediaStream | null = null;
    let targetSocketId: string | null = null;
    let mediaFailed = false; // Flag to indicate getUserMedia failed

    // Helper to create a peer connection
    const createPeer = (initiator: boolean, toSocketId: string, stream: MediaStream) => {
      if (peerRef.current) {
        console.log('[WebRTC] Peer already exists, skipping creation');
        return;
      }
      console.log(`[WebRTC] Creating ${initiator ? 'initiator' : 'non-initiator'} peer for:`, toSocketId);

      const peer = new SimplePeer({
        initiator,
        trickle: false,
        stream,
        config: { iceServers }
      });
      peerRef.current = peer;

      peer.on('signal', signal => {
        console.log('[WebRTC] Sending signal to:', toSocketId, 'type:', signal?.type);
        socket.emit('signal', { toSocketId, signal });
      });

      peer.on('stream', remoteStream => {
        console.log('[WebRTC] Remote stream received! Tracks:', remoteStream.getTracks().map(t => t.kind));
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.on('error', err => console.error('[WebRTC] Peer error:', err));
      peer.on('connect', () => console.log('[WebRTC] Peer connected!'));
      peer.on('close', () => console.log('[WebRTC] Peer closed'));

      return peer;
    };

    // Handle incoming signals - register BEFORE getUserMedia
    socket.on('signal', (data: { from: string; signal: any; username: string }) => {
      console.log('[WebRTC] Received signal from:', data.from, 'type:', data.signal?.type);

      // If media failed OR stream not ready yet
      if (!localStream && !mediaFailed) {
        // Stream not ready yet AND media hasn't failed, buffer the signal
        console.log('[WebRTC] Buffering signal, stream not ready yet');
        pendingSignals.push(data);
        return;
      }

      // If we don't have a peer yet, create one as non-initiator (we're receiving an offer)
      if (!peerRef.current) {
        targetSocketId = data.from;
        console.log('[WebRTC] Creating non-initiator peer for:', data.from, 'hasStream:', !!localStream);

        const peer = new SimplePeer({
          initiator: false,
          trickle: false,
          stream: localStream || undefined,
          config: { iceServers }
        });
        peerRef.current = peer;

        peer.on('signal', signal => {
          console.log('[WebRTC] Sending signal to:', data.from, 'type:', signal?.type);
          socket.emit('signal', { toSocketId: data.from, signal });
        });

        peer.on('stream', remoteStream => {
          console.log('[WebRTC] Remote stream received! Tracks:', remoteStream.getTracks().map(t => t.kind));
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });

        peer.on('error', err => console.error('[WebRTC] Peer error:', err));
        peer.on('connect', () => console.log('[WebRTC] Peer connected!'));
        peer.on('close', () => console.log('[WebRTC] Peer closed'));
      }

      // Signal the peer
      try {
        peerRef.current?.signal(data.signal);
      } catch (e) {
        console.error('[WebRTC] Signal error:', e);
      }
    });

    // Handle user-joined event for WebRTC (host creates peer when participant joins)
    // This works in conjunction with the user-joined listener above (line ~1230)
    socket.on('user-joined', (payload: { userId: string; username: string; socketId: string }) => {
      console.log('[WebRTC] User joined event received:', payload.username, 'socketId:', payload.socketId);

      // If stream is not ready yet, store the target for later (handled in getUserMedia.then)
      if (!localStream) {
        console.log('[WebRTC] Stream not ready, storing socketId for later:', payload.socketId);
        targetSocketId = payload.socketId;
        return;
      }

      // Stream is ready - create peer as initiator immediately
      if (!peerRef.current) {
        console.log('[WebRTC] Stream ready, creating initiator peer for:', payload.socketId);
        createPeer(true, payload.socketId, localStream);
      } else {
        console.log('[WebRTC] Peer already exists, skipping');
      }
    });

    // Get user media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStream = stream;
        // Store stream in ref for reliable button access
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        console.log('[WebRTC] Local stream ready, tracks:', stream.getTracks().map(t => t.kind));

        // Process any buffered signals
        if (pendingSignals.length > 0) {
          console.log('[WebRTC] Processing', pendingSignals.length, 'buffered signals');
          pendingSignals.forEach(data => {
            if (!peerRef.current) {
              targetSocketId = data.from;
              createPeer(false, data.from, stream);
            }
            try {
              peerRef.current?.signal(data.signal);
            } catch (e) {
              console.error('[WebRTC] Buffered signal error:', e);
            }
          });
          pendingSignals = [];
        }

        // If there's a pending peer to connect to (stored from user-joined before stream was ready)
        if (targetSocketId && !peerRef.current) {
          console.log('[WebRTC] Creating peer for stored target:', targetSocketId);
          createPeer(true, targetSocketId, stream);
        }

        // Join session AFTER media and listeners are ready
        const isCreator = !!(user?.id && hostId && user.id === hostId);
        socket.emit('join-session', {
          sessionId,
          username: user?.name,
          isCreator
        });
        setStatusText('Joining session');
        setJoinProgress((p) => (p < 85 ? 85 : p));
      })
      .catch(err => {
        console.error('Failed to get media devices:', err);
        addActivity('Failed to access camera/microphone - you can still see others');

        // Set flag so signal handler knows to process signals without stream
        mediaFailed = true;

        // Even without local media, we can still RECEIVE remote streams
        console.log('[WebRTC] No local stream, but will still accept incoming connections');

        // Process any buffered signals (create peer without stream to receive remote video)
        if (pendingSignals.length > 0) {
          console.log('[WebRTC] Processing', pendingSignals.length, 'buffered signals without local stream');
          pendingSignals.forEach(data => {
            if (!peerRef.current) {
              console.log('[WebRTC] Creating receive-only peer for:', data.from);
              const peer = new SimplePeer({
                initiator: false,
                trickle: false,
                config: { iceServers }
                // No stream - receive only
              });
              peerRef.current = peer;

              peer.on('signal', signal => {
                console.log('[WebRTC] Sending answer signal to:', data.from);
                socket.emit('signal', { toSocketId: data.from, signal });
              });

              peer.on('stream', remoteStream => {
                console.log('[WebRTC] Remote stream received (no local stream)! Tracks:', remoteStream.getTracks().map(t => t.kind));
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = remoteStream;
                }
              });

              peer.on('error', e => console.error('[WebRTC] Peer error:', e));
              peer.on('connect', () => console.log('[WebRTC] Peer connected (receive-only)!'));
            }
            try {
              peerRef.current?.signal(data.signal);
            } catch (e) {
              console.error('[WebRTC] Signal error:', e);
            }
          });
          pendingSignals = [];
        }

        // If there's a pending target (from user-joined), create initiator peer without stream
        if (targetSocketId && !peerRef.current) {
          console.log('[WebRTC] Creating peer for stored target (no local stream):', targetSocketId);
          const peer = new SimplePeer({
            initiator: true,
            trickle: false,
            config: { iceServers }
          });
          peerRef.current = peer;

          peer.on('signal', signal => {
            console.log('[WebRTC] Sending signal to:', targetSocketId);
            socket.emit('signal', { toSocketId: targetSocketId, signal });
          });

          peer.on('stream', remoteStream => {
            console.log('[WebRTC] Remote stream received! Tracks:', remoteStream.getTracks().map(t => t.kind));
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          });

          peer.on('error', e => console.error('[WebRTC] Peer error:', e));
          peer.on('connect', () => console.log('[WebRTC] Peer connected!'));
        }

        // Still join even if media fails
        const isCreator = !!(user?.id && hostId && user.id === hostId);
        socket.emit('join-session', {
          sessionId,
          username: user?.name,
          isCreator
        });
        setStatusText('Joining session (No Camera)');
      });

    // Handle focus-change broadcasts
    socket.on('focus-change', ({ index, userId, username }: any) => {
      // Apply only host changes if you're not host; ignore non-host when you are host
      if (!isHost && hostId && userId === hostId) {
        setCurrentFile(index);
        addActivity(`Host changed focus to file #${index} `);
      } else if (isHost && hostId && userId !== hostId) {
        addActivity(`Ignored focus change from ${username} (host priority)`);
      }
    });

    // Apply lock override from privileged users
    socket.on('lock-override', ({ key, action, newOwnerId, username }: any) => {
      if (!locksRef.current) return;
      const existing = locksRef.current.get(key);
      if (!existing) return;
      if (action === 'release') {
        locksRef.current.delete(key);
        addActivity(`Lock ${key} released by ${username} `);
      } else if (action === 'transfer' && newOwnerId) {
        locksRef.current.set(key, { ...existing, ownerId: newOwnerId });
        addActivity(`Lock ${key} transferred by ${username} `);
      }
    });

    // Handle language changes
    socket.on('language-change', ({ language, username }: any) => {
      setLanguage(language);
      addActivity(`Language changed to ${language} by ${username} `);
    });

    // Handle problem statement updates
    // Handle problem statement updates
    socket.on('problem-statement-update', ({ text, username }: any) => {
      setProblemStatement(text);
      if (username) addActivity(`Problem statement updated by ${username}`);
    });

    // Handle file updates
    socket.on('file-update', ({ files, updatedBy }: any) => {
      setFiles(files);
      if (updatedBy) addActivity(`Files updated by ${updatedBy}`);
    });

    // Handle code execution results
    socket.on('run-result', (result: any) => {
      setOutput(
        `Exit Code: ${result.exitCode} \n` +
        `Stdout: \n${result.stdout || 'No output'} \n\n` +
        `Stderr: \n${result.stderr || 'No errors'} `
      );
      if (result.userId && result.userId !== socketRef.current?.id) {
        addActivity(`Code executed by participant`);
      }
    });

    // Clean up on unmount
    return () => {
      socket.off('session-participants');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('focus-change');
      socket.off('lock-override');
      socket.off('lock-override');
      socket.off('language-change');
      socket.off('language-change');
      socket.off('problem-statement-update');
      socket.off('file-update');
      socket.off('run-result');
      socket.disconnect();
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
  }, [sessionId, token, API_BASE, isHost, hostId]);

  // Set up Monaco editor binding
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    window.monaco = monaco; // Store monaco globally for language switching

    if (ydocRef.current && providerRef.current) {
      const ytext = ydocRef.current.getText('monaco');
      if (restoredTextRef.current && ytext.length === 0) {
        ytext.insert(0, restoredTextRef.current);
      }

      // Bind Monaco editor to Yjs
      new MonacoBinding(
        ytext,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        providerRef.current.awareness
      );

      // Define custom themes
      monaco.editor.defineTheme('codewithme-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: 'C586C0' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'type', foreground: '4EC9B0' },
          { token: 'variable', foreground: '9CDCFE' },
          { token: 'comment', foreground: '6A9955' }
        ],
        colors: {
          'editor.background': '#1e1e1e',
          'editorLineNumber.foreground': '#858585',
          'editorCursor.foreground': '#AEAFAD',
          'editorIndentGuide.activeBackground': '#707070',
          'editorIndentGuide.background': '#404040'
        }
      });

      monaco.editor.defineTheme('codewithme-hc', {
        base: 'hc-black',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: 'FFCC00' },
          { token: 'string', foreground: '00CCFF' },
          { token: 'number', foreground: '66FF66' },
          { token: 'type', foreground: 'FF9900' },
          { token: 'variable', foreground: 'FFFFFF' },
          { token: 'comment', foreground: 'A0A0A0' }
        ],
        colors: {
          'editor.background': '#000000',
          'editorLineNumber.foreground': '#FFFFFF',
          'editorCursor.foreground': '#FFFFFF',
          'editorIndentGuide.activeBackground': '#FFFFFF',
          'editorIndentGuide.background': '#888888'
        }
      });

      monaco.editor.setTheme(highContrast ? 'codewithme-hc' : 'codewithme-dark');

      const setupLsp = async () => { };

      setupLsp();

      // Presence labels and typing indicator
      const awareness = providerRef.current.awareness;
      // Initialize shared locks map
      locksRef.current = ydocRef.current.getMap('locks');
      const userId = user?.id || 'anonymous';

      const rangeKey = (r: any) => `${currentFile}:${r.start.line}:${r.start.column} -${r.end.line}:${r.end.column} `;

      const refreshLocks = () => {
        const entries: any[] = [];
        locksRef.current.forEach((val: any, key: string) => {
          entries.push({ key, ...val });
        });
        setLockedRanges(entries);
        // Render lock decorations
        if (editorRef.current && entries.length) {
          const decos = entries.map((lk) => ({
            range: new monaco.Range(lk.range.start.line, lk.range.start.column, lk.range.end.line, lk.range.end.column),
            options: {
              className: 'lockedRange',
              isWholeLine: false,
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
            }
          }));
          editorRef.current.deltaDecorations([], decos as any);
        }
      };

      locksRef.current.observe(refreshLocks);

      const requestLock = () => {
        if (!editorRef.current) return;
        const sel = editorRef.current.getSelection();
        if (!sel) return;
        const r = { start: { line: sel.startLineNumber, column: sel.startColumn }, end: { line: sel.endLineNumber, column: sel.endColumn } };
        const key = rangeKey(r);
        const existing = locksRef.current.get(key);
        if (!existing) {
          locksRef.current.set(key, { ownerId: userId, range: r, queue: [] });
          awareness.setLocalStateField('lockedKey', key);
          addActivity('Locked selection for editing');
        } else {
          // enqueue
          const q = Array.isArray(existing.queue) ? existing.queue : [];
          if (!q.includes(userId)) {
            locksRef.current.set(key, { ...existing, queue: [...q, userId] });
            addActivity('Lock busy; added to queue');
          }
        }
      };

      const releaseLock = () => {
        if (!editorRef.current) return;
        const sel = editorRef.current.getSelection();
        if (!sel) return;
        const r = { start: { line: sel.startLineNumber, column: sel.startColumn }, end: { line: sel.endLineNumber, column: sel.endColumn } };
        const key = rangeKey(r);
        const existing = locksRef.current.get(key);
        if (existing && existing.ownerId === userId) {
          const q = Array.isArray(existing.queue) ? existing.queue : [];
          if (q.length) {
            const next = q[0];
            locksRef.current.set(key, { ownerId: next, range: existing.range, queue: q.slice(1) });
            addActivity('Lock transferred to next user in queue');
          } else {
            locksRef.current.delete(key);
            addActivity('Lock released');
          }
        }
      };

      // Prevent edits inside locked ranges for non-owners
      const isInsideLockedRange = (pos: any) => {
        return lockedRanges.some(lk => {
          const { start, end } = lk.range;
          const byOwner = lk.ownerId === userId;
          const inside = (pos.lineNumber > start.line || (pos.lineNumber === start.line && pos.column >= start.column)) &&
            (pos.lineNumber < end.line || (pos.lineNumber === end.line && pos.column <= end.column));
          return inside && !byOwner;
        });
      };

      editor.onKeyDown((e: any) => {
        const pos = editor.getPosition();
        if (pos && isInsideLockedRange(pos)) {
          e.preventDefault?.();
          addActivity('Edit blocked: range locked by another user');
        }
      });

      editor.onDidPaste(() => {
        const pos = editor.getPosition();
        if (pos && isInsideLockedRange(pos)) {
          addActivity('Paste blocked: range locked by another user');
          // revert paste by setting previous value
          const current = editor.getValue();
          editor.setValue(current);
        }
      });

      // Expose helpers on window for toolbar handlers
      (window as any).__codewithme_lockSelection = requestLock;
      (window as any).__codewithme_unlockSelection = releaseLock;
      const renderPresence = () => {
        if (!editorRef.current) return;
        const model = editorRef.current.getModel();
        const states = Array.from(awareness.getStates().entries());
        const newDecorations: { range: any; options: any; clientId: number }[] = [];
        states.forEach(([clientId, state]: any) => {
          const user = state?.user;
          const sel = state?.selection;
          if (!user || !sel || !model) return;
          const range = new monaco.Range(
            sel.start.line,
            sel.start.column,
            sel.end.line,
            sel.end.column
          );
          newDecorations.push({
            range,
            options: {
              className: 'remoteSelection',
              isWholeLine: false,
              overviewRuler: {
                color: user.color || '#00ffff',
                position: monaco.editor.OverviewRulerLane.Full
              },
              border: {
                color: user.color || '#00ffff',
                style: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
              }
            },
            clientId
          });

          // Create/update content widget for labeled cursor
          const widgetId = 'remote-cursor-' + clientId;
          let widget = presenceWidgetsRef.current.get(clientId);
          const dom = document.createElement('div');
          dom.style.background = user.color || '#00ffff';
          dom.style.color = '#000';
          dom.style.padding = '2px 6px';
          dom.style.borderRadius = '8px';
          dom.style.fontSize = '11px';
          dom.style.boxShadow = '0 1px 2px rgba(0,0,0,0.3)';
          dom.innerText = user.name || 'User';

          const position = {
            position: { lineNumber: sel.end.line, column: sel.end.column },
            preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE, monaco.editor.ContentWidgetPositionPreference.EXACT]
          };

          if (!widget) {
            widget = {
              getId: () => widgetId,
              getDomNode: () => dom,
              getPosition: () => position
            };
            presenceWidgetsRef.current.set(clientId, widget);
            editorRef.current.addContentWidget(widget);
          } else {
            // Update existing widget position
            widget.getDomNode = () => dom;
            widget.getPosition = () => position;
            editorRef.current.layoutContentWidget(widget);
          }
        });

        // Remove old
        presenceDecorationsRef.current.forEach((ids) => {
          editorRef.current.deltaDecorations(ids, []);
        });
        presenceDecorationsRef.current.clear();

        // Apply new
        newDecorations.forEach(({ range, options, clientId }) => {
          const ids = editorRef.current.deltaDecorations([], [{ range, options }]);
          presenceDecorationsRef.current.set(clientId, ids);
        });
      };

      awareness.on('change', renderPresence);

      // Local typing indicator with debounce
      const setTyping = () => {
        awareness.setLocalStateField('typing', true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          awareness.setLocalStateField('typing', false);
        }, 1000);
      };

      editor.onDidChangeModelContent(() => {
        setTyping();
        if (!sessionKeyRef.current) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        const content = editor.getValue();
        const payload = { language, currentFile, editorText: content };
        saveTimerRef.current = setTimeout(() => {
          try {
            localStorage.setItem(sessionKeyRef.current, JSON.stringify(payload));
          } catch { }
        }, 500);
      });

      // Keyboard shortcuts
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runCode());
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => (window as any).__codewithme_lockSelection?.());
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyU, () => (window as any).__codewithme_unlockSelection?.());

      // Monitor tab changes for proctoring
      window.addEventListener('blur', () => {
        addActivity('Tab change detected');
        socketRef.current?.emit('proctor-event', {
          type: 'tab-switch',
          timestamp: new Date().toISOString()
        });
      });

      // Monitor clipboard events
      editor.onDidPaste(() => {
        addActivity('Paste detected in editor');
        socketRef.current?.emit('proctor-event', {
          type: 'paste',
          timestamp: new Date().toISOString()
        });
      });
    }
    setStatusText('Ready');
    setJoinProgress(100);
    setReady(true);
  };

  // Get current language metadata (moved up to fix TDZ error)
  const currentLang = languages.find(l => l.id === language) || languages[0];

  useEffect(() => {
    if (!sessionKeyRef.current) return;
    const content = editorRef.current?.getValue() || '';
    const payload = { language, currentFile, editorText: content };
    try {
      localStorage.setItem(sessionKeyRef.current, JSON.stringify(payload));
    } catch { }
  }, [language, currentFile]);

  // Update Monaco editor language when language changes
  useEffect(() => {
    if (editorRef.current && currentLang?.monacoLanguage && window.monaco) {
      const model = editorRef.current.getModel();
      if (model) {
        window.monaco.editor.setModelLanguage(model, currentLang.monacoLanguage);
      }
    }
  }, [language, currentLang]);

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showLanguageMenu && !target.closest('[data-language-selector]')) {
        setShowLanguageMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLanguageMenu]);

  // Note: Languages are defined with React icons in initial state
  // API fetch disabled to preserve icons in dropdown
  // useEffect(() => {
  //   const fetchLanguages = async () => {
  //     try {
  //       const res = await axios.get('/api/v1/languages');
  //       const langs = res?.data?.data?.languages || res?.data?.languages || [];
  //       if (Array.isArray(langs) && langs.length) {
  //         setLanguages(langs.map((l: any) => ({
  //           id: l.id,
  //           name: l.name,
  //           icon: l.icon,
  //           color: l.color,
  //           category: l.category,
  //           monacoLanguage: l.monacoLanguage
  //         })));
  //         if (!langs.find((l: any) => l.id === language)) {
  //           setLanguage(langs[0].id);
  //         }
  //       }
  //     } catch (e) {
  //       // leave defaults on error
  //     }
  //   };
  //   fetchLanguages();
  // }, []);


  // Group languages by category
  const languagesByCategory = languages.reduce((acc, lang) => {
    const cat = lang.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(lang);
    return acc;
  }, {} as Record<string, typeof languages>);

  const categoryNames: Record<string, string> = {
    web: 'Web Development',
    systems: 'Systems Programming',
    functional: 'Functional',
    scripting: 'Scripting',
    data: 'Data & Analytics',
    markup: 'Markup & Config'
  };

  useEffect(() => {
    completeJoinRef.current = () => {
      setStatusText('Ready');
      setJoinProgress(100);
      setReady(true);
    };
    const t = setTimeout(() => {
      if (!ready) completeJoinRef.current();
    }, 5000);
    return () => clearTimeout(t);
  }, [sessionId, ready]);

  const runCode = () => {
    if (!editorRef.current) return;
    const code = editorRef.current.getValue();
    addActivity('Running code');
    setOutput('Executing...');
    socketRef.current?.emit('run-code', {
      language,
      code,
      sessionId,
      input: stdin
    });
    socketRef.current?.emit('run-code', {
      language,
      code,
      sessionId,
      input: stdin
    });
  };

  const saveSnapshot = async () => {
    if (!editorRef.current || !sessionId) return;
    const content = editorRef.current.getValue();
    try {
      const res = await axios.post(`/api/v1/sessions/${sessionId}/snapshots`, { content, language, message: 'Manual snapshot' });
      if (res.status === 201) {
        addActivity('Snapshot saved');
      }
    } catch (e) {
      addActivity('Failed to save snapshot');
    }
  };

  const addActivity = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActivities(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  const copyInvite = async () => {
    const url = `${window.location.origin}/session/${sessionId}`;
    try {
      await navigator.clipboard.writeText(url);
      addActivity('Invite link copied to clipboard');
    } catch {
      addActivity('Failed to copy invite link');
    }
  };

  // Admission handlers for host
  const handleAdmitParticipant = (participantSocketId: string) => {
    socketRef.current?.emit('admit-participant', { participantSocketId, sessionId });
    // Remove from local admission requests
    setAdmissionRequests(prev => prev.filter(r => r.socketId !== participantSocketId));
  };

  const handleRejectParticipant = (participantSocketId: string) => {
    socketRef.current?.emit('reject-participant', { participantSocketId, sessionId });
    // Remove from local admission requests
    setAdmissionRequests(prev => prev.filter(r => r.socketId !== participantSocketId));
  };

  const toggleAutoAdmit = () => {
    const newValue = !autoAdmit;
    socketRef.current?.emit('set-auto-admit', { sessionId, enabled: newValue });
    setAutoAdmit(newValue);
  };

  return (
    <SessionContainer aria-label="Interview Session">
      <style>{cursorStyles}</style>

      {/* Loading/Waiting Room Overlay */}
      {(!ready || (!admitted && !isHost && waitingMessage)) && (
        <Overlay>
          <OverlayCard role="dialog" aria-labelledby="join-status" aria-modal="true" style={{ maxWidth: '400px', textAlign: 'center' }}>
            {waitingMessage ? (
              // Waiting room for participants
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🕐</div>
                <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Waiting Room</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{waitingMessage}</p>
                {waitingForHost ? (
                  <div style={{ padding: '1rem', background: 'var(--gray-100)', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      The host hasn't started the session yet. You'll be admitted once the host joins.
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: '1rem', background: 'var(--gray-100)', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      The host will let you in soon. Please wait...
                    </p>
                  </div>
                )}
                {restoreError && (
                  <div role="alert" style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: 'var(--error-color)' }}>
                    {restoreError}
                  </div>
                )}
              </>
            ) : (
              // Regular loading state
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Spinner role="status" aria-live="polite" />
                  <div id="join-status" style={{ fontWeight: 600, color: 'var(--text-color)' }}>{statusText || 'Preparing session'}</div>
                </div>
                <ProgressBar role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={joinProgress} value={joinProgress} />
                {restoreError && (
                  <div role="alert" style={{ marginTop: '0.75rem', color: 'var(--error-color)' }}>{restoreError}</div>
                )}
              </>
            )}
          </OverlayCard>
        </Overlay>
      )}

      {/* Admission Request Popup for Host */}
      {isHost && admissionRequests.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxWidth: '320px'
        }}>
          {admissionRequests.map((request) => (
            <div
              key={request.socketId}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: '1px solid var(--border-color)',
                animation: 'slideIn 0.3s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1.1rem'
                }}>
                  {request.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{request.username}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>wants to join</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleAdmitParticipant(request.socketId)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  ✓ Admit
                </button>
                <button
                  onClick={() => handleRejectParticipant(request.socketId)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: 'var(--gray-100)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}

          {/* Auto-admit toggle */}
          <div style={{
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '8px',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Auto-admit participants</span>
            <button
              onClick={toggleAutoAdmit}
              style={{
                padding: '0.25rem 0.75rem',
                background: autoAdmit ? '#10b981' : 'var(--gray-200)',
                color: autoAdmit ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.75rem'
              }}
            >
              {autoAdmit ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}
      {
        showShareModal && (
          <Overlay onClick={() => setShowShareModal(false)}>
            <ShareModal onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Share Session</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
                >
                  <FiX />
                </button>
              </div>

              <ShareField>
                <label>Link</label>
                <div className="input-group">
                  <input type="text" readOnly value={`${window.location.origin}/session/${sessionId}`} />
                  <button onClick={copyInvite} title="Copy Link">
                    <FiCopy />
                  </button>
                </div>
              </ShareField>

              <ShareField>
                <label>Meeting ID</label>
                <div className="input-group">
                  <input type="text" readOnly value={sessionId || ''} />
                  <button onClick={() => { navigator.clipboard.writeText(sessionId || ''); addActivity('ID copied'); }} title="Copy ID">
                    <FiCopy />
                  </button>
                </div>
              </ShareField>

              <ShareField>
                <label>Password</label>
                <div className="input-group">
                  <input type="text" readOnly value={sessionPassword ? '••••••••' : 'No Password'} />
                  {sessionPassword && (
                    <button onClick={() => { navigator.clipboard.writeText(sessionPassword); addActivity('Password copied'); }} title="Copy Password">
                      <FiCopy />
                    </button>
                  )}
                </div>
                {sessionPassword && <small style={{ color: 'var(--text-muted)' }}>Share this password securely.</small>}
              </ShareField>
            </ShareModal>
          </Overlay>
        )
      }


      {
        showLeftPanel && (
          <>
            <LeftPanel width={leftWidth} aria-label="Chat and Files Panel">

              <TopPane height={filesHeight}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: '#f5f5f5' }}>
                  {/* Problem tab - Host only */}
                  {isHost && (
                    <button
                      onClick={() => setActiveTab('problem')}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: 'none',
                        background: activeTab === 'problem' ? 'white' : 'transparent',
                        fontWeight: activeTab === 'problem' ? 600 : 'normal',
                        cursor: 'pointer',
                        borderRight: '1px solid var(--border-color)',
                        borderBottom: activeTab === 'problem' ? 'none' : '1px solid var(--border-color)'
                      }}
                    >
                      📝 Problem
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('chat')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: 'none',
                      background: activeTab === 'chat' ? 'white' : 'transparent',
                      fontWeight: activeTab === 'chat' ? 600 : 'normal',
                      cursor: 'pointer',
                      borderRight: '1px solid var(--border-color)',
                      borderBottom: activeTab === 'chat' ? 'none' : '1px solid var(--border-color)'
                    }}
                  >
                    💬 Chat
                  </button>
                  {/* Questions tab - Host only */}
                  {isHost && (
                    <button
                      onClick={() => setActiveTab('questions')}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: 'none',
                        background: activeTab === 'questions' ? 'white' : 'transparent',
                        fontWeight: activeTab === 'questions' ? 600 : 'normal',
                        cursor: 'pointer',
                        borderRight: '1px solid var(--border-color)',
                        borderBottom: activeTab === 'questions' ? 'none' : '1px solid var(--border-color)'
                      }}
                    >
                      📚 Questions
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('whiteboard')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: 'none',
                      background: activeTab === 'whiteboard' ? 'white' : 'transparent',
                      fontWeight: activeTab === 'whiteboard' ? 600 : 'normal',
                      cursor: 'pointer',
                      borderBottom: activeTab === 'whiteboard' ? 'none' : '1px solid var(--border-color)'
                    }}
                  >
                    🎨 Whiteboard
                  </button>
                </div>

                {activeTab === 'problem' && (
                  <textarea
                    value={problemStatement}
                    onChange={handleProblemChange}
                    placeholder={isHost ? "Type problem statement here..." : "Waiting for host..."}
                    disabled={!isHost}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      border: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      lineHeight: '1.5',
                      outline: 'none',
                      background: 'white'
                    }}
                  />
                )}
                {activeTab === 'chat' && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <ChatInterface
                      isHost={isHost}
                      sessionId={sessionId || ''}
                      socket={socketRef.current}
                      username={user?.name || 'Anonymous'}
                      userId={user?.id || 'anonymous'}
                    />
                  </div>
                )}
                {activeTab === 'questions' && (
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <QuestionBank
                      onSelectQuestion={(question) => setCurrentQuestion(question)}
                      onLoadQuestion={(question) => {
                        setCurrentQuestion(question);
                        // Load starter code into editor if available
                        const starterCode = question.starterCode?.[language] ||
                          question.starterCode?.['javascript'] ||
                          `// ${question.title}\n// ${question.description}`;
                        const newContent = starterCode;
                        setFiles(prev => prev.map((f, i) =>
                          i === currentFile ? { ...f, content: newContent } : f
                        ));
                        // Switch to problem tab to show the question
                        setActiveTab('problem');
                        // Update problem statement
                        setProblemStatement(`## ${question.title}\n\n${question.description}\n\n### Test Cases:\n${question.testCases.map((tc, i) => `${i + 1}. Input: ${tc.input}\n   Output: ${tc.expectedOutput}`).join('\n')}`);
                        addActivity(`📚 Loaded question: ${question.title}`);
                      }}
                    />
                  </div>
                )}
                {activeTab === 'whiteboard' && (
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <Whiteboard
                      ref={whiteboardRef}
                      onDraw={(action) => {
                        // Broadcast whiteboard actions to other participants
                        socketRef.current?.emit('whiteboard-draw', action);
                      }}
                    />
                  </div>
                )}
              </TopPane>

              <VerticalResizer onMouseDown={startResizingVertical} />

              <BottomPane>
                <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Files</span>
                  <button
                    onClick={() => setShowAddFile(!showAddFile)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                    title="Add File"
                  >
                    +
                  </button>
                </div>

                {showAddFile && (
                  <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.25rem' }}>
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="filename.ext"
                      style={{ flex: 1, padding: '0.25rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddFile()}
                    />
                    <button onClick={handleAddFile} style={{ padding: '0.25rem 0.5rem', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add</button>
                  </div>
                )}

                <FileTree aria-label="File Tree">
                  <ul>
                    {files.map((file, index) => (
                      <li
                        key={index}
                        onClick={() => {
                          if (renamingFileIndex === index) return;
                          setCurrentFile(index);
                          socketRef.current?.emit('focus-change', { index });
                        }}
                        style={{
                          cursor: 'pointer',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: currentFile === index ? 'rgba(0,0,0,0.05)' : 'transparent',
                          fontWeight: currentFile === index ? '600' : 'normal',
                          color: currentFile === index ? 'var(--primary-color)' : 'var(--text-color)',
                          display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                          <span>📄</span>
                          {renamingFileIndex === index ? (
                            <input
                              type="text"
                              value={renameFileName}
                              onChange={(e) => setRenameFileName(e.target.value)}
                              onBlur={() => {
                                if (renameFileName.trim() && renameFileName !== file.name) {
                                  const updated = files.map((f, i) => i === index ? { ...f, name: renameFileName.trim() } : f);
                                  setFiles(updated);
                                  socketRef.current?.emit('file-update', { files: updated });
                                }
                                setRenamingFileIndex(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (renameFileName.trim() && renameFileName !== file.name) {
                                    const updated = files.map((f, i) => i === index ? { ...f, name: renameFileName.trim() } : f);
                                    setFiles(updated);
                                    socketRef.current?.emit('file-update', { files: updated });
                                  }
                                  setRenamingFileIndex(null);
                                } else if (e.key === 'Escape') {
                                  setRenamingFileIndex(null);
                                }
                              }}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              style={{ flex: 1, padding: '2px 4px', fontSize: '0.875rem', border: '1px solid var(--primary-color)', borderRadius: '2px' }}
                            />
                          ) : (
                            <span>{file.name}</span>
                          )}
                        </div>
                        {renamingFileIndex !== index && (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameFileName(file.name);
                                setRenamingFileIndex(index);
                              }}
                              title="Rename"
                              style={{ padding: '2px 4px', fontSize: '0.6rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (files.length > 1) {
                                  setFiles(prev => prev.filter((_, i) => i !== index));
                                  if (currentFile >= index && currentFile > 0) {
                                    setCurrentFile(currentFile - 1);
                                  }
                                }
                              }}
                              title="Delete"
                              disabled={files.length <= 1}
                              style={{ padding: '2px 4px', fontSize: '0.6rem', background: 'transparent', border: 'none', cursor: files.length > 1 ? 'pointer' : 'not-allowed', color: files.length > 1 ? 'var(--error-color)' : 'var(--text-muted)', opacity: files.length > 1 ? 1 : 0.5 }}
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </FileTree>
              </BottomPane>

              {/* Chat Interface can be a toggle or another tab. For now, let's keep it simple or hide it if not requested, but better to keep it accessible. 
                   Actually, user said "Problem statement pane and files pane". Chat might be secondary. 
                   I will hide Chat for now to focus on the requested structure, or add it to a tab later. 
                   Let's assume Chat is not the priority right now or fits in TopPane if I tabbed it. 
                   For this step, I will replace Chat with ProblemStatement as implicit in the request "Problem statement pane". 
               */}
            </LeftPanel>
            <Resizer onMouseDown={startResizingLeft} />
          </>
        )
      }

      <EditorContainer aria-label="Editor Panel">
        <EditorToolbar>
          <ToolbarButton onClick={runCode}>▶ Run</ToolbarButton>
          <LanguageSelector data-language-selector>
            <LanguageButton
              ref={languageButtonRef}
              onClick={handleLanguageMenuOpen}
              aria-label="Select Language"
            >
              <span>{currentLang?.icon} {currentLang?.name || 'Select Language'}</span>
              <span>▼</span>
            </LanguageButton>
            <LanguageMenu
              $show={showLanguageMenu}
              data-language-selector
              style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
            >
              {Object.entries(languagesByCategory).map(([category, langs]) => (
                <div key={category}>
                  <LanguageCategory>{categoryNames[category] || category}</LanguageCategory>
                  {langs.map((lang) => (
                    <LanguageOption
                      key={lang.id}
                      $active={lang.id === language}
                      onClick={() => {
                        setLanguage(lang.id);
                        socketRef.current?.emit('language-change', { language: lang.id });
                        setShowLanguageMenu(false);

                        // Update current file extension to match selected language
                        const newExt = getFileExtension(lang.id);
                        setFiles(prev => prev.map((file, idx) => {
                          if (idx === currentFile) {
                            const baseName = file.name.includes('.')
                              ? file.name.substring(0, file.name.lastIndexOf('.'))
                              : file.name;
                            return { ...file, name: `${baseName}.${newExt}` };
                          }
                          return file;
                        }));

                        // Update Monaco editor language
                        if (editorRef.current && lang.monacoLanguage && window.monaco) {
                          const model = editorRef.current.getModel();
                          if (model) {
                            window.monaco.editor.setModelLanguage(model, lang.monacoLanguage);
                          }
                        }
                      }}
                    >
                      <span className="icon">{lang.icon || '📝'}</span>
                      <span className="name">{lang.name}</span>
                      <span className="version">{lang.version || ''}</span>
                    </LanguageOption>
                  ))}
                </div>
              ))}
            </LanguageMenu>
          </LanguageSelector>
          <ToolbarButton onClick={saveSnapshot}>💾 Save Snapshot</ToolbarButton>
          <ToolbarButton
            onClick={() => {
              if (editorRef.current) {
                editorRef.current.getAction('editor.action.formatDocument')?.run();
                addActivity('✨ Code formatted');
              }
            }}
            title="Format Code (Shift+Alt+F)"
          >
            ✨ Format
          </ToolbarButton>
          <ToolbarButton onClick={() => (window as any).__codewithme_lockSelection?.()}>Lock Selection</ToolbarButton>
          <ToolbarButton onClick={() => (window as any).__codewithme_unlockSelection?.()}>Unlock Selection</ToolbarButton>
          <ToolbarButton title="Toggle High Contrast" onClick={() => { /* toggle theme override */ }}>
            <FiCheck />
          </ToolbarButton>

          <ToolbarButton onClick={() => setShowLeftPanel(v => !v)} title="Toggle File/Chat Panel">
            <FiSidebar />
          </ToolbarButton>
          <ToolbarButton onClick={() => setShowRightPanel(v => !v)} title="Toggle Video/Output Panel">
            <FiLayout />
          </ToolbarButton>

          {/* Meeting Timer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.25rem 0.75rem',
            background: '#f0f0f0',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            ⏱️ {formatTime(elapsedTime)}
          </div>

          {/* Tab Switch Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.5rem',
            background: tabSwitchCount > 0 ? (isTabActive ? '#fff3cd' : '#f8d7da') : '#d4edda',
            borderRadius: '4px',
            fontSize: '0.8rem',
            color: tabSwitchCount > 0 ? '#856404' : '#155724'
          }} title="Tab switches detected">
            {isTabActive ? '👁️' : '🚫'} {tabSwitchCount} switches
          </div>

          {/* Recording Button */}
          {/* Recording Button - Host Only */}
          {isHost && (
            <ToolbarButton
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                background: isRecording ? '#dc3545' : '#28a745',
                color: 'white',
                borderColor: isRecording ? '#dc3545' : '#28a745'
              }}
              title={isRecording ? "Stop Recording" : "Start Recording"}
            >
              {isRecording ? '⏹️ Stop' : '🔴 Record'}
            </ToolbarButton>
          )}

          <ToolbarButton onClick={() => setShowShareModal(true)} style={{ background: 'var(--primary-color)', color: 'white', borderColor: 'var(--primary-color)' }}>
            <FiShare2 style={{ marginRight: '0.5rem' }} /> Share
          </ToolbarButton>
        </EditorToolbar>

        <EditorWrapper>
          <Editor
            height="100%"
            language={currentLang?.monacoLanguage || language}
            defaultValue={files[currentFile].content}
            onMount={handleEditorDidMount}
            theme={highContrast ? 'codewithme-hc' : 'codewithme-dark'}
            options={{
              // Core Editor Settings
              fontSize: 14,
              fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
              fontLigatures: true,
              wordWrap: 'on',
              automaticLayout: true,
              lineNumbers: 'on',
              lineNumbersMinChars: 3,

              // Minimap
              minimap: { enabled: true, scale: 1, showSlider: 'mouseover' },

              // Code Folding (I.E)
              folding: true,
              foldingStrategy: 'auto',
              foldingHighlight: true,
              showFoldingControls: 'always',

              // Bracket Matching & Coloring (I.C)
              matchBrackets: 'always',
              bracketPairColorization: { enabled: true },
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              autoClosingOvertype: 'always',
              autoSurround: 'languageDefined',

              // Multi-Cursor (I.D) - Built-in support
              multiCursorModifier: 'alt',
              multiCursorMergeOverlapping: true,

              // Autocomplete & Suggestions (I.B)
              quickSuggestions: { other: true, comments: false, strings: true },
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
              tabCompletion: 'on',
              wordBasedSuggestions: true,
              parameterHints: { enabled: true },
              suggest: {
                showMethods: true,
                showFunctions: true,
                showConstructors: true,
                showFields: true,
                showVariables: true,
                showClasses: true,
                showStructs: true,
                showInterfaces: true,
                showModules: true,
                showProperties: true,
                showEvents: true,
                showOperators: true,
                showUnits: true,
                showValues: true,
                showConstants: true,
                showEnums: true,
                showEnumMembers: true,
                showKeywords: true,
                showWords: true,
                showColors: true,
                showFiles: true,
                showReferences: true,
                showFolders: true,
                showTypeParameters: true,
                showSnippets: true,
                showUsers: true,
                showIssues: true,
                insertMode: 'insert',
                filterGraceful: true,
                localityBonus: true,
                shareSuggestSelections: true,
                snippetsPreventQuickSuggestions: false,
                preview: true,
                previewMode: 'prefix',
              },

              // Indentation
              autoIndent: 'full',
              detectIndentation: true,
              tabSize: 2,
              insertSpaces: true,

              // Error Detection (I.F)
              glyphMargin: true,
              lightbulb: { enabled: true },

              // Readability
              renderWhitespace: 'boundary',
              renderLineHighlight: 'all',
              // renderIndentGuides is deprecated, using guides.indentation instead
              guides: {
                bracketPairs: true,
                indentation: true,
                highlightActiveIndentation: true,
              },

              // Sticky Scroll (shows context)
              stickyScroll: { enabled: true },

              // Scrolling
              smoothScrolling: true,
              scrollBeyondLastLine: false,

              // Find & Replace (I.G)
              find: {
                addExtraSpaceOnTop: true,
                autoFindInSelection: 'multiline',
                seedSearchStringFromSelection: 'selection',
              },

              // Code Actions
              codeActionsOnSaveTimeout: 750,
              codeLens: true,

              // Selection
              selectionHighlight: true,
              occurrencesHighlight: true,

              // Cursor
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              cursorStyle: 'line',
              cursorWidth: 2,

              // Line options
              lineDecorationsWidth: 10,
              lineHeight: 22,

              // Drag and drop
              dragAndDrop: true,

              // Links
              links: true,

              // Comments
              comments: { insertSpace: true },

              // Formatting
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </EditorWrapper>
      </EditorContainer>

      <Resizer onMouseDown={startResizingRight} />
      {
        showRightPanel && (
          <>
            <Resizer onMouseDown={startResizingRight} />
            <RightPanel width={rightWidth} aria-label="Video and Output Panel">
              <div style={{ height: videoHeight, minHeight: '100px', display: 'flex', flexDirection: 'column' }}>
                <VideoPanel>
                  {/* Video Header with Controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Video & Audio</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {/* Mute/Unmute Button */}
                      <button
                        onClick={() => {
                          const stream = localStreamRef.current;
                          if (stream) {
                            stream.getAudioTracks().forEach(track => {
                              track.enabled = isMuted;
                            });
                            setIsMuted(!isMuted);
                          }
                        }}
                        style={{
                          padding: '0.25rem 0.5rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          background: isMuted ? '#dc3545' : 'var(--surface-color)',
                          color: isMuted ? 'white' : 'var(--text-color)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? '🔇 Unmute' : '🔊 Mute'}
                      </button>
                      {/* Camera On/Off Button */}
                      <button
                        onClick={() => {
                          const stream = localStreamRef.current;
                          if (stream) {
                            stream.getVideoTracks().forEach(track => {
                              track.enabled = isVideoOff;
                            });
                            setIsVideoOff(!isVideoOff);
                          }
                        }}
                        style={{
                          padding: '0.25rem 0.5rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          background: isVideoOff ? '#dc3545' : 'var(--surface-color)',
                          color: isVideoOff ? 'white' : 'var(--text-color)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                      >
                        {isVideoOff ? '📷 Camera On' : '📹 Camera Off'}
                      </button>
                    </div>
                  </div>
                  <VideoContainer>
                    {/* Local Video Tile with Speaking Indicator */}
                    <div style={{
                      position: 'relative',
                      width: 'calc(50% - 0.25rem)',
                      minWidth: '100px',
                      flex: 1,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: isLocalSpeaking ? '3px solid #22c55e' : '3px solid transparent',
                      boxShadow: isLocalSpeaking ? '0 0 12px rgba(34, 197, 94, 0.6)' : 'none',
                      transition: 'border 0.2s, box-shadow 0.2s',
                    }}>
                      {/* Avatar Placeholder when Camera Off */}
                      {isVideoOff && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(135deg, #374151, #1f2937)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1
                        }}>
                          <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            color: 'white',
                            marginBottom: '0.5rem'
                          }}>
                            👤
                          </div>
                          <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 500 }}>You</span>
                        </div>
                      )}
                      <VideoTile ref={localVideoRef} autoPlay muted playsInline style={{ opacity: isVideoOff ? 0 : 1, width: '100%', height: '100%' }} />
                      {/* Name Label */}
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isLocalSpeaking && <span style={{ color: '#22c55e' }}>🔊</span>}
                        You {isHost ? '(Host)' : ''} {isMuted && '(Muted)'}
                      </div>
                    </div>

                    {/* Remote Video Tile with Speaking Indicator */}
                    <div style={{
                      position: 'relative',
                      width: 'calc(50% - 0.25rem)',
                      minWidth: '100px',
                      flex: 1,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: isRemoteSpeaking ? '3px solid #22c55e' : '3px solid transparent',
                      boxShadow: isRemoteSpeaking ? '0 0 12px rgba(34, 197, 94, 0.6)' : 'none',
                      transition: 'border 0.2s, box-shadow 0.2s',
                      background: '#1f2937'
                    }}>
                      {/* Default Avatar for Remote (shown when no remote stream) */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, #374151, #1f2937)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          color: 'white',
                          marginBottom: '0.5rem'
                        }}>
                          👤
                        </div>
                        <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 500 }}>{isHost ? 'Participant' : 'Host'}</span>
                      </div>
                      <VideoTile ref={remoteVideoRef} autoPlay playsInline style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }} />
                      {/* Name Label */}
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        zIndex: 2
                      }}>
                        {isRemoteSpeaking && <span style={{ color: '#22c55e' }}>🔊</span>}
                        {participants.length > 0
                          ? `${participants[0]?.username || (isHost ? 'Participant' : 'Host')}${!isHost ? ' (Host)' : ''}`
                          : (isHost ? 'Waiting for participant...' : 'Host (Host)')}
                      </div>
                    </div>
                  </VideoContainer>
                </VideoPanel>
              </div>

              <VerticalResizer onMouseDown={startResizingVideo} style={{ cursor: 'row-resize' }} />

              <div style={{ height: outputHeight, minHeight: '50px', display: 'flex', flexDirection: 'column' }}>
                <OutputConsole>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Console Output</h4>
                    <button onClick={() => setOutput('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>Clear</button>
                  </div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{output || 'Run code to see output...'}</pre>
                </OutputConsole>
              </div>

              <VerticalResizer onMouseDown={startResizingOutput} style={{ cursor: 'row-resize' }} />

              <div style={{ flex: 1, minHeight: '300px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {isHost ? (
                  <>
                    {/* Tab bar for Activity/Database/Playback - Host only */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: '#f5f5f5' }}>
                      <button
                        onClick={() => setRightPanelTab('video')}
                        style={{
                          flex: 1,
                          padding: '0.375rem',
                          border: 'none',
                          background: rightPanelTab === 'video' ? 'white' : 'transparent',
                          fontWeight: rightPanelTab === 'video' ? 600 : 'normal',
                          cursor: 'pointer',
                          borderBottom: rightPanelTab === 'video' ? 'none' : '1px solid var(--border-color)',
                          fontSize: '0.8rem'
                        }}
                      >
                        📋 Activity
                      </button>
                      <button
                        onClick={() => setRightPanelTab('database')}
                        style={{
                          flex: 1,
                          padding: '0.375rem',
                          border: 'none',
                          background: rightPanelTab === 'database' ? 'white' : 'transparent',
                          fontWeight: rightPanelTab === 'database' ? 600 : 'normal',
                          cursor: 'pointer',
                          borderBottom: rightPanelTab === 'database' ? 'none' : '1px solid var(--border-color)',
                          fontSize: '0.8rem'
                        }}
                      >
                        🗄️ Database
                      </button>
                      <button
                        onClick={() => setRightPanelTab('playback')}
                        style={{
                          flex: 1,
                          padding: '0.375rem',
                          border: 'none',
                          background: rightPanelTab === 'playback' ? 'white' : 'transparent',
                          fontWeight: rightPanelTab === 'playback' ? 600 : 'normal',
                          cursor: 'pointer',
                          borderBottom: rightPanelTab === 'playback' ? 'none' : '1px solid var(--border-color)',
                          fontSize: '0.8rem'
                        }}
                      >
                        ▶️ Playback
                      </button>
                    </div>

                    {/* Tab content */}
                    {rightPanelTab === 'video' && (
                      <ActivityLog>
                        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Activity Log</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {activities.map((act, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{act}</li>)}
                        </ul>
                      </ActivityLog>
                    )}
                    {rightPanelTab === 'database' && (
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <DatabasePanel
                          sessionId={sessionId || ''}
                          onQueryResult={(result) => {
                            addActivity(`🗄️ Query executed: ${result.rowCount} rows in ${result.executionTime}ms`);
                          }}
                        />
                      </div>
                    )}
                    {rightPanelTab === 'playback' && (
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <PlaybackControls
                          ref={playbackRef}
                          onSeek={(timestamp) => {
                            addActivity(`⏩ Seeked to ${Math.floor(timestamp / 1000)}s`);
                          }}
                          onPlayStateChange={(isPlaying) => {
                            addActivity(isPlaying ? '▶️ Playback started' : '⏸️ Playback paused');
                          }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  // Simplified view for participants
                  <div style={{ padding: '1rem', background: 'var(--surface-color)', flex: 1 }}>
                    <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>👤 Session Info</h4>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <p style={{ margin: '0 0 0.5rem' }}>👥 Participants: {participants.length + 1}</p>
                      <p style={{ margin: '0' }}>🎯 Focus on the code and collaborate with the host!</p>
                    </div>
                  </div>
                )}
              </div>
            </RightPanel>
          </>
        )
      }</SessionContainer >
  );
};

export default InterviewSession;


