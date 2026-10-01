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

export class AgentBrain {
  private history: LLMMessage[] = [];
  public isThinking: boolean = false;

  constructor(private readonly host: BrainHost) {
    this.refreshFromStore();
  }

  public async think(
    prompt: string,
    options: ThinkOptions = {}
  ): Promise<{ text: string; toolCalls: any[] }> {
    if (this.isThinking) {
      return { text: '', toolCalls: [] };
    }

    this.isThinking = true;

    try {
      this.refreshFromStore();

      const core = useCoreStore.getState();

      /*
       * RobOnHood uses the VPS-hosted Gemini Web API.
       *
       * No Gemini API key is required in the browser.
       * All text generation goes through:
       *
       * /api/ai/v1/chat/completions
       *
       * The VPS Gemini Web API handles the actual Gemini connection.
       */
      const provider = new GeminiWebProvider();

      /*
       * Internal API model.
       *
       * This is intentionally kept separate from the UI branding.
       * The UI can display "robonhoodai".
       */
      const model = 'gemini-3.6-flash';

      const teamId =
        useTeamStore.getState().selectedAgentSetId;

      const activeTeam =
        useTeamStore
          .getState()
          .customSystems
          .find((s) => s.id === teamId) ||
        AGENTIC_SETS.find((s) => s.id === teamId);

      /*
       * RobOnHood is currently text-only.
       *
       * We intentionally do not enable image/video vision
       * or media generation here.
       */
      const hasVisionSupport = false;

      // 1. Manage Message History
      if (!options.isChat) {
        const userMsg: LLMMessage = {
          role: 'user',
          content: prompt,
          metadata: options.silent
            ? { internal: true }
            : undefined,
        };

        /*
         * Text-only mode:
         * reference images are intentionally ignored.
         */
        this.history.push(userMsg);
        this.syncToStore();
      }

      // 2. Prepare context
      let messages: LLMMessage[] =
        this.history.slice(-10);

      /*
       * Text-only RobOnHood does not attach reference images.
       */
      if (
        options.isChat &&
        hasVisionSupport &&
        core.referenceImages.length > 0
      ) {
        messages = messages.map((m, idx) => {
          if (
            idx === messages.length - 1 &&
            m.role === 'user'
          ) {
            return {
              ...m,
              images: core.referenceImages,
            };
          }

          return m;
        });
      }

      const allAgents =
        this.host.simulation.getAllAgents();

      const systemPrompt =
        PromptBuilder.buildSystemPrompt(
          this.host.data,
          core.phase,
          core.userBrief,
          allAgents
        );

      const toolDefs =
        options.tools ||
        ToolRegistry.getDefinitions(
          this.host.data.index,
          core.phase,
          this.host.data.subagents?.length || 0
        );

      // 3. Log and Execute LLM Call
      core.addRequestLog({
        agentIndex: this.host.data.index,
        agentName: this.host.data.name,
        systemInstruction: systemPrompt,
        contents: messages,
        systemTools: toolDefs,
        taskId:
          this.host.getCurrentTaskId() ||
          undefined,
      });

      const response =
        await provider.generateCompletion(
          messages,
          toolDefs,
          systemPrompt,
          model
        );

      // 4. Log Response
      core.addResponseLog({
        agentIndex: this.host.data.index,
        agentName: this.host.data.name,
        content: response.content || '',
        tool_calls: response.tool_calls,
        usage: response.usage,
        raw: response.raw,
        taskId:
          this.host.getCurrentTaskId() ||
          undefined,
      });

      // 5. Parse Tool Calls
      const text = response.content || '';

      const toolCalls =
        response.tool_calls
          ?.map((tc) => {
            try {
              return {
                name: tc.function.name,
                args: JSON.parse(
                  tc.function.arguments
                ),
              };
            } catch (e) {
              console.error(
                '[AgentBrain] Failed to parse tool arguments',
                tc.function.arguments
              );

              return null;
            }
          })
          .filter(Boolean) as any[] || [];

      // 6. Final Message Construction
      const isInternalTrigger = options.silent;

      const hasToolCallsOnly =
        !text && toolCalls.length > 0;

      const isBrief = toolCalls.some(
        (tc) => tc.name === 'set_user_brief'
      );

      const isResolution = false;

      let finalContent = text;

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
        finalContent = '...';
      }

      // UI/UX handling for chat auto-closing
      if (
        options.isChat &&
        (isBrief || isResolution)
      ) {
        setTimeout(() => {
          if (
            useUiStore.getState().isChatting
          ) {
            useUiStore
              .getState()
              .setChatting(false);
          }

          useUiStore
            .getState()
            .setSelectedNpc(null);
        }, 3000);
      }

      const isInternalMessage =
        isInternalTrigger ||
        (hasToolCallsOnly && isInternalTrigger);

      this.history.push({
        role: 'assistant',
        content: finalContent,
        tool_calls: response.tool_calls,
        metadata: isInternalMessage
          ? { internal: true }
          : undefined,
      });

      this.syncToStore();

      // 7. Process Actions (Tools)
      for (const tc of toolCalls) {
        const handled = ToolRegistry.process(
          this.host as any,
          tc
        );

        /*
         * RobOnHood is text-only.
         *
         * deliver_project no longer triggers image,
         * music, or video generation.
         *
         * Instead, it produces the final text output.
         */
        if (
          tc.name === 'deliver_project' &&
          handled
        ) {
          await this.handleFinalAssetGeneration(
            tc.args.output
          );
        }
      }

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
       * RobOnHood uses the VPS Gemini Web API and
       * does not require a browser-side API key.
       */
      useCoreStore.getState().addLogEntry({
        agentIndex: this.host.data.index,
        action: `AI error: ${errMsg}`,
        taskId:
          this.host.getCurrentTaskId() ||
          undefined,
      });

      throw error;
    } finally {
      this.isThinking = false;
      this.host.simulation.processScheduledTasks();
    }
  }

  /** Autonomous Intent: Start the project strategy. */
  public async spark() {
    return this.think(
      'Start the project by proposing initial tasks.',
      { silent: true }
    );
  }

  /** Autonomous Intent: Work on a specific task. */
  public async executeTask(taskId: string) {
    return this.think(
      `Proceed with task: ${taskId}`,
      { silent: true }
    );
  }

  /** Autonomous Intent: Finalize and deliver the project results. */
  public async concludeProject() {
    return this.think(
      'All tasks are complete! Use the deliver_project tool to fulfill the final delivery with the project result.',
      { silent: true }
    );
  }

  /*
   * RobOnHood text-only final delivery.
   *
   * This replaces the old image/music/video generation
   * pipeline completely.
   */
  private async handleFinalAssetGeneration(
    prompt: string
  ) {
    const core = useCoreStore.getState();

    const teamId =
      useTeamStore.getState().selectedAgentSetId;

    const activeTeam =
      useTeamStore
        .getState()
        .customSystems
        .find((s) => s.id === teamId) ||
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
      activeTeam.outputAutoApprove === false
    ) {
      core.setPendingOutputPrompt(prompt);

      core.setPendingOutputParams({
        model: 'gemini-3.6-flash',
        outputType: 'text',
      });

      core.setReviewingOutput(true);

      return;
    }

    /*
     * Automatic text delivery.
     */
    await this.processFinalAsset(
      prompt,
      {
        model: 'gemini-3.6-flash',
        outputType: 'text',
      }
    );
  }

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
    const core = useCoreStore.getState();

    core.setIsGeneratingAsset(true);
    core.setReviewingOutput(false);

    try {
      const finalText =
        typeof prompt === 'string'
          ? prompt
          : String(prompt ?? '');

      core.addLogEntry({
        agentIndex: -1,
        action: 'Preparing final text output...',
        taskId: undefined,
      });

      /*
       * Final output is simply the text returned by
       * the agent/tool workflow.
       */
      core.setFinalOutput(finalText);

      core.addResponseLog({
        agentIndex: -1,
        agentName: 'RobOnHood AI',
        content: finalText,
        usage: undefined,
        raw: {
          model: 'gemini-3.6-flash',
          outputType: 'text',
        },
        taskId: undefined,
      });

      core.setPhase('done');
      core.setFinalOutputOpen(true);
      core.setIsGeneratingAsset(false);
    } catch (error) {
      console.error(
        '[AgentBrain] Final text generation failed:',
        error
      );

      core.setIsGeneratingAsset(false);

      const errMsg =
        error instanceof Error
          ? error.message
          : String(error);

      /*
       * Do NOT open BYOK.
       */
      core.addLogEntry({
        agentIndex: -1,
        action: `Error generating final text: ${errMsg}`,
        taskId: undefined,
      });

      throw error;
    }
  }

  public appendHistory(
    message: LLMMessage
  ) {
    this.refreshFromStore();

    this.history.push(message);

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
      this.history = [...history];
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