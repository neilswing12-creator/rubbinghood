import { USER_COLOR } from '../theme/brand';
import { DEFAULT_MODELS } from '../core/llm/constants';

export const USER_ID = 'user';
export const USER_NAME = 'User';
export const MAX_AGENTS = 5;
export { USER_COLOR };
export const DEFAULT_AGENTIC_SET_ID = 'single-agent';
export interface AgentNode {
  id: string;
  index: number;
  name: string;
  description: string;
  color: string;
  model: string;
  humanInTheLoop?: boolean;
  position?: { x: number; y: number };
  subagents?: AgentNode[];
}

export type OutputType = 'text' | 'image' | 'music' | 'video';
export interface AgenticSystem {
  id: string;
  teamName: string;
  teamType: string;
  teamDescription: string;
  color: string;
  outputType: OutputType;
  outputModel: string;
  outputAutoApprove?: boolean;
  user: {
    index: number;
    model: string;
    position?: { x: number; y: number };
  };
  leadAgent: AgentNode;
}

export const AGENTIC_SETS: AgenticSystem[] = [
  {
    id: 'RobOnHood',
    teamName: 'robonhood',
    teamType: 'Trader',
    teamDescription: 'A full-service ai trader that gives insight and markets data that can make trade confidence.',
    color: '#4285F4',
    outputType: 'text',
    outputModel: DEFAULT_MODELS.text,
    outputAutoApprove: true,
    user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
leadAgent: {
  id: 'trading-orchestrator',
  index: 1,
  name: 'Trading Director',
  description: 'Orchestrates AI trading agents to analyze markets, on-chain activity, risk, and opportunities across Robinhood Chain.',
  color: '#4285F4',
  model: DEFAULT_MODELS.text,
  humanInTheLoop: true,
  position: { x: 0, y: 130 },
  subagents: [
    {
      id: 'market-analyst',
      index: 2,
      name: 'Market Analyst',
      description: 'Analyzes price action, trends, volume, momentum, and market structure to identify potential trading opportunities.',
      color: '#34A853',
      model: DEFAULT_MODELS.text,
      position: { x: -300, y: 280 }
    },
    {
      id: 'onchain-analyst',
      index: 3,
      name: 'On-Chain Analyst',
      description: 'Monitors Robinhood Chain activity, wallet flows, liquidity, transactions, and token movements to uncover on-chain signals.',
      color: '#FBBC05',
      model: DEFAULT_MODELS.text,
      position: { x: 0, y: 280 }
    },
    {
      id: 'risk-manager',
      index: 4,
      name: 'Risk Manager',
      description: 'Evaluates volatility, liquidity, downside risk, and position exposure to help traders manage risk before entering a trade.',
      color: '#EA4335',
      model: DEFAULT_MODELS.text,
      position: { x: 300, y: 280 }
    }
  ]
}
},

{
  id: 'market-intelligence',
  teamName: 'Market Intelligence',
  teamType: 'Trading Analysis',
  teamDescription: 'Real-time market intelligence combining price action, volume, momentum, and market structure.',
  color: '#3B82F6',
  outputType: 'text',
  outputModel: DEFAULT_MODELS.text,
  outputAutoApprove: false,
  user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
  leadAgent: {
    id: 'market-director',
    index: 1,
    name: 'Market Director',
    description: 'Coordinates AI analysts to interpret market conditions and identify potential trading setups.',
    color: '#3B82F6',
    model: DEFAULT_MODELS.text,
    humanInTheLoop: true,
    position: { x: 0, y: 130 },
    subagents: [
      {
        id: 'technical-analyst',
        index: 2,
        name: 'Technical Analyst',
        description: 'Analyzes price action, trends, support, resistance, momentum, and technical indicators.',
        color: '#60A5FA',
        model: DEFAULT_MODELS.text,
        position: { x: -300, y: 280 }
      },
      {
        id: 'volume-analyst',
        index: 3,
        name: 'Volume Analyst',
        description: 'Studies volume, liquidity, order flow, and unusual market activity to identify confirmation or divergence.',
        color: '#2563EB',
        model: DEFAULT_MODELS.text,
        position: { x: 0, y: 280 }
      },
      {
        id: 'trend-analyst',
        index: 4,
        name: 'Trend Analyst',
        description: 'Detects market regimes, momentum shifts, breakouts, reversals, and emerging trends.',
        color: '#1D4ED8',
        model: DEFAULT_MODELS.text,
        position: { x: 300, y: 280 }
      }
    ]
  }
},

{
  id: 'onchain-intelligence',
  teamName: 'On-Chain Intelligence',
  teamType: 'Blockchain Analysis',
  teamDescription: 'Analyzes Robinhood Chain activity, wallets, transactions, liquidity, and token movements.',
  color: '#8B5CF6',
  outputType: 'text',
  outputModel: DEFAULT_MODELS.text,
  outputAutoApprove: false,
  user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
  leadAgent: {
    id: 'onchain-director',
    index: 1,
    name: 'On-Chain Director',
    description: 'Coordinates blockchain intelligence to identify significant on-chain activity and capital flows.',
    color: '#8B5CF6',
    model: DEFAULT_MODELS.text,
    humanInTheLoop: true,
    position: { x: 0, y: 130 },
    subagents: [
      {
        id: 'wallet-tracker',
        index: 2,
        name: 'Wallet Tracker',
        description: 'Tracks significant wallet activity, accumulation, distribution, and movement of assets.',
        color: '#A78BFA',
        model: DEFAULT_MODELS.text,
        position: { x: -300, y: 280 }
      },
      {
        id: 'liquidity-analyst',
        index: 3,
        name: 'Liquidity Analyst',
        description: 'Analyzes liquidity depth, pool activity, trading volume, and potential liquidity risks.',
        color: '#7C3AED',
        model: DEFAULT_MODELS.text,
        position: { x: 0, y: 280 }
      },
      {
        id: 'flow-analyst',
        index: 4,
        name: 'Flow Analyst',
        description: 'Monitors token transfers and capital flows to identify unusual movements and emerging activity.',
        color: '#6D28D9',
        model: DEFAULT_MODELS.text,
        position: { x: 300, y: 280 }
      }
    ]
  }
},

{
  id: 'sentiment-intelligence',
  teamName: 'Sentiment Intelligence',
  teamType: 'Market Sentiment',
  teamDescription: 'Analyzes social sentiment, market narratives, news, and community activity surrounding crypto assets.',
  color: '#EC4899',
  outputType: 'text',
  outputModel: DEFAULT_MODELS.text,
  outputAutoApprove: false,
  user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
  leadAgent: {
    id: 'sentiment-director',
    index: 1,
    name: 'Sentiment Director',
    description: 'Synthesizes social, narrative, and news signals into a unified market sentiment view.',
    color: '#EC4899',
    model: DEFAULT_MODELS.text,
    humanInTheLoop: true,
    position: { x: 0, y: 130 },
    subagents: [
      {
        id: 'social-analyst',
        index: 2,
        name: 'Social Analyst',
        description: 'Analyzes crypto community activity, discussions, engagement, and changes in market sentiment.',
        color: '#F472B6',
        model: DEFAULT_MODELS.text,
        position: { x: -300, y: 280 }
      },
      {
        id: 'narrative-analyst',
        index: 3,
        name: 'Narrative Analyst',
        description: 'Identifies emerging crypto narratives, themes, catalysts, and shifts in market attention.',
        color: '#DB2777',
        model: DEFAULT_MODELS.text,
        position: { x: 0, y: 280 }
      },
      {
        id: 'news-analyst',
        index: 4,
        name: 'News Analyst',
        description: 'Reviews relevant market news and events that may affect crypto assets and trading conditions.',
        color: '#BE185D',
        model: DEFAULT_MODELS.text,
        position: { x: 300, y: 280 }
      }
    ]
  }
},

{
  id: 'trade-strategy',
  teamName: 'Strategy Lab',
  teamType: 'Trading Strategy',
  teamDescription: 'Develops and evaluates systematic trading strategies using multiple market signals.',
  color: '#10B981',
  outputType: 'text',
  outputModel: DEFAULT_MODELS.text,
  outputAutoApprove: false,
  user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
  leadAgent: {
    id: 'strategy-director',
    index: 1,
    name: 'Strategy Director',
    description: 'Combines market intelligence into structured trading strategies and scenario analysis.',
    color: '#10B981',
    model: DEFAULT_MODELS.text,
    humanInTheLoop: true,
    position: { x: 0, y: 130 },
    subagents: [
      {
        id: 'scalping-strategist',
        index: 2,
        name: 'Scalping Strategist',
        description: 'Looks for short-term opportunities based on momentum, volatility, liquidity, and price action.',
        color: '#34D399',
        model: DEFAULT_MODELS.text,
        position: { x: -450, y: 280 }
      },
      {
        id: 'swing-strategist',
        index: 3,
        name: 'Swing Strategist',
        description: 'Identifies multi-session opportunities using trends, structure, momentum, and catalysts.',
        color: '#2DD4BF',
        model: DEFAULT_MODELS.text,
        position: { x: -150, y: 280 }
      },
      {
        id: 'breakout-strategist',
        index: 4,
        name: 'Breakout Strategist',
        description: 'Detects potential breakouts, consolidation ranges, momentum expansions, and failed breakouts.',
        color: '#14B8A6',
        model: DEFAULT_MODELS.text,
        position: { x: 150, y: 280 }
      },
      {
        id: 'strategy-validator',
        index: 5,
        name: 'Strategy Validator',
        description: 'Challenges proposed setups and checks whether multiple signals support the trading thesis.',
        color: '#059669',
        model: DEFAULT_MODELS.text,
        position: { x: 450, y: 280 }
      }
    ]
  }
},

{
  id: 'risk-management',
  teamName: 'Risk Command',
  teamType: 'Risk Management',
  teamDescription: 'Evaluates downside exposure, volatility, liquidity, and position sizing before a trade.',
  color: '#EF4444',
  outputType: 'text',
  outputModel: DEFAULT_MODELS.text,
  outputAutoApprove: false,
  user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
  leadAgent: {
    id: 'risk-director',
    index: 1,
    name: 'Risk Director',
    description: 'Reviews proposed trades and evaluates risk before execution.',
    color: '#EF4444',
    model: DEFAULT_MODELS.text,
    humanInTheLoop: true,
    position: { x: 0, y: 130 },
    subagents: [
      {
        id: 'volatility-analyst',
        index: 2,
        name: 'Volatility Analyst',
        description: 'Measures volatility and identifies conditions that may increase trading risk.',
        color: '#F87171',
        model: DEFAULT_MODELS.text,
        position: { x: -300, y: 280 }
      },
      {
        id: 'position-manager',
        index: 3,
        name: 'Position Manager',
        description: 'Evaluates position size, exposure, stop levels, and portfolio concentration.',
        color: '#DC2626',
        model: DEFAULT_MODELS.text,
        position: { x: 0, y: 280 }
      },
      {
        id: 'risk-auditor',
        index: 4,
        name: 'Risk Auditor',
        description: 'Stress-tests trading ideas and identifies weaknesses, invalidation points, and downside scenarios.',
        color: '#B91C1C',
        model: DEFAULT_MODELS.text,
        position: { x: 300, y: 280 }
      }
    ]
  }
},

{
  id: 'portfolio-manager',
  teamName: 'Portfolio Command',
  teamType: 'Portfolio Management',
  teamDescription: 'Monitors portfolio allocation, performance, exposure, and diversification across assets.',
  color: '#F59E0B',
  outputType: 'text',
  outputModel: DEFAULT_MODELS.text,
  outputAutoApprove: false,
  user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
  leadAgent: {
    id: 'portfolio-director',
    index: 1,
    name: 'Portfolio Director',
    description: 'Coordinates portfolio intelligence and helps evaluate allocation and exposure.',
    color: '#F59E0B',
    model: DEFAULT_MODELS.text,
    humanInTheLoop: true,
    position: { x: 0, y: 130 },
    subagents: [
      {
        id: 'allocation-analyst',
        index: 2,
        name: 'Allocation Analyst',
        description: 'Analyzes portfolio allocation and concentration across assets and strategies.',
        color: '#FBBF24',
        model: DEFAULT_MODELS.text,
        position: { x: -300, y: 280 }
      },
      {
        id: 'performance-analyst',
        index: 3,
        name: 'Performance Analyst',
        description: 'Tracks portfolio performance, realized results, drawdowns, and trading outcomes.',
        color: '#D97706',
        model: DEFAULT_MODELS.text,
        position: { x: 0, y: 280 }
      },
      {
        id: 'diversification-agent',
        index: 4,
        name: 'Diversification Agent',
        description: 'Identifies concentration risks and evaluates diversification across assets and strategies.',
        color: '#B45309',
        model: DEFAULT_MODELS.text,
        position: { x: 300, y: 280 }
      }
    ]
  }
},

{
  id: 'trade-execution',
  teamName: 'Execution Desk',
  teamType: 'Trade Execution',
  teamDescription: 'Transforms validated trading ideas into structured execution plans while keeping the human in control.',
  color: '#06B6D4',
  outputType: 'text',
  outputModel: DEFAULT_MODELS.text,
  outputAutoApprove: false,
  user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
  leadAgent: {
    id: 'execution-director',
    index: 1,
    name: 'Execution Director',
    description: 'Coordinates trade preparation and execution analysis after a strategy has been validated.',
    color: '#06B6D4',
    model: DEFAULT_MODELS.text,
    humanInTheLoop: true,
    position: { x: 0, y: 130 },
    subagents: [
      {
        id: 'entry-analyst',
        index: 2,
        name: 'Entry Analyst',
        description: 'Identifies potential entry zones and evaluates entry conditions for a validated setup.',
        color: '#22D3EE',
        model: DEFAULT_MODELS.text,
        position: { x: -300, y: 280 }
      },
      {
        id: 'exit-analyst',
        index: 3,
        name: 'Exit Analyst',
        description: 'Defines potential take-profit levels, invalidation points, and exit scenarios.',
        color: '#0891B2',
        model: DEFAULT_MODELS.text,
        position: { x: 0, y: 280 }
      },
      {
        id: 'execution-monitor',
        index: 4,
        name: 'Execution Monitor',
        description: 'Monitors execution conditions, slippage, liquidity, and changes after a trade is initiated.',
        color: '#0E7490',
        model: DEFAULT_MODELS.text,
        position: { x: 300, y: 280 }
      }
    ]
  }
},

{
  id: 'trading-research',
  teamName: 'Alpha Research',
  teamType: 'Research',
  teamDescription: 'Deep research team for investigating assets, protocols, token fundamentals, and market catalysts.',
  color: '#6366F1',
  outputType: 'text',
  outputModel: DEFAULT_MODELS.text,
  outputAutoApprove: true,
  user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
  leadAgent: {
    id: 'research-director',
    index: 1,
    name: 'Research Director',
    description: 'Coordinates deep research into crypto assets, protocols, catalysts, and market opportunities.',
    color: '#6366F1',
    model: DEFAULT_MODELS.text,
    humanInTheLoop: true,
    position: { x: 0, y: 130 },
    subagents: [
      {
        id: 'fundamental-analyst',
        index: 2,
        name: 'Fundamental Analyst',
        description: 'Researches token utility, protocol activity, ecosystem growth, and fundamental factors.',
        color: '#818CF8',
        model: DEFAULT_MODELS.text,
        position: { x: -300, y: 280 }
      },
      {
        id: 'catalyst-hunter',
        index: 3,
        name: 'Catalyst Hunter',
        description: 'Searches for upcoming events, launches, listings, upgrades, and other potential market catalysts.',
        color: '#4F46E5',
        model: DEFAULT_MODELS.text,
        position: { x: 0, y: 280 }
      },
      {
        id: 'token-analyst',
        index: 4,
        name: 'Token Analyst',
        description: 'Evaluates token supply, distribution, liquidity, unlocks, and other token-related factors.',
        color: '#4338CA',
        model: DEFAULT_MODELS.text,
        position: { x: 300, y: 280 }
      }
    ]
  }
},

{
  id: 'trading-command',
  teamName: 'RobOnHood Command',
  teamType: 'AI Trading Desk',
  teamDescription: 'The central AI trading intelligence team that combines signals from every specialized trading agent.',
  color: '#22C55E',
  outputType: 'text',
  outputModel: DEFAULT_MODELS.text,
  outputAutoApprove: false,
  user: { index: 0, model: 'Human', position: { x: 0, y: 0 } },
  leadAgent: {
    id: 'robonhood-orchestrator',
    index: 1,
    name: 'RobOnHood AI',
    description: 'Synthesizes market, on-chain, sentiment, strategy, and risk intelligence into a unified trading brief.',
    color: '#22C55E',
    model: DEFAULT_MODELS.text,
    humanInTheLoop: true,
    position: { x: 0, y: 130 },
    subagents: [
      {
        id: 'signal-aggregator',
        index: 2,
        name: 'Signal Aggregator',
        description: 'Combines signals from specialized AI agents and identifies areas of agreement or disagreement.',
        color: '#4ADE80',
        model: DEFAULT_MODELS.text,
        position: { x: -300, y: 280 }
      },
      {
        id: 'trade-judge',
        index: 3,
        name: 'Trade Judge',
        description: 'Challenges the trading thesis, compares conflicting signals, and identifies what could invalidate the setup.',
        color: '#16A34A',
        model: DEFAULT_MODELS.text,
        position: { x: 0, y: 280 }
      },
      {
        id: 'decision-agent',
        index: 4,
        name: 'Decision Agent',
        description: 'Produces a final structured market brief with setup, supporting signals, risks, and key levels for the human trader.',
        color: '#15803D',
        model: DEFAULT_MODELS.text,
        position: { x: 300, y: 280 }
      }
    ]
  }
}
];

export function getAgentSet(id: string, customSystems: AgenticSystem[] = []): AgenticSystem {
  return (
    customSystems.find((s) => s.id === id) ||
    AGENTIC_SETS.find((s) => s.id === id) ||
    AGENTIC_SETS[0]
  );
}

export function getAllAgents(system: AgenticSystem): AgentNode[] {
  const agents: AgentNode[] = [];
  const traverse = (node: AgentNode) => {
    agents.push(node);
    if (node.subagents) {
      node.subagents.forEach(traverse);
    }
  };
  traverse(system.leadAgent);
  return agents;
}

export function getAllCharacters(system: AgenticSystem): AgentNode[] {
  const userNode: AgentNode = {
    id: USER_ID,
    index: system.user.index,
    name: USER_NAME,
    color: USER_COLOR,
    model: system.user.model,
    description: 'Human user issuing commands.',
  };
  return [userNode, ...getAllAgents(system)];
}
