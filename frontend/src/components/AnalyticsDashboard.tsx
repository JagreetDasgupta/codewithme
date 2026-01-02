import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaChartLine, FaUsers, FaClock, FaCheckCircle, FaTimes, FaDownload, FaFilter } from 'react-icons/fa';

const DashboardContainer = styled.div`
  padding: 1.5rem;
  background: var(--background-color);
  min-height: 100vh;
`;

const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  color: var(--text-color);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;

  &:hover {
    background: var(--surface-hover);
  }
`;

const DateRangeSelector = styled.select`
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  color: var(--text-color);
  border-radius: 6px;
  font-size: 0.875rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatCard = styled.div<{ trend?: 'up' | 'down' | 'neutral' }>`
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.span`
  font-size: 0.875rem;
  color: var(--text-muted);
`;

const StatIcon = styled.div<{ color?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.color || 'var(--primary-color)'}20;
  color: ${props => props.color || 'var(--primary-color)'};
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-color);
`;

const StatTrend = styled.span<{ trend: 'up' | 'down' | 'neutral' }>`
  font-size: 0.75rem;
  color: ${props =>
        props.trend === 'up' ? '#28a745' :
            props.trend === 'down' ? '#dc3545' : 'var(--text-muted)'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ChartTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
`;

const ChartPlaceholder = styled.div`
  height: 250px;
  background: linear-gradient(135deg, #1e1e1e, #2d2d2d);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 0.875rem;
`;

const SimpleBarChart = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 250px;
  justify-content: center;
`;

const BarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const BarLabel = styled.span`
  width: 80px;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: right;
`;

const BarContainer = styled.div`
  flex: 1;
  height: 24px;
  background: var(--surface-elevated);
  border-radius: 4px;
  overflow: hidden;
`;

const Bar = styled.div<{ width: number; color: string }>`
  height: 100%;
  width: ${props => props.width}%;
  background: ${props => props.color};
  transition: width 0.5s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  font-size: 0.75rem;
  color: white;
  font-weight: 600;
`;

const PieChartContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const SimplePieChart = styled.div`
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: conic-gradient(
    #28a745 0deg 120deg,
    #ffc107 120deg 200deg,
    #dc3545 200deg 360deg
  );
  position: relative;
`;

const PieCenter = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: var(--surface-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const PieLegend = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8rem;
`;

const LegendDot = styled.div<{ color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.color};
`;

const TableCard = styled.div`
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const Th = styled.th`
  padding: 0.75rem;
  text-align: left;
  background: var(--surface-elevated);
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-color);
`;

const Td = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
`;

const StatusBadge = styled.span<{ status: 'passed' | 'failed' | 'pending' }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props =>
        props.status === 'passed' ? '#28a74520' :
            props.status === 'failed' ? '#dc354520' : '#ffc10720'};
  color: ${props =>
        props.status === 'passed' ? '#28a745' :
            props.status === 'failed' ? '#dc3545' : '#ffc107'};
`;

interface Analytics {
    totalInterviews: number;
    totalCandidates: number;
    avgDuration: number;
    passRate: number;
    trends: {
        interviews: number;
        candidates: number;
        duration: number;
        passRate: number;
    };
    languageDistribution: Array<{ language: string; count: number }>;
    difficultyDistribution: { easy: number; medium: number; hard: number };
    recentSessions: Array<{
        id: string;
        candidate: string;
        date: string;
        duration: number;
        score: number;
        status: 'passed' | 'failed' | 'pending';
    }>;
}

