import React, { useState } from 'react';
import styled from 'styled-components';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter, FaCheck, FaTimes, FaCode, FaClock, FaStar } from 'react-icons/fa';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface-color);
`;

const Header = styled.div`
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SearchInput = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  background: var(--surface-elevated);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0 0.75rem;

  input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0.5rem;
    color: var(--text-color);
    outline: none;

    &::placeholder {
      color: var(--text-muted);
    }
  }

  svg {
    color: var(--text-muted);
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.variant === 'danger' ? '#dc3545' : 'var(--border-color)'};
  background: ${props => props.variant === 'primary' ? 'var(--primary-color)' :
        props.variant === 'danger' ? '#dc3545' : 'var(--surface-color)'};
  color: ${props => props.variant ? 'white' : 'var(--text-color)'};
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

const FilterTags = styled.div`
  padding: 0.5rem 1rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--border-color);
`;

const FilterTag = styled.button<{ active?: boolean }>`
  padding: 0.25rem 0.75rem;
  border: 1px solid ${props => props.active ? 'var(--primary-color)' : 'var(--border-color)'};
  background: ${props => props.active ? 'var(--primary-color)' : 'transparent'};
  color: ${props => props.active ? 'white' : 'var(--text-muted)'};
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary-color);
  }
`;

const QuestionList = styled.div`
  flex: 1;
  overflow: auto;
`;

const QuestionCard = styled.div<{ selected?: boolean }>`
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  background: ${props => props.selected ? 'var(--surface-hover)' : 'transparent'};

  &:hover {
    background: var(--surface-hover);
  }
`;

const QuestionTitle = styled.h3`
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const QuestionMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--text-muted);
`;

const DifficultyBadge = styled.span<{ level: 'easy' | 'medium' | 'hard' }>`
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  background: ${props =>
        props.level === 'easy' ? '#28a745' :
            props.level === 'medium' ? '#ffc107' : '#dc3545'};
  color: ${props => props.level === 'medium' ? 'black' : 'white'};
`;

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.5rem;
`;

const Tag = styled.span`
  padding: 0.125rem 0.5rem;
  background: var(--surface-elevated);
  border-radius: 4px;
  font-size: 0.7rem;
  color: var(--text-muted);
`;

const DetailPanel = styled.div`
  border-left: 1px solid var(--border-color);
  width: 50%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const DetailHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
`;

const DetailContent = styled.div`
  flex: 1;
  padding: 1rem;
  overflow: auto;
`;

const TestCaseList = styled.div`
  margin-top: 1rem;
