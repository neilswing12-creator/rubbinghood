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
 * ROBINHOOD / BASEDBOT CONFIGURATION
 * ============================================================
 */

const ROBINHOOD_CHAIN = 'ROBINHOOD';

const BASEDBOT_PROXY_PATH = '/api/basedbot/';

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
 * Fetch token data from BasedBot through our own
 * RobOnHood API proxy.
 *
 * The browser calls:
 *
 * /api/basedbot/{contract}
 *
 * Nginx should forward that request to:
 *
 * https://api.basedbot.app/api/v1/thesis/token/ROBINHOOD/{contract}
 */
async function fetchBasedBotToken(
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
    `${BASEDBOT_PROXY_PATH}` +
    `${encodeURIComponent(normalizedAddress)}` +
    `?sort=recent&limit=10&offset=0`;

  console.log(
    `[AgentBrain] Fetching BasedBot data: ${endpoint}`
  );

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `BasedBot request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  return {
    address: normalizedAddress,
    chain: ROBINHOOD_CHAIN,
    source: 'BasedBot',
    url: `https://basedbot.app/token/robinhood/${normalizedAddress}`,
    data,
  };
}

/**
 * Create the extra context that gets attached to Gemini.
 *
 * This makes sure Gemini knows that the token information
 * came from BasedBot and must not be fabricated.
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
  return `

============================================================
ROBINHOOD CHAIN TOKEN DATA
============================================================

SOURCE:
${tokenData.source}

CHAIN:
${tokenData.chain}

CONTRACT ADDRESS:
${tokenData.address}

BASED BOT URL:
${tokenData.url}

The following data was retrieved automatically from BasedBot.

Treat this information as the factual source for the token
being analyzed.

Do NOT invent, estimate, or hallucinate token statistics.

---------------- BASEDBOT RESPONSE ----------------

${JSON.stringify(tokenData.data, null, 2)}

---------------- END BASEDBOT RESPONSE ----------------

TOKEN ANALYSIS RULES:

1. The token being analyzed is identified by the contract
   address above.

2. The token is on Robinhood Chain.

3. Use the retrieved BasedBot information whenever discussing
   the token.

4. Do not fabricate price, market cap, liquidity, volume,
   holders, transactions, buys, sells, or other statistics.

5. If a requested metric is not available in the retrieved
   BasedBot response, clearly state that it is unavailable.

6. Do not confuse this token with another token that has
   a similar name or symbol.

7. The contract address is the primary identifier.

8. When the user asks for analysis, distinguish between
   retrieved facts and your own analysis.

============================================================
END ROBINHOOD TOKEN DATA
============================================================
`;
}

/**
 * Build fallback context when BasedBot cannot be reached.
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

However, the automatic BasedBot lookup failed.

Technical error:
${errorMessage}

IMPORTANT:
- Do not fabricate live token statistics.
- Do not invent price, market cap, liquidity, volume,
  holders, transactions, buys, or sells.
- If the user's request requires live token data, explain
  that BasedBot data could not be retrieved.
- You may still answer general questions that do not require
  unavailable live data.

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
           * Retrieve live token information from BasedBot.
           */
          const tokenData =
            await fetchBasedBotToken(
              contractAddress
            );

          console.log(
            '[AgentBrain] BasedBot token data retrieved successfully.'
          );

          /*
           * Add the live token information to the prompt
           * before Gemini sees the request.
           */
          enrichedPrompt =
            `${prompt}\n` +
            buildTokenContext(
              tokenData
            );
        } catch (error) {
          console.error(
            '[AgentBrain] BasedBot lookup failed:',
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
       * so the BasedBot data remains available in the
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
       * that message with the enriched BasedBot version.
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