interface AnalyticsDashboardProps {
    companyId?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ companyId }) => {
    const [dateRange, setDateRange] = useState('30d');
    const [analytics, setAnalytics] = useState<Analytics>({
        totalInterviews: 156,
        totalCandidates: 89,
        avgDuration: 47,
        passRate: 68,
        trends: {
            interviews: 12,
            candidates: 8,
            duration: -3,
            passRate: 5
        },
        languageDistribution: [
            { language: 'JavaScript', count: 45 },
            { language: 'Python', count: 38 },
            { language: 'Java', count: 28 },
            { language: 'C++', count: 15 },
            { language: 'Go', count: 12 }
        ],
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
        recentSessions: [
            { id: '1', candidate: 'Alice Smith', date: '2024-01-15', duration: 52, score: 85, status: 'passed' },
            { id: '2', candidate: 'Bob Jones', date: '2024-01-14', duration: 45, score: 62, status: 'passed' },
            { id: '3', candidate: 'Carol White', date: '2024-01-14', duration: 38, score: 48, status: 'failed' },
            { id: '4', candidate: 'David Brown', date: '2024-01-13', duration: 60, score: 0, status: 'pending' },
            { id: '5', candidate: 'Eve Davis', date: '2024-01-12', duration: 55, score: 92, status: 'passed' },
        ]
    });

    const handleExport = () => {
        const data = JSON.stringify(analytics, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${dateRange}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const maxLangCount = Math.max(...analytics.languageDistribution.map(l => l.count));
    const langColors = ['#3178C6', '#3776AB', '#007396', '#00599C', '#00ADD8'];

    return (
        <DashboardContainer>
            <DashboardHeader>
                <Title>
                    <FaChartLine /> Analytics Dashboard
                </Title>
                <HeaderActions>
                    <DateRangeSelector value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="1y">Last year</option>
                    </DateRangeSelector>
                    <ActionButton>
                        <FaFilter /> Filter
                    </ActionButton>
                    <ActionButton onClick={handleExport}>
                        <FaDownload /> Export
                    </ActionButton>
                </HeaderActions>
            </DashboardHeader>

            <StatsGrid>
                <StatCard>
                    <StatHeader>
                        <StatLabel>Total Interviews</StatLabel>
                        <StatIcon color="#6366f1"><FaChartLine /></StatIcon>
                    </StatHeader>
                    <StatValue>{analytics.totalInterviews}</StatValue>
                    <StatTrend trend={analytics.trends.interviews > 0 ? 'up' : 'down'}>
                        {analytics.trends.interviews > 0 ? '↑' : '↓'} {Math.abs(analytics.trends.interviews)}% vs last period
                    </StatTrend>
                </StatCard>

                <StatCard>
                    <StatHeader>
                        <StatLabel>Total Candidates</StatLabel>
                        <StatIcon color="#10b981"><FaUsers /></StatIcon>
                    </StatHeader>
                    <StatValue>{analytics.totalCandidates}</StatValue>
                    <StatTrend trend={analytics.trends.candidates > 0 ? 'up' : 'down'}>
                        {analytics.trends.candidates > 0 ? '↑' : '↓'} {Math.abs(analytics.trends.candidates)}% vs last period
                    </StatTrend>
                </StatCard>

                <StatCard>
                    <StatHeader>
                        <StatLabel>Avg Duration</StatLabel>
                        <StatIcon color="#f59e0b"><FaClock /></StatIcon>
                    </StatHeader>
                    <StatValue>{analytics.avgDuration} min</StatValue>
                    <StatTrend trend={analytics.trends.duration > 0 ? 'up' : 'down'}>
                        {analytics.trends.duration > 0 ? '↑' : '↓'} {Math.abs(analytics.trends.duration)} min vs last period
                    </StatTrend>
                </StatCard>

                <StatCard>
                    <StatHeader>
                        <StatLabel>Pass Rate</StatLabel>
                        <StatIcon color="#22c55e"><FaCheckCircle /></StatIcon>
                    </StatHeader>
                    <StatValue>{analytics.passRate}%</StatValue>
                    <StatTrend trend={analytics.trends.passRate > 0 ? 'up' : 'down'}>
                        {analytics.trends.passRate > 0 ? '↑' : '↓'} {Math.abs(analytics.trends.passRate)}% vs last period
                    </StatTrend>
                </StatCard>
            </StatsGrid>

            <ChartsGrid>
                <ChartCard>
                    <ChartHeader>
                        <ChartTitle>Language Distribution</ChartTitle>
                    </ChartHeader>
                    <SimpleBarChart>
                        {analytics.languageDistribution.map((lang, i) => (
                            <BarRow key={lang.language}>
                                <BarLabel>{lang.language}</BarLabel>
                                <BarContainer>
                                    <Bar
                                        width={(lang.count / maxLangCount) * 100}
                                        color={langColors[i % langColors.length]}
                                    >
                                        {lang.count}
                                    </Bar>
                                </BarContainer>
                            </BarRow>
                        ))}
                    </SimpleBarChart>
                </ChartCard>

                <ChartCard>
                    <ChartHeader>
                        <ChartTitle>Difficulty Distribution</ChartTitle>
                    </ChartHeader>
                    <PieChartContainer>
                        <SimplePieChart>
                            <PieCenter>
                                <div style={{ fontWeight: 700, fontSize: '1.5rem' }}>156</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total</div>
                            </PieCenter>
                        </SimplePieChart>
                        <PieLegend>
                            <LegendItem>
                                <LegendDot color="#28a745" />
                                Easy ({analytics.difficultyDistribution.easy}%)
                            </LegendItem>
                            <LegendItem>
                                <LegendDot color="#ffc107" />
                                Medium ({analytics.difficultyDistribution.medium}%)
                            </LegendItem>
                            <LegendItem>
                                <LegendDot color="#dc3545" />
                                Hard ({analytics.difficultyDistribution.hard}%)
                            </LegendItem>
                        </PieLegend>
                    </PieChartContainer>
                </ChartCard>
            </ChartsGrid>

            <TableCard>
                <ChartHeader style={{ padding: '1rem' }}>
                    <ChartTitle>Recent Sessions</ChartTitle>
                </ChartHeader>
                <Table>
                    <thead>
                        <tr>
                            <Th>Candidate</Th>
                            <Th>Date</Th>
                            <Th>Duration</Th>
                            <Th>Score</Th>
                            <Th>Status</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {analytics.recentSessions.map(session => (
                            <tr key={session.id}>
                                <Td>{session.candidate}</Td>
                                <Td>{session.date}</Td>
                                <Td>{session.duration} min</Td>
                                <Td>{session.status === 'pending' ? '-' : `${session.score}%`}</Td>
                                <Td>
                                    <StatusBadge status={session.status}>
                                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                    </StatusBadge>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </TableCard>
        </DashboardContainer>
    );
};

export default AnalyticsDashboard;
