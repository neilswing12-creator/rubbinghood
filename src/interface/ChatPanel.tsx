import {
  ArrowUpRight,
  FileSearch,
  Send,
  Wallet,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { getAllAgents } from '../data/agents';
import { USER_COLOR, USER_COLOR_LIGHT, USER_COLOR_SOFT } from '../theme/brand';
import { useCoreStore } from '../integration/store/coreStore';
import { useActiveTeam } from '../integration/store/teamStore';
import { useUiStore } from '../integration/store/uiStore';
import { useSceneManager } from '../simulation/SceneContext';

import { Avatar } from './components/Avatar';

interface TradeIntent {
  chainId: number;
  tokenAddress: `0x${string}`;
  symbol: string;
  name?: string;
  pairAddress?: `0x${string}`;
  priceUsd?: string;
  liquidityUsd?: number;
}

interface TradeIntentCardProps {
  tradeIntent: TradeIntent;
}

const shortenAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatLiquidity = (value?: number) => {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

const TradeIntentCard: React.FC<TradeIntentCardProps> = ({
  tradeIntent,
}) => {
  const [open, setOpen] = useState(false);

  const isRobinhoodChain = tradeIntent.chainId === 4663;

  const liquidity = formatLiquidity(
    tradeIntent.liquidityUsd
  );

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* Trade header */}
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">
          Trade this token?
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-zinc-900">
              ${tradeIntent.symbol || 'UNKNOWN'}
            </div>

            {tradeIntent.name && (
              <div className="mt-0.5 truncate text-[10px] text-zinc-400">
                {tradeIntent.name}
              </div>
            )}
          </div>

          <div className="shrink-0 rounded-lg bg-zinc-100 px-2 py-1 font-mono text-[9px] text-zinc-500">
            {shortenAddress(tradeIntent.tokenAddress)}
          </div>
        </div>
      </div>

      {/* Market information */}
      {(tradeIntent.priceUsd || liquidity) && (
        <div className="grid grid-cols-2 gap-px border-b border-zinc-100 bg-zinc-100">
          {tradeIntent.priceUsd && (
            <div className="bg-white px-4 py-3">
              <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                Price
              </div>

              <div className="mt-1 truncate text-xs font-black text-zinc-900">
                ${tradeIntent.priceUsd}
              </div>
            </div>
          )}

          {liquidity && (
            <div className="bg-white px-4 py-3">
              <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                Liquidity
              </div>

              <div className="mt-1 truncate text-xs font-black text-zinc-900">
                {liquidity}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-black active:scale-[0.98]"
        >
          <ArrowUpRight size={13} />
          Yes, Trade
        </button>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-zinc-500 transition hover:bg-zinc-50 active:scale-[0.98]"
        >
          <X size={13} />
          No
        </button>
      </div>

      {/* Trade panel */}
      {open && (
        <div className="border-t border-zinc-100 bg-zinc-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
                <Wallet size={14} />
              </div>

              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-700">
                  Trade Panel
                </div>

                <div className="text-[9px] text-zinc-400">
                  Robinhood Chain
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white hover:text-zinc-800"
              aria-label="Close trade panel"
            >
              <X size={14} />
            </button>
          </div>

          {/* Token */}
          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
              Token
            </div>

            <div className="mt-1 font-mono text-[10px] leading-relaxed text-zinc-700 break-all">
              {tradeIntent.tokenAddress}
            </div>
          </div>

          {/* Network */}
          <div className="mt-2 flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
            <div>
              <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                Network
              </div>

              <div className="mt-1 text-xs font-bold text-zinc-800">
                Robinhood Chain
              </div>
            </div>

            <div
              className={`h-2 w-2 rounded-full ${
                isRobinhoodChain
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
            />
          </div>

          {/* Pair */}
          {tradeIntent.pairAddress && (
            <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-3">
              <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                Pair
              </div>

              <div className="mt-1 font-mono text-[9px] text-zinc-600 break-all">
                {tradeIntent.pairAddress}
              </div>
            </div>
          )}

          {/* Connect / trade button */}
          <button
            type="button"
            disabled={!isRobinhoodChain}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition ${
              isRobinhoodChain
                ? 'bg-zinc-900 hover:bg-black active:scale-[0.98]'
                : 'cursor-not-allowed bg-zinc-300'
            }`}
          >
            <Wallet size={13} />

            {isRobinhoodChain
              ? 'Connect Wallet to Trade'
              : 'Unsupported Network'}
          </button>

          <p className="mt-2 text-center text-[8px] leading-relaxed text-zinc-400">
            No transaction will be submitted yet.
          </p>
        </div>
      )}
    </div>
  );
};

const ChatPanel: React.FC = () => {
  const {
    isChatting,
    isThinking,
    selectedNpcIndex,
    setIsTyping,
    setActiveAuditTaskId,
  } = useUiStore();

  const scene = useSceneManager();

  const activeTeam = useActiveTeam();

  const agents = getAllAgents(activeTeam);

  const agent = selectedNpcIndex !== null
    ? agents.find(
        (a) => a.index === selectedNpcIndex
      ) ?? null
    : null;

  const [input, setInput] = useState('');

  const scrollRef =
    useRef<HTMLDivElement>(null);

  const typingIntervalRef =
    useRef<NodeJS.Timeout | null>(null);

  const stopTypingTimeoutRef =
    useRef<NodeJS.Timeout | null>(null);

  /*
   * Core store is the source of truth
   * for the conversation history.
   */
  const coreStore = useCoreStore();

  const chatMessages =
    selectedNpcIndex !== null
      ? (
          coreStore.agentHistories[
            selectedNpcIndex
          ] || []
        )
      : [];

  /*
   * Cleanup timers when component unmounts.
   */
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(
          typingIntervalRef.current
        );
      }

      if (stopTypingTimeoutRef.current) {
        clearTimeout(
          stopTypingTimeoutRef.current
        );
      }
    };
  }, []);

  /*
   * Keep chat scrolled to the latest message.
   */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }
  }, [
    chatMessages,
    isThinking,
    isChatting,
  ]);

  /*
   * Initial scroll when chat opens.
   */
  useEffect(() => {
    if (
      isChatting &&
      scrollRef.current
    ) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop =
            scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [isChatting]);

  /*
   * Typing simulation.
   */
  const simulateTyping = (
    text: string
  ) => {
    let currentIndex = 0;

    if (typingIntervalRef.current) {
      clearInterval(
        typingIntervalRef.current
      );
    }

    setIsTyping(true);

    typingIntervalRef.current =
      setInterval(() => {
        if (currentIndex < text.length) {
          const char =
            text[currentIndex];

          setInput(
            (prev) => prev + char
          );

          currentIndex++;
        } else {
          if (
            typingIntervalRef.current
          ) {
            clearInterval(
              typingIntervalRef.current
            );
          }

          setIsTyping(false);
        }
      }, 20);
  };

  /*
   * Paste handler.
   */
  const handlePaste = (
    e: React.ClipboardEvent
  ) => {
    e.preventDefault();

    const pastedText =
      e.clipboardData.getData('text');

    setInput(pastedText);
  };

  /*
   * Send message.
   */
  const handleSend = async () => {
    if (
      !input.trim() ||
      isThinking
    ) {
      return;
    }

    if (typingIntervalRef.current) {
      clearInterval(
        typingIntervalRef.current
      );
    }

    if (
      stopTypingTimeoutRef.current
    ) {
      clearTimeout(
        stopTypingTimeoutRef.current
      );
    }

    setIsTyping(false);

    const text = input;

    setInput('');

    await scene?.sendMessage(text);
  };

  if (
    !isChatting ||
    !agent
  ) {
    return null;
  }

  return (
    <div className="flex h-full flex-col bg-white relative overflow-hidden shrink-0 pointer-events-auto">

      {/* =========================
          MESSAGES
      ========================== */}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-1 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:display-none"
      >
        {chatMessages
          .filter(
            (msg) =>
              !msg.metadata?.internal
          )
          .map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${
                msg.role === 'user'
                  ? 'items-end'
                  : 'items-start'
              }`}
            >
              <div
                className={`flex items-start gap-4 ${
                  msg.role === 'user'
                    ? 'flex-row-reverse'
                    : 'flex-row'
                } max-w-[90%]`}
              >

                {/* =========================
                    AVATAR
                ========================== */}

                <div className="shrink-0 mt-1">
                  {msg.role ===
                  'assistant' ? (
                    <Avatar
                      type={
                        agent?.index ===
                        activeTeam.leadAgent
                          .index
                          ? 'lead'
                          : 'sub'
                      }
                      color={
                        agent?.color
                      }
                      size={32}
                    />
                  ) : (
                    <Avatar
                      type="user"
                      color={USER_COLOR}
                      size={32}
                    />
                  )}
                </div>

                {/* =========================
                    MESSAGE CONTENT
                ========================== */}

                <div
                  className={`flex flex-col ${
                    msg.role === 'user'
                      ? 'items-end'
                      : 'items-start'
                  }`}
                >
                  <div
                    className={`px-4 py-2.5 rounded-[20px] text-[14px] leading-relaxed shadow-sm border ${
                      msg.role === 'user'
                        ? 'rounded-tr-none'
                        : 'rounded-tl-none'
                    }`}
                    style={
                      msg.role === 'user'
                        ? {
                            backgroundColor:
                              USER_COLOR_LIGHT,
                            borderColor:
                              USER_COLOR_SOFT,
                            color:
                              '#27272a',
                          }
                        : {
                            backgroundColor:
                              '#fafafa',
                            borderColor:
                              '#f4f4f5',
                            color:
                              '#27272a',
                          }
                    }
                  >

                    {msg.role ===
                    'assistant' ? (
                      <div className="markdown-content">

                        {/* AI MESSAGE */}
                        <ReactMarkdown
                          remarkPlugins={[
                            remarkGfm,
                          ]}
                        >
                          {msg.content}
                        </ReactMarkdown>

                        {/* =========================
                            REVIEW TASK
                        ========================== */}

                        {msg.metadata
                          ?.reviewTaskId && (
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/50 bg-white/50 p-4 animate-in fade-in slide-in-from-bottom-2 duration-500">

                            <div className="flex items-center gap-2 pr-2">
                              <div
                                className="flex-shrink-0 rounded-xl p-2"
                                style={{
                                  backgroundColor:
                                    USER_COLOR_LIGHT,
                                  color:
                                    USER_COLOR,
                                }}
                              >
                                <FileSearch
                                  size={18}
                                />
                              </div>

                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                                {coreStore.tasks.find(
                                  (t) =>
                                    t.id ===
                                    msg
                                      .metadata
                                      .reviewTaskId
                                )?.status ===
                                'on_hold'
                                  ? 'Review Requested'
                                  : 'Review Processed'}
                              </span>
                            </div>

                            {coreStore.tasks.find(
                              (t) =>
                                t.id ===
                                msg.metadata
                                  .reviewTaskId
                            )?.status ===
                              'on_hold' && (
                              <button
                                onClick={() =>
                                  setActiveAuditTaskId(
                                    msg
                                      .metadata
                                      .reviewTaskId
                                  )
                                }
                                className="flex-1 min-w-[120px] rounded-xl bg-darkDelegation px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-black active:scale-95 whitespace-nowrap"
                              >
                                Review Task
                              </button>
                            )}
                          </div>
                        )}

                        {/* =========================
                            TRADE INTENT
                        ========================== */}

                        {msg.metadata
                          ?.tradeIntent && (
                          <TradeIntentCard
                            tradeIntent={
                              msg.metadata
                                .tradeIntent as TradeIntent
                            }
                          />
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    )}
                  </div>

                  {/* =========================
                      MESSAGE AUTHOR
                  ========================== */}

                  <div className="mt-2 flex items-center gap-2 px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      {msg.role === 'user'
                        ? 'You'
                        : (
                            agent?.name?.split(
                              ' '
                            )[0] || 'AI'
                          )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

        {/* =========================
            THINKING INDICATOR
        ========================== */}

        {isThinking && (
          <div className="flex items-start gap-3">
            <div className="mt-1 h-4 w-4 animate-pulse text-zinc-300">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" />
              </svg>
            </div>

            <div className="rounded-2xl rounded-tl-none bg-zinc-50 px-4 py-3">
              <div className="flex gap-1">
                <div
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-300"
                  style={{
                    animationDelay:
                      '0ms',
                  }}
                />

                <div
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-300"
                  style={{
                    animationDelay:
                      '150ms',
                  }}
                />

                <div
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-300"
                  style={{
                    animationDelay:
                      '300ms',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================
          INPUT
      ========================== */}

      <div className="border-t border-zinc-50 p-2">
        <div className="relative flex items-center gap-2">

          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => {
                const val =
                  e.target.value;

                setInput(val);

                if (val.length > 0) {
                  setIsTyping(true);

                  if (
                    stopTypingTimeoutRef.current
                  ) {
                    clearTimeout(
                      stopTypingTimeoutRef.current
                    );
                  }

                  stopTypingTimeoutRef.current =
                    setTimeout(
                      () =>
                        setIsTyping(false),
                      1000
                    );
                } else {
                  setIsTyping(false);
                }
              }}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message (↵ to send)"
              className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-3 py-3 pr-12 text-sm transition-all focus:outline-none focus:ring-2 [scrollbar-width:none]"
              style={{
                borderColor:
                  input.trim()
                    ? USER_COLOR
                    : undefined,
                boxShadow:
                  input.trim()
                    ? `0 0 0 2px ${USER_COLOR_LIGHT}`
                    : undefined,
              }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={
              !input.trim() ||
              isThinking
            }
            style={{
              backgroundColor:
                !input.trim() ||
                isThinking
                  ? undefined
                  : agent.color,
            }}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
              !input.trim() ||
              isThinking
                ? 'cursor-not-allowed bg-zinc-100 text-zinc-400'
                : 'text-white shadow-lg hover:brightness-90'
            }`}
          >
            <Send
              size={16}
              strokeWidth={3}
            />
          </button>
        </div>

        <p className="mt-2 text-center text-[8px] font-medium uppercase tracking-wider text-zinc-400">
          Shift + ↵ for new line
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;