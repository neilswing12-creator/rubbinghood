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

/**
 * ============================================================
 * ROBINHOOD / DEXSCREENER CONFIGURATION
 * ============================================================
 *
 * AgentBrain automatically detects EVM contract addresses
 * inside user prompts and retrieves live Robinhood Chain
 * market data through our own VPS API.
 *
 * Browser:
 *   /api/dex/token/{contract}
 *
 * Nginx:
 *   /api/dex/ -> 127.0.0.1:8085
 *
 * VPS service:
 *   DexScreener API
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
    /0x[a-fA-F0-9]{40}/
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
    !/^0x[a-fA-F0-9]{40}$/.test(
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
  const data =
    tokenData.data || {};

  const token =
    data.token || {};

  const pair =
    data.pair || {};

  const price =
    data.price || {};

  const market =
    data.market || {};

  const volume =
    data.volume || {};

  const priceChange =
    data.priceChange || {};

  const transactions =
    data.transactions || {};

  return `

============================================================
ROBINHOOD CHAIN TOKEN DATA
============================================================

SOURCE:
${tokenData.source}

SOURCE URL:
${tokenData.url}

CHAIN:
${tokenData.chain}

CONTRACT ADDRESS:
${tokenData.address}

The contract address is the primary identifier of the token.

------------------------------------------------------------
TOKEN
------------------------------------------------------------

Name:
${token.name ?? 'Unavailable'}

Symbol:
${token.symbol ?? 'Unavailable'}

Address:
${token.address ?? tokenData.address}

------------------------------------------------------------
PRICE
------------------------------------------------------------

Price USD:
${price.usd ?? 'Unavailable'}

Price in native currency:
${price.native ?? 'Unavailable'}

------------------------------------------------------------
MARKET
------------------------------------------------------------

Market Cap USD:
${market.marketCapUsd ?? 'Unavailable'}

FDV USD:
${market.fdvUsd ?? 'Unavailable'}

Liquidity USD:
${market.liquidityUsd ?? 'Unavailable'}

Liquidity Base:
${market.liquidityBase ?? 'Unavailable'}

Liquidity Quote:
${market.liquidityQuote ?? 'Unavailable'}

------------------------------------------------------------
VOLUME
------------------------------------------------------------

5 minute:
${volume.m5 ?? 'Unavailable'}

1 hour:
${volume.h1 ?? 'Unavailable'}

6 hours:
${volume.h6 ?? 'Unavailable'}

24 hours:
${volume.h24 ?? 'Unavailable'}

------------------------------------------------------------
PRICE CHANGE
------------------------------------------------------------

5 minute:
${priceChange.m5 ?? 'Unavailable'}%

1 hour:
${priceChange.h1 ?? 'Unavailable'}%

6 hours:
${priceChange.h6 ?? 'Unavailable'}%

24 hours:
${priceChange.h24 ?? 'Unavailable'}%

------------------------------------------------------------
TRANSACTIONS
------------------------------------------------------------

5 minute:
${JSON.stringify(
  transactions.m5 ?? {},
  null,
  2
)}

1 hour:
${JSON.stringify(
  transactions.h1 ?? {},
  null,
  2
)}

6 hours:
${JSON.stringify(
  transactions.h6 ?? {},
  null,
  2
)}

24 hours:
${JSON.stringify(
  transactions.h24 ?? {},
  null,
  2
)}

------------------------------------------------------------
PAIR
------------------------------------------------------------

Pair Address:
${pair.address ?? 'Unavailable'}

DEX:
${pair.dex ?? 'Unavailable'}

Labels:
${JSON.stringify(
  pair.labels ?? [],
  null,
  2
)}

Pair URL:
${pair.url ?? 'Unavailable'}

Pair Created At:
${data.pairCreatedAt ?? 'Unavailable'}

Quote Token:
${JSON.stringify(
  data.quoteToken ?? {},
  null,
  2
)}

------------------------------------------------------------
ALL ROBINHOOD PAIRS
------------------------------------------------------------

${JSON.stringify(
  data.allRobinhoodPairs ?? [],
  null,
  2
)}

============================================================
RAW DEXSCREENER DATA
============================================================

${JSON.stringify(
  data,
  null,
  2
)}

============================================================
TOKEN ANALYSIS RULES
============================================================

STRICT SOURCE-OF-TRUTH POLICY

The market data in this context was retrieved from DexScreener
through the RobOnHood VPS API. Use ONLY the fields actually
present in this retrieved data as factual market information.

SUPPORTED FACTUAL METRICS FROM THIS DATA:

- Token name
- Token symbol
- Contract address
- Price USD
- Native-token price
- Market cap
- FDV
- Liquidity USD
- Liquidity base amount
- Liquidity quote amount
- 5m / 1h / 6h / 24h volume
- 5m / 1h / 6h / 24h price change
- 5m / 1h / 6h / 24h transaction buy/sell counts
- Pair address
- DEX
- Pair labels
- Pair URL
- Pair creation timestamp
- Quote-token information
- The returned list of Robinhood pairs

UNSUPPORTED METRICS:

The current DexScreener token response does NOT provide reliable
data for the following. NEVER claim these as facts unless another
explicitly supplied source in the conversation provides them:

- Holder count
- Holder distribution
- Top-holder percentage
- Wallet concentration
- Developer holdings
- Insider holdings
- Developer/insider transfers
- Wallet transaction history
- Liquidity-lock status
- Liquidity-lock provider
- Liquidity unlock date
- Contract ownership status
- Contract renouncement status
- Contract permissions/security status
- Honeypot status
- Buy tax
- Sell tax
- Transfer tax
- Slippage for a specific trade size
- Exact price impact for a specific trade
- Audit status
- Scam/rug-pull classification
- Social/community sentiment
- Team identity or reputation

ABSOLUTE RULES:

1. Never invent, estimate, or hallucinate a missing metric.

2. Never present a metric as retrieved data if it is not present
   in the supplied DexScreener context.

3. If the user asks for an unsupported metric, explicitly say:
   "That metric is not available in the current DexScreener data."

4. Do not silently substitute an estimate for unavailable data.

5. Do not use token names, symbols, or general crypto assumptions
   to infer holder behavior, developer activity, liquidity locks,
   security status, taxes, or wallet concentration.

6. Liquidity must use the actual Liquidity USD value supplied by
   DexScreener. Do not replace it with another number or estimate.

7. Volume must use the actual supplied volume fields.

8. Transaction counts must use the actual supplied buy/sell counts.

9. Price momentum may be interpreted from the supplied price-change
   fields, but clearly label interpretation as ANALYSIS rather than
   retrieved fact.

10. If making a calculation, show that it is a calculation based
    on retrieved values. Do not describe calculated values as
    directly retrieved values.

11. Do not call a token bullish, bearish, safe, unsafe, scam, rug,
    or low-risk/high-risk as an objective fact. If discussing risk,
    identify the observable data that may contribute to risk and
    clearly label the conclusion as analytical interpretation.

12. Do not claim that low liquidity automatically means a specific
    percentage of slippage. Slippage requires trade-size and pool
    mechanics that are not supplied here.

13. Do not claim wallet concentration, insider activity, or
    developer activity from transaction counts alone.

14. Do not claim a liquidity lock exists or does not exist merely
    because liquidity is present.

15. When reporting current market data, remind the user that it is
    a snapshot retrieved at request time and can change.

16. The contract address is the primary token identifier. Never
    substitute another token because a name or symbol is similar.

RESPONSE STRUCTURE:

When the user asks for a token analysis, prefer this structure:

- Token identification
- Current market data
- Trading activity
- Price movement
- Liquidity
- Pair/DEX information
- Data-backed observations
- Limitations / unavailable metrics

Keep factual data separate from interpretation.

============================================================
END ROBINHOOD TOKEN DATA
============================================================
`;
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
  }> {
    if (this.isThinking) {
      return {
        text: '',
        toolCalls: [],
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
           * Add the live token information to the prompt
           * before Gemini sees the request.
           */
          enrichedPrompt =
            `${prompt}\n` +
            buildTokenContext(
              tokenData
            ) +
            `\n\nIMPORTANT: Use the DexScreener context above as the sole source of live token facts. Do not introduce holder, wallet, insider, developer, liquidity-lock, tax, slippage, audit, honeypot, or contract-security claims unless those facts are explicitly present in the supplied context.`;
        } catch (error) {
          console.error(
            '[AgentBrain] DexScreener lookup failed:',
            error
          );

          /*
           * Tell Gemini the lookup failed instead of allowing
           * it to invent token information.
           */
          enrichedPrompt =
            `${prompt}\n` +
            buildTokenFailureContext(
              contractAddress,
              error
            );
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

      const systemPrompt =
        PromptBuilder.buildSystemPrompt(
          this.host.data,
          core.phase,
          core.userBrief,
          allAgents
        );

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
        text,
        toolCalls,
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