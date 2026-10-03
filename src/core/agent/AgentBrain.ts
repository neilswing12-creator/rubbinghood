import { LLMMessage } from '../llm/types';
import { GeminiWebProvider } from '../llm/providers/GeminiWebProvider';
import { useUiStore } from '../../integration/store/uiStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { useTeamStore } from '../../integration/store/teamStore';
import { ToolRegistry } from './ToolRegistry';
import { PromptBuilder } from './PromptBuilder';
import { AGENTIC_SETS, AgentNode } from '../../data/agents';

export interface BrainHost {
  data: AgentNode;
  simulation: {
    getAllAgents: () => any[];
    processScheduledTasks: () => void;
  };
  getCurrentTaskId: () => string | null;
}

export interface ThinkOptions {
  isChat?: boolean;
  tools?: any[];
  silent?: boolean;
}

export interface TradeIntent {
  chainId: 4663;
  tokenAddress: `0x${string}`;
  symbol: string;
  name?: string;
  pairAddress?: `0x${string}`;
  priceUsd?: string;
  liquidityUsd?: number;
}
/**
 * ============================================================
 * ROBINHOOD / DEXSCREENER CONFIGURATION
 * ============================================================
 *
 * AgentBrain automatically detects EVM contract addresses
 * inside user prompts and retrieves live Robinhood Chain
 * market data through our own VPS API.
 */

const ROBINHOOD_CHAIN = 'ROBINHOOD';

const DEXSCREENER_PROXY_PATH = '/api/dex/token/';

/**
 * Detect an EVM contract address inside any text.
 *
 * Example:
 *
 * Analyze this token:
 * 0x015ffe3fdcef91fb3a5743422bc1b5c23aa5a777
 *
 * Returns:
 *
 * 0x015ffe3fdcef91fb3a5743422bc1b5c23aa5a777
 */
function extractContractAddress(
  text: string
): string | null {
  if (!text) {
    return null;
  }

  const match = text.match(
    /0x[a-fA-F0-9]{40,64}/
  );

  return match?.[0] || null;
}

/**
 * ============================================================
 * DEXSCREENER TOKEN RETRIEVAL
 * ============================================================
 *
 * Fetch live token data through the RobOnHood VPS proxy.
 *
 * IMPORTANT:
 *
 * The frontend never talks directly to DexScreener.
 *
 * Instead:
 *
 * Browser
 *   ↓
 * /api/dex/token/{address}
 *   ↓
 * Nginx
 *   ↓
 * 127.0.0.1:8085
 *   ↓
 * DexScreener
 */