`;

const TestCase = styled.div`
  padding: 0.75rem;
  background: var(--surface-elevated);
  border-radius: 4px;
  margin-bottom: 0.5rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;

  .label {
    color: var(--text-muted);
    font-size: 0.7rem;
    margin-bottom: 0.25rem;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

export interface Question {
    id: string;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    tags: string[];
    timeLimit: number; // minutes
    starterCode?: Record<string, string>; // language -> code
    testCases: Array<{
        input: string;
        expectedOutput: string;
        isHidden?: boolean;
    }>;
    hints?: string[];
    solution?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface QuestionBankProps {
    onSelectQuestion?: (question: Question) => void;
    onLoadQuestion?: (question: Question) => void;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ onSelectQuestion, onLoadQuestion }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

    // Mock questions data
    const [questions] = useState<Question[]>([
        {
            id: '1',
            title: 'Two Sum',
            description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
            difficulty: 'easy',
            category: 'Arrays',
            tags: ['array', 'hash-table'],
            timeLimit: 20,
            starterCode: {
                javascript: 'function twoSum(nums, target) {\n  // Your code here\n}',
                python: 'def two_sum(nums: list, target: int) -> list:\n    # Your code here\n    pass',
                java: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n    }\n}',
            },
            testCases: [
                { input: '[2,7,11,15], 9', expectedOutput: '[0,1]' },
                { input: '[3,2,4], 6', expectedOutput: '[1,2]' },
                { input: '[3,3], 6', expectedOutput: '[0,1]' },
            ],
            hints: ['Try using a hash map', 'Think about complement = target - current'],
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '2',
            title: 'Valid Parentheses',
            description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
            difficulty: 'easy',
            category: 'Stack',
            tags: ['stack', 'string'],
            timeLimit: 15,
            starterCode: {
                javascript: 'function isValid(s) {\n  // Your code here\n}',
                python: 'def is_valid(s: str) -> bool:\n    # Your code here\n    pass',
            },
            testCases: [
                { input: '"()"', expectedOutput: 'true' },
                { input: '"()[]{}"', expectedOutput: 'true' },
                { input: '"(]"', expectedOutput: 'false' },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '3',
            title: 'Reverse Linked List',
            description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
            difficulty: 'medium',
            category: 'Linked List',
            tags: ['linked-list', 'recursion'],
            timeLimit: 25,
            testCases: [
                { input: '[1,2,3,4,5]', expectedOutput: '[5,4,3,2,1]' },
                { input: '[1,2]', expectedOutput: '[2,1]' },
                { input: '[]', expectedOutput: '[]' },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '4',
            title: 'Merge Intervals',
            description: 'Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals.',
            difficulty: 'medium',
            category: 'Arrays',
            tags: ['array', 'sorting'],
            timeLimit: 30,
            testCases: [
                { input: '[[1,3],[2,6],[8,10],[15,18]]', expectedOutput: '[[1,6],[8,10],[15,18]]' },
                { input: '[[1,4],[4,5]]', expectedOutput: '[[1,5]]' },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: '5',
            title: 'LRU Cache',
            description: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.',
            difficulty: 'hard',
            category: 'Design',
            tags: ['design', 'hash-table', 'linked-list'],
            timeLimit: 45,
            testCases: [
                { input: 'LRUCache(2), put(1,1), put(2,2), get(1)', expectedOutput: '1' },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ]);

    const categories = [...new Set(questions.map(q => q.category))];
    const difficulties = ['easy', 'medium', 'hard'] as const;

    const filteredQuestions = questions.filter(q => {
        const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDifficulty = !selectedDifficulty || q.difficulty === selectedDifficulty;
        const matchesCategory = !selectedCategory || q.category === selectedCategory;
        return matchesSearch && matchesDifficulty && matchesCategory;
    });

    const handleSelectQuestion = (question: Question) => {
        setSelectedQuestion(question);
        onSelectQuestion?.(question);
    };

    const handleLoadQuestion = () => {
        if (selectedQuestion) {
            onLoadQuestion?.(selectedQuestion);
        }
    };

    return (
        <Container>
            <Header>
                <SearchInput>
                    <FaSearch />
                    <input
                        type="text"
                        placeholder="Search questions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </SearchInput>
                <Button variant="primary">
                    <FaPlus /> New Question
                </Button>
            </Header>

            <FilterTags>
                <FilterTag
                    active={!selectedDifficulty}
                    onClick={() => setSelectedDifficulty(null)}
                >
                    All Levels
                </FilterTag>
                {difficulties.map(d => (
                    <FilterTag
                        key={d}
                        active={selectedDifficulty === d}
                        onClick={() => setSelectedDifficulty(selectedDifficulty === d ? null : d)}
                    >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                    </FilterTag>
                ))}
                <span style={{ margin: '0 0.5rem', color: 'var(--border-color)' }}>|</span>
                {categories.map(c => (
                    <FilterTag
                        key={c}
                        active={selectedCategory === c}
                        onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}
                    >
                        {c}
                    </FilterTag>
                ))}
            </FilterTags>

            <MainContent>
                <QuestionList>
                    {filteredQuestions.map(question => (
                        <QuestionCard
                            key={question.id}
                            selected={selectedQuestion?.id === question.id}
                            onClick={() => handleSelectQuestion(question)}
                        >
                            <QuestionTitle>
                                <DifficultyBadge level={question.difficulty}>
                                    {question.difficulty.toUpperCase()}
                                </DifficultyBadge>
                                {question.title}
                            </QuestionTitle>
                            <QuestionMeta>
                                <span><FaCode /> {question.category}</span>
                                <span><FaClock /> {question.timeLimit} min</span>
                                <span>{question.testCases.length} test cases</span>
                            </QuestionMeta>
                            <TagList>
                                {question.tags.map(tag => (
                                    <Tag key={tag}>{tag}</Tag>
                                ))}
                            </TagList>
                        </QuestionCard>
                    ))}
                    {filteredQuestions.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No questions found
                        </div>
                    )}
                </QuestionList>

                {selectedQuestion && (
                    <DetailPanel>
                        <DetailHeader>
                            <QuestionTitle style={{ marginBottom: '0.25rem', fontSize: '1.25rem' }}>
                                <DifficultyBadge level={selectedQuestion.difficulty}>
                                    {selectedQuestion.difficulty.toUpperCase()}
                                </DifficultyBadge>
                                {selectedQuestion.title}
                            </QuestionTitle>
                            <QuestionMeta>
                                <span><FaCode /> {selectedQuestion.category}</span>
                                <span><FaClock /> {selectedQuestion.timeLimit} min</span>
                            </QuestionMeta>
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                <Button variant="primary" onClick={handleLoadQuestion}>
                                    <FaCheck /> Load Question
                                </Button>
                                <Button>
                                    <FaEdit /> Edit
                                </Button>
                                <Button variant="danger">
                                    <FaTrash /> Delete
                                </Button>
                            </div>
                        </DetailHeader>
                        <DetailContent>
                            <h4>Description</h4>
                            <p style={{ lineHeight: 1.6, color: 'var(--text-color)' }}>
                                {selectedQuestion.description}
                            </p>

                            {selectedQuestion.hints && selectedQuestion.hints.length > 0 && (
                                <>
                                    <h4 style={{ marginTop: '1rem' }}>Hints</h4>
                                    <ul style={{ color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>
                                        {selectedQuestion.hints.map((hint, i) => (
                                            <li key={i}>{hint}</li>
                                        ))}
                                    </ul>
                                </>
                            )}

                            <h4 style={{ marginTop: '1rem' }}>Test Cases</h4>
                            <TestCaseList>
                                {selectedQuestion.testCases.map((tc, i) => (
                                    <TestCase key={i}>
                                        <div className="label">Input:</div>
                                        <pre>{tc.input}</pre>
                                        <div className="label" style={{ marginTop: '0.5rem' }}>Expected Output:</div>
                                        <pre>{tc.expectedOutput}</pre>
                                    </TestCase>
                                ))}
                            </TestCaseList>
                        </DetailContent>
                    </DetailPanel>
                )}
            </MainContent>
        </Container>
    );
};

export default QuestionBank;