async function fetchDexScreenerToken(
  address: string
): Promise<{
  address: string;
  chain: string;
  source: string;
  url: string;
  data: any;
}> {
  const normalizedAddress =
    address.trim();

  if (
    !/^0x[a-fA-F0-9]{40,64}$/.test(
      normalizedAddress
    )
  ) {
    throw new Error(
      `Invalid EVM contract address: ${normalizedAddress}`
    );
  }

  const endpoint =
    `${DEXSCREENER_PROXY_PATH}` +
    `${encodeURIComponent(normalizedAddress)}`;

  console.log(
    `[AgentBrain] Fetching DexScreener data: ${endpoint}`
  );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, 15000);

  try {
    const response = await fetch(
      endpoint,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      let errorDetails = '';

      try {
        const errorBody =
          await response.text();

        if (errorBody) {
          errorDetails =
            ` - ${errorBody.slice(0, 500)}`;
        }
      } catch {
        // Ignore response parsing errors.
      }

      throw new Error(
        `DexScreener request failed: ` +
        `${response.status} ${response.statusText}` +
        errorDetails
      );
    }

    const data =
      await response.json();

    return {
      address: normalizedAddress,
      chain: ROBINHOOD_CHAIN,
      source: 'DexScreener',
      url:
        data?.pair?.url ||
        `https://dexscreener.com/robinhood/${normalizedAddress}`,
      data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * ============================================================
 * TOKEN CONTEXT
 * ============================================================
 *
 * Creates explicit context for Gemini.
 *
 * The model is instructed to treat retrieved values as facts
 * and never fabricate unavailable market statistics.
 */
function buildTokenContext(
  tokenData: {
    address: string;
    chain: string;
    source: string;
    url: string;
    data: any;
  }
): string {
  const data = tokenData.data || {};

  const token = data.token || {};
  const pair = data.pair || {};
  const price = data.price || {};
  const market = data.market || {};
  const volume = data.volume || {};
  const priceChange = data.priceChange || {};
  const transactions = data.transactions || {};

  const inputAddress =
    data.inputAddress ||
    tokenData.address;

  const inputType =
    data.inputType ||
    'token';

  const tokenContract =
    token.address ||
    (inputType === 'token'
      ? inputAddress
      : null);

  const pairAddress =
    pair.address ||
    (inputType === 'pair'
      ? inputAddress
      : null);

  const dex =
    pair.dex || 'Unavailable';

  const quoteToken =
    data.quoteToken || {};

  return `

============================================================
ROB ON HOOD — VERIFIED DEXSCREENER SNAPSHOT
============================================================

SOURCE:
${tokenData.source}

CHAIN:
${tokenData.chain}

INPUT ADDRESS:
${inputAddress}

INPUT TYPE:
${inputType}

IMPORTANT:
If INPUT TYPE is "pair", the INPUT ADDRESS is the DEX PAIR
ADDRESS. It is NOT the token contract address.

------------------------------------------------------------
TOKEN IDENTITY
------------------------------------------------------------

Token Name:
${token.name ?? 'Unavailable'}

Token Symbol:
${token.symbol ?? 'Unavailable'}

TOKEN CONTRACT ADDRESS:
${tokenContract ?? 'Not available from the current DexScreener data.'}

PAIR ADDRESS:
${pairAddress ?? 'Not available from the current DexScreener data.'}

DEX:
${dex}

Pair Labels:
${JSON.stringify(pair.labels ?? [], null, 2)}

Pair URL:
${pair.url ?? tokenData.url ?? 'Unavailable'}

Pair Created At:
${data.pairCreatedAt ?? 'Unavailable'}

Quote Token:
${JSON.stringify(quoteToken, null, 2)}

------------------------------------------------------------
VERIFIED CURRENT MARKET DATA
------------------------------------------------------------

Price USD:
${price.usd ?? 'Not available from the current DexScreener data.'}

Native Price:
${price.native ?? 'Not available from the current DexScreener data.'}

Market Cap USD:
${market.marketCapUsd ?? 'Not available from the current DexScreener data.'}

FDV USD:
${market.fdvUsd ?? 'Not available from the current DexScreener data.'}

Liquidity USD:
${market.liquidityUsd ?? 'Not available from the current DexScreener data.'}

Liquidity Base:
${market.liquidityBase ?? 'Not available from the current DexScreener data.'}

Liquidity Quote:
${market.liquidityQuote ?? 'Not available from the current DexScreener data.'}

------------------------------------------------------------
VERIFIED VOLUME
------------------------------------------------------------

5m:
${volume.m5 ?? 'Not available from the current DexScreener data.'}

1h:
${volume.h1 ?? 'Not available from the current DexScreener data.'}

6h:
${volume.h6 ?? 'Not available from the current DexScreener data.'}

24h:
${volume.h24 ?? 'Not available from the current DexScreener data.'}

------------------------------------------------------------
VERIFIED PRICE CHANGE
------------------------------------------------------------

5m:
${priceChange.m5 ?? 'Not available from the current DexScreener data.'}%

1h:
${priceChange.h1 ?? 'Not available from the current DexScreener data.'}%

6h:
${priceChange.h6 ?? 'Not available from the current DexScreener data.'}%

24h:
${priceChange.h24 ?? 'Not available from the current DexScreener data.'}%

------------------------------------------------------------
VERIFIED TRANSACTIONS
------------------------------------------------------------

5m:
${JSON.stringify(transactions.m5 ?? {}, null, 2)}

1h:
${JSON.stringify(transactions.h1 ?? {}, null, 2)}

6h:
${JSON.stringify(transactions.h6 ?? {}, null, 2)}

24h:
${JSON.stringify(transactions.h24 ?? {}, null, 2)}

------------------------------------------------------------
ALL ROBINHOOD PAIRS
------------------------------------------------------------

${JSON.stringify(data.allRobinhoodPairs ?? [], null, 2)}

============================================================
RAW DEXSCREENER RESPONSE
============================================================

${JSON.stringify(data, null, 2)}

============================================================
STRICT ANALYSIS RULES
============================================================

The values above are retrieved live from DexScreener through the
RobOnHood VPS API.

These retrieved values are authoritative.

NEVER change, estimate, round into a different value, or replace
a retrieved market value with a value from memory or another token.

In particular, NEVER invent:
- price
- market cap
- FDV
- liquidity
- volume
- buys
- sells
- transaction counts
- price changes

The following are NOT supplied by this market-data endpoint unless
explicitly present above:

- holder count
- holder distribution
- top-holder percentage
- wallet concentration
- developer holdings
- insider holdings
- developer/insider transfers
- wallet transaction history
- liquidity-lock status
- liquidity-lock provider
- liquidity unlock date
- contract ownership/renouncement
- contract permissions
- honeypot status
- buy tax
- sell tax
- transfer tax
- exact slippage
- exact price impact for a trade
- audit status
- scam classification
- rug-pull probability

NEVER invent any of those metrics.

If asked for one, say:
"That metric is not available from the current DexScreener data."

PAIR VS TOKEN RULE:

INPUT TYPE = pair means the input address is the pair address.

TOKEN CONTRACT ADDRESS must come from token.address.

PAIR ADDRESS must come from pair.address.

Never label a pair address as the token contract.

ANALYSIS RULE:

Gemini should interpret the verified data but should NOT create
new numerical market facts.

If a current numerical market value is needed in the final answer,
use the exact VERIFIED CURRENT MARKET DATA above.

============================================================
END VERIFIED DEXSCREENER SNAPSHOT
============================================================
`;
}


/**
 * Build a deterministic market-data block from the API response.
 *
 * Gemini is used for interpretation. These exact values are
 * generated by AgentBrain so the model cannot silently change
 * live numbers such as FDV, liquidity, or volume.
 */
function buildVerifiedMarketBlock(tokenData: {
  address: string;
  chain: string;
  source: string;
  url: string;
  data: any;
}): string {
  const data = tokenData.data || {};
  const token = data.token || {};
  const pair = data.pair || {};
  const price = data.price || {};
  const market = data.market || {};
  const volume = data.volume || {};
  const priceChange = data.priceChange || {};
  const transactions = data.transactions || {};

  const inputAddress =
    data.inputAddress || tokenData.address;

  const inputType =
    data.inputType || 'token';

  const tokenContract =
    token.address ||
    (inputType === 'token' ? inputAddress : null);

  const pairAddress =
    pair.address ||
    (inputType === 'pair' ? inputAddress : null);

  const unavailable =
    'Not available from the current DexScreener data.';

  const format = (value: any) =>
    value === null ||
    value === undefined ||
    value === ''
      ? unavailable
      : String(value);

  const total24h =
    Number(transactions.h24?.buys || 0) +
    Number(transactions.h24?.sells || 0);

  return `VERIFIED LIVE DEXSCREENER DATA

Token: ${format(token.name)}
Symbol: ${format(token.symbol)}
Token Contract: ${format(tokenContract)}
Pair Address: ${format(pairAddress)}
DEX: ${format(pair.dex)}
Quote Token: ${format(data.quoteToken?.symbol)}

Price: ${format(price.usd)} USD
Market Cap: ${format(market.marketCapUsd)} USD
FDV: ${format(market.fdvUsd)} USD
Liquidity: ${format(market.liquidityUsd)} USD

24h Volume: ${format(volume.h24)} USD
24h Price Change: ${format(priceChange.h24)}%
24h Buys: ${format(transactions.h24?.buys)}
24h Sells: ${format(transactions.h24?.sells)}
24h Transactions: ${total24h}

5m Volume: ${format(volume.m5)} USD
1h Volume: ${format(volume.h1)} USD
6h Volume: ${format(volume.h6)} USD

5m Change: ${format(priceChange.m5)}%
1h Change: ${format(priceChange.h1)}%
6h Change: ${format(priceChange.h6)}%

DATA SOURCE: DexScreener
CHAIN: ${format(data.chain || tokenData.chain)}
INPUT TYPE: ${format(inputType)}

This section is generated directly from the retrieved API response.
It is not generated by Gemini.`;
}

/**
 * Prevent the model from presenting unsupported numerical
 * market claims as if they were verified data.
 *
 * The exact market figures are already supplied by
 * buildVerifiedMarketBlock().
 *
 * We leave the model's prose intact while removing common
 * standalone market-number patterns from its analysis.
 */
function buildTradeIntent(
  tokenData: {
    address: string;
    chain: string;
    source: string;
    url: string;
    data: any;
  }
): TradeIntent | null {
  const data = tokenData.data || {};

  const token = data.token || {};
  const pair = data.pair || {};
  const price = data.price || {};
  const market = data.market || {};

  const inputAddress =
    data.inputAddress || tokenData.address;

  const inputType =
    data.inputType || 'token';

  const tokenContract =
    token.address ||
    (inputType === 'token'
      ? inputAddress
      : null);

  if (
    !tokenContract ||
    !/^0x[a-fA-F0-9]{40}$/.test(tokenContract)
  ) {
    return null;
  }

  return {
    chainId: 4663,

    tokenAddress:
      tokenContract as `0x${string}`,

    symbol:
      token.symbol ||
      'UNKNOWN',

    name:
      token.name ||
      undefined,

    pairAddress:
      pair.address ||
      (inputType === 'pair'
        ? inputAddress
        : undefined),

    priceUsd:
      price.usd != null
        ? String(price.usd)
        : undefined,

    liquidityUsd:
      market.liquidityUsd != null
        ? Number(market.liquidityUsd)
        : undefined,
  };
}

function sanitizeModelAnalysis(text: string): string {
  if (!text) return text;

  let result = text;

  // Remove common unsupported market-value formats if Gemini
  // nevertheless attempts to generate them in its prose.
  result = result.replace(
    /(?:USD\s*)?\$[\d,]+(?:\.\d+)?(?:\s*(?:M|K|B))?/gi,
    '[verified value shown above]'
  );

  result = result.replace(
    /\b\d+(?:\.\d+)?%\b/g,
    '[verified percentage shown above]'
  );

  return result.trim();
}

/**
 * ============================================================
 * TOKEN FAILURE CONTEXT
 * ============================================================
 *
 * If DexScreener cannot retrieve the token, tell Gemini
 * exactly what happened instead of allowing it to invent
 * market data.
 */
function buildTokenFailureContext(
  address: string,
  error: unknown
): string {
  const errorMessage =
    error instanceof Error
      ? error.message
      : String(error);

  return `

============================================================
ROBINHOOD TOKEN DATA RETRIEVAL
============================================================

A Robinhood Chain contract address was detected:

${address}

However, the automatic DexScreener lookup failed.

Technical error:
${errorMessage}

IMPORTANT:

- Do not fabricate live token statistics.
- Do not invent price, market cap, FDV, liquidity,
  volume, holders, transactions, buys, sells, or
  price changes.
- If the user's request requires live token data,
  explain that DexScreener data could not be retrieved.
- You may still answer general questions that do not
  require unavailable live data.

============================================================
END TOKEN RETRIEVAL NOTICE
============================================================
`;
}

export class AgentBrain {
  private history: LLMMessage[] = [];

  public isThinking: boolean = false;

  constructor(
    private readonly host: BrainHost
  ) {
    this.refreshFromStore();
  }

  public async think(
    prompt: string,
    options: ThinkOptions = {}
  ): Promise<{
    text: string;
    toolCalls: any[];
    tradeIntent: TradeIntent | null;
  }> {
    if (this.isThinking) {
      return {
        text: '',
        toolCalls: [],
        tradeIntent: null,
      };
    }

    this.isThinking = true;

    try {
      this.refreshFromStore();

      const core =
        useCoreStore.getState();

      /*
       * ========================================================
       * GEMINI PROVIDER
       * ========================================================
       *
       * RobOnHood uses the VPS-hosted Gemini Web API.
       *
       * No Gemini API key is required in the browser.
       *
       * All text generation goes through:
       *
       * /api/ai/v1/chat/completions
       */

      const provider =
        new GeminiWebProvider();

      /*
       * Internal API model.
       */
      const model =
        'gemini-3.6-flash';

      const teamId =
        useTeamStore
          .getState()
          .selectedAgentSetId;

      const activeTeam =
        useTeamStore
          .getState()
          .customSystems
          .find(
            (s) => s.id === teamId
          ) ||
        AGENTIC_SETS.find(
          (s) => s.id === teamId
        );

      /*
       * RobOnHood is currently text-only.
       */
      const hasVisionSupport =
        false;

      // ========================================================
      // 1. AUTOMATIC ROBINHOOD TOKEN DETECTION
      // ========================================================

      /*
       * Detect a contract address automatically.
       *
       * Example user input:
       *
       * "Analyze this token
       *  0x015ffe3fdcef91fb3a5743422bc1b5c23aa5a777"
       *
       * No special command is required.
       */

      let enrichedPrompt =
        prompt;

      // Live DexScreener context is kept separately so it can be
      // injected into BOTH the user context and the SYSTEM prompt.
      // This prevents the model from replacing live values with
      // remembered or fabricated market data.
      let liveDexScreenerContext = '';

      // Keep the exact API object used for this request so the
      // final verified-data block uses the SAME snapshot that
      // Gemini analyzed. Do not perform a second market lookup.
      let liveDexScreenerTokenData: {
        address: string;
        chain: string;
        source: string;
        url: string;
        data: any;
      } | null = null;
      let tradeIntent: TradeIntent | null = null;

      const contractAddress =
        extractContractAddress(
          prompt
        );

      if (contractAddress) {
        console.log(
          `[AgentBrain] Robinhood contract detected: ${contractAddress}`
        );

        try {
          /*
           * Retrieve live token information
           * from DexScreener through our VPS.
           */
          const tokenData =
            await fetchDexScreenerToken(
              contractAddress
            );

          console.log(
            '[AgentBrain] DexScreener token data retrieved successfully.'
          );

          /*
           * Build ONE canonical live-data context.
           *
           * The exact same context is sent to Gemini twice:
           *   1. In the user context for compatibility with the
           *      existing workflow.
           *   2. In the SYSTEM instruction as authoritative data.
           *
           * This prevents the model from replacing live values
           * with remembered, guessed, or fabricated statistics.
           */
          liveDexScreenerTokenData =
          tokenData;
        
        liveDexScreenerContext =
          buildTokenContext(
            tokenData
          );
        
          if (options.isChat && !options.silent) {
            tradeIntent =
              buildTradeIntent(
                tokenData
              );
          }

          /*
           * IMPORTANT:
           *
           * gemini-web2api-go translates OpenAI-style messages into
           * Gemini web prompts. Its "system" role must NOT be treated
           * as a security boundary for live market data.
           *
           * Therefore the application gives Gemini the verified
           * DexScreener snapshot directly in the user/enriched prompt.
           *
           * Gemini's job is ONLY to interpret this supplied snapshot.
           * AgentBrain remains the source of truth for the exact values.
           */
          enrichedPrompt =
            `${prompt}

============================================================
ROB ON HOOD — APPLICATION-VERIFIED DEXSCREENER DATA
============================================================

The following snapshot was retrieved by the RobOnHood application
from its DexScreener backend for THIS REQUEST.

This is source data supplied by the application.
Do NOT browse for another value.
Do NOT use memory.
Do NOT substitute values from another token.
Do NOT estimate or invent missing values.

YOUR ROLE:
You are an ANALYST interpreting the supplied DexScreener data.

You are NOT the market-data provider.

Do not create, modify, round, estimate, or replace current market
numbers.

Prefer qualitative interpretation such as:
- what the supplied liquidity means
- what the supplied volume means
- what the supplied buy/sell activity suggests
- what the supplied price movement suggests
- notable relationships between the supplied metrics
- limitations of the available data

Do NOT invent or claim data that is not present in the snapshot,
including holders, wallet concentration, insider/developer activity,
liquidity locks, taxes, slippage, audits, honeypot status, contract
security, ownership/renouncement, scam classification, or rug-pull
probability.

If the user asks for an exact current market number, use ONLY the
number supplied in this snapshot.

If a requested metric is absent, say:
"That metric is not available from the current DexScreener data."

The application will place a deterministic VERIFIED LIVE DATA
section before your analysis. Your response should therefore focus
on interpretation rather than recreating the market-data table.

-------------------- VERIFIED SNAPSHOT --------------------

${liveDexScreenerContext}

------------------ END VERIFIED SNAPSHOT ------------------

Now answer the user's original request using ONLY the supplied
snapshot for current token facts.
============================================================
END APPLICATION-VERIFIED DEXSCREENER DATA
============================================================`;
        } catch (error) {
          console.error(
            '[AgentBrain] DexScreener lookup failed:',
            error
          );

          /*
           * Tell Gemini the lookup failed instead of allowing
           * it to invent token information.
           */
          liveDexScreenerContext =
            buildTokenFailureContext(
              contractAddress,
              error
            );

          enrichedPrompt =
            `${prompt}\n` +
            liveDexScreenerContext;
        }
      }

      // ========================================================
      // 2. MANAGE MESSAGE HISTORY
      // ========================================================

      /*
       * Normal agent messages are stored here.
       *
       * IMPORTANT:
       *
       * We store enrichedPrompt, not the original prompt,
       * so the DexScreener data remains available in the
       * agent's conversation history.
       */

      if (!options.isChat) {
        const userMsg: LLMMessage = {
          role: 'user',
          content: enrichedPrompt,
          metadata: options.silent
            ? {
                internal: true,
              }
            : undefined,
        };

        this.history.push(
          userMsg
        );

        this.syncToStore();
      }

      // ========================================================
      // 3. PREPARE CONTEXT
      // ========================================================

      let messages: LLMMessage[] =
        this.history.slice(-10);

      /*
       * Chat mode:
       *
       * Some parts of the application may already have inserted
       * the user's latest message into history.
       *
       * If the latest history item is a user message, replace
       * that message with the enriched DexScreener version.
       *
       * Otherwise, add the enriched message.
       */

      if (options.isChat) {
        const lastIndex =
          messages.length - 1;

        if (
          contractAddress &&
          lastIndex >= 0 &&
          messages[lastIndex]?.role ===
            'user'
        ) {
          messages =
            messages.map(
              (message, index) => {
                if (
                  index === lastIndex
                ) {
                  return {
                    ...message,
                    content:
                      enrichedPrompt,
                  };
                }

                return message;
              }
            );
        } else if (
          contractAddress &&
          enrichedPrompt !== prompt
        ) {
          messages = [
            ...messages,
            {
              role: 'user',
              content:
                enrichedPrompt,
            },
          ];
        }
      }

      /*
       * Text-only RobOnHood does not attach reference images.
       *
       * Kept here so the original architecture remains intact
       * if vision support is enabled later.
       */

      if (
        options.isChat &&
        hasVisionSupport &&
        core.referenceImages
          .length > 0
      ) {
        messages =
          messages.map(
            (message, index) => {
              if (
                index ===
                  messages.length - 1 &&
                message.role ===
                  'user'
              ) {
                return {
                  ...message,
                  images:
                    core.referenceImages,
                };
              }

              return message;
            }
          );
      }

      // ========================================================
      // 4. BUILD SYSTEM PROMPT
      // ========================================================

      const allAgents =
        this.host.simulation
          .getAllAgents();

      let systemPrompt =
        PromptBuilder.buildSystemPrompt(
          this.host.data,
          core.phase,
          core.userBrief,
          allAgents
        );

      /*
       * IMPORTANT:
       *
       * Do NOT inject live DexScreener data into the system message.
       * The Gemini Web2API does not provide reliable privileged
       * system-message semantics for this use case.
       *
       * The verified snapshot is already embedded in enrichedPrompt.
       * PromptBuilder remains responsible for general application
       * behavior; AgentBrain owns the live market-data snapshot.
       */
      if (liveDexScreenerContext) {
        console.log(
          '[AgentBrain] Verified DexScreener context supplied directly to Gemini for interpretation.'
        );
      }

      // ========================================================
      // 5. GET TOOL DEFINITIONS
      // ========================================================

      const toolDefs =
        options.tools ||
        ToolRegistry.getDefinitions(
          this.host.data.index,
          core.phase,
          this.host.data
            .subagents
            ?.length || 0
        );

      // ========================================================
      // 6. LOG REQUEST
      // ========================================================

      core.addRequestLog({
        agentIndex:
          this.host.data.index,

        agentName:
          this.host.data.name,

        systemInstruction:
          systemPrompt,

        contents:
          messages,

        systemTools:
          toolDefs,

        taskId:
          this.host.getCurrentTaskId() ||
          undefined,
      });

      // ========================================================
      // 7. EXECUTE GEMINI REQUEST
      // ========================================================

      const response =
        await provider.generateCompletion(
          messages,
          toolDefs,
          systemPrompt,
          model
        );

      // ========================================================
      // 8. LOG RESPONSE
      // ========================================================

      core.addResponseLog({
        agentIndex:
          this.host.data.index,

        agentName:
          this.host.data.name,

        content:
          response.content || '',

        tool_calls:
          response.tool_calls,

        usage:
          response.usage,

        raw:
          response.raw,

        taskId:
          this.host.getCurrentTaskId() ||
          undefined,
      });

      // ========================================================
      // 9. PARSE TOOL CALLS
      // ========================================================

      const text =
        response.content || '';

      const toolCalls =
        response.tool_calls
          ?.map((tc) => {
            try {
              return {
                name:
                  tc.function.name,

                args:
                  JSON.parse(
                    tc.function
                      .arguments
                  ),
              };
            } catch (e) {
              console.error(
                '[AgentBrain] Failed to parse tool arguments',
                tc.function
                  .arguments
              );

              return null;
            }
          })
          .filter(
            Boolean
          ) as any[] || [];

      // ========================================================
      // 10. FINAL MESSAGE CONSTRUCTION
      // ========================================================

      const isInternalTrigger =
        options.silent;

      const hasToolCallsOnly =
        !text &&
        toolCalls.length > 0;

      const isBrief =
        toolCalls.some(
          (tc) =>
            tc.name ===
            'set_user_brief'
        );

      const isResolution =
        false;

      let finalContent =
        text;

      /*
       * ========================================================
       * VERIFIED MARKET DATA OUTPUT
       * ========================================================
       *
       * Gemini is allowed to interpret the data, but AgentBrain
       * owns the exact live numbers.
       *
       * This prevents the final deliverable from displaying
       * fabricated FDV/liquidity/volume/price values.
       */
      if (
        liveDexScreenerContext &&
        !liveDexScreenerContext.includes(
          'END TOKEN RETRIEVAL NOTICE'
        ) &&
        contractAddress
      ) {
        try {
          const verifiedBlock =
            liveDexScreenerTokenData
              ? buildVerifiedMarketBlock(
                  liveDexScreenerTokenData
                )
              : '';

          const analysis =
            sanitizeModelAnalysis(
              finalContent
            );

          finalContent =
            `${verifiedBlock}

${analysis}`;
        } catch (verificationError) {
          console.error(
            '[AgentBrain] Failed to build verified DexScreener output:',
            verificationError
          );

          /*
           * Keep the model output if formatting the verified
           * block fails. The original live snapshot remains
           * available in the system/user context.
           */
        }
      }

      const isMalformed =
        response.finishReason ===
        'MALFORMED_FUNCTION_CALL';

      if (isMalformed) {
        finalContent =
          'ERROR: Malformed function call. Please try again.';

        console.warn(
          `[AgentBrain:${this.host.data.name}] Malformed function call detected.`
        );
      } else if (
        hasToolCallsOnly &&
        !isInternalTrigger
      ) {
        finalContent = isBrief
          ? "Project brief set. Let's begin!"
          : 'Working on it...';
      } else if (
        !text &&
        toolCalls.length === 0 &&
        !isInternalTrigger
      ) {
        finalContent =
          '...';
      }

      // ========================================================
      // 11. UI / UX CHAT AUTO-CLOSING
      // ========================================================

      if (
        options.isChat &&
        (isBrief ||
          isResolution)
      ) {
        setTimeout(() => {
          if (
            useUiStore
              .getState()
              .isChatting
          ) {
            useUiStore
              .getState()
              .setChatting(
                false
              );
          }

          useUiStore
            .getState()
            .setSelectedNpc(
              null
            );
        }, 3000);
      }

      // ========================================================
      // 12. STORE ASSISTANT MESSAGE
      // ========================================================

      const isInternalMessage =
        isInternalTrigger ||
        (hasToolCallsOnly &&
          isInternalTrigger);

      this.history.push({
        role: 'assistant',

        content:
          finalContent,

        tool_calls:
          response.tool_calls,

        metadata:
          isInternalMessage
            ? {
                internal: true,
              }
            : tradeIntent
              ? {
                  tradeIntent,
                }
              : undefined,
      });

      this.syncToStore();

      // ========================================================
      // 13. PROCESS TOOLS
      // ========================================================

      for (const tc of toolCalls) {
        const handled =
          ToolRegistry.process(
            this.host as any,
            tc
          );

        /*
         * RobOnHood is text-only.
         *
         * deliver_project no longer triggers image,
         * music, or video generation.
         */
        if (
          tc.name ===
            'deliver_project' &&
          handled
        ) {
          await this.handleFinalAssetGeneration(
            tc.args.output
          );
        }
      }

      // ========================================================
      // 14. RETURN RESULT
      // ========================================================

      return {
        text: finalContent,
        toolCalls,
        tradeIntent,
      };
    } catch (error) {
      console.error(
        `[AgentBrain:${this.host.data.name}] Logic error:`,
        error
      );

      const errMsg =
        error instanceof Error
          ? error.message
          : String(error);

      /*
       * Do NOT open the BYOK/API-key modal.
       *
       * RobOnHood uses the VPS Gemini Web API.
       */
      useCoreStore
        .getState()
        .addLogEntry({
          agentIndex:
            this.host.data.index,

          action:
            `AI error: ${errMsg}`,

          taskId:
            this.host
              .getCurrentTaskId() ||
            undefined,
        });

      throw error;
    } finally {
      this.isThinking =
        false;

      this.host.simulation
        .processScheduledTasks();
    }
  }

  // ============================================================
  // AUTONOMOUS INTENTS
  // ============================================================

  /** Autonomous Intent: Start the project strategy. */
  public async spark() {
    return this.think(
      'Start the project by proposing initial tasks.',
      {
        silent: true,
      }
    );
  }

  /** Autonomous Intent: Work on a specific task. */
  public async executeTask(
    taskId: string
  ) {
    return this.think(
      `Proceed with task: ${taskId}`,
      {
        silent: true,
      }
    );
  }

  /** Autonomous Intent: Finalize and deliver the project results. */
  public async concludeProject() {
    return this.think(
      'All tasks are complete! Use the deliver_project tool to fulfill the final delivery with the project result.',
      {
        silent: true,
      }
    );
  }

  // ============================================================
  // FINAL TEXT DELIVERY
  // ============================================================

  /*
   * RobOnHood text-only final delivery.
   *
   * This replaces the old image/music/video generation
   * pipeline completely.
   */
  private async handleFinalAssetGeneration(
    prompt: string
  ) {
    const core =
      useCoreStore.getState();

    const teamId =
      useTeamStore
        .getState()
        .selectedAgentSetId;

    const activeTeam =
      useTeamStore
        .getState()
        .customSystems
        .find(
          (s) => s.id === teamId
        ) ||
      AGENTIC_SETS.find(
        (s) => s.id === teamId
      );

    if (!activeTeam) {
      return;
    }

    /*
     * Manual approval flow.
     *
     * Keep this functionality, but only for text output.
     */
    if (
      activeTeam.outputAutoApprove ===
      false
    ) {
      core.setPendingOutputPrompt(
        prompt
      );

      core.setPendingOutputParams({
        model:
          'gemini-3.6-flash',

        outputType:
          'text',
      });

      core.setReviewingOutput(
        true
      );

      return;
    }

    /*
     * Automatic text delivery.
     */
    await this.processFinalAsset(
      prompt,
      {
        model:
          'gemini-3.6-flash',

        outputType:
          'text',
      }
    );
  }

  // ============================================================
  // FINAL TEXT OUTPUT
  // ============================================================

  /*
   * Final text output.
   *
   * There is no GeminiProvider here.
   * There is no API key.
   * There is no image/audio/video generation.
   */
  public async processFinalAsset(
    prompt: string,
    options: any = {}
  ) {
    const core =
      useCoreStore.getState();

    core.setIsGeneratingAsset(
      true
    );

    core.setReviewingOutput(
      false
    );

    try {
      const finalText =
        typeof prompt ===
        'string'
          ? prompt
          : String(
              prompt ?? ''
            );

      core.addLogEntry({
        agentIndex: -1,

        action:
          'Preparing final text output...',

        taskId:
          undefined,
      });

      /*
       * Final output is simply the text returned by
       * the agent/tool workflow.
       */
      core.setFinalOutput(
        finalText
      );

      core.addResponseLog({
        agentIndex: -1,

        agentName:
          'RobOnHood AI',

        content:
          finalText,

        usage:
          undefined,

        raw: {
          model:
            'gemini-3.6-flash',

          outputType:
            'text',
        },

        taskId:
          undefined,
      });

      core.setPhase(
        'done'
      );

      core.setFinalOutputOpen(
        true
      );

      core.setIsGeneratingAsset(
        false
      );
    } catch (error) {
      console.error(
        '[AgentBrain] Final text generation failed:',
        error
      );

      core.setIsGeneratingAsset(
        false
      );

      const errMsg =
        error instanceof Error
          ? error.message
          : String(error);

      /*
       * Do NOT open BYOK.
       */
      core.addLogEntry({
        agentIndex: -1,

        action:
          `Error generating final text: ${errMsg}`,

        taskId:
          undefined,
      });

      throw error;
    }
  }

  // ============================================================
  // HISTORY
  // ============================================================

  public appendHistory(
    message: LLMMessage
  ) {
    this.refreshFromStore();

    this.history.push(
      message
    );

    this.syncToStore();
  }

  private refreshFromStore() {
    const history =
      useCoreStore
        .getState()
        .agentHistories[
          this.host.data.index
        ];

    if (history) {
      this.history = [
        ...history,
      ];
    }
  }

  private syncToStore() {
    useCoreStore
      .getState()
      .setAgentHistory(
        this.host.data.index,
        this.history
      );
  }
}
