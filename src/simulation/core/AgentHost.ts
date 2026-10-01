import { AgentNode } from '../../data/agents';
import { LLMMessage } from '../../core/llm/types';
import { AgentState } from '../../types';
import { useUiStore } from '../../integration/store/uiStore';
import { AgentActionContext } from '../../core/agent/ToolRegistry';
import { AgentBrain, BrainHost } from '../../core/agent/AgentBrain';

export class AgentHost implements AgentActionContext, BrainHost {
  public state: AgentState = 'idle';
  private currentTaskId: string | null = null;
  public readonly brain: AgentBrain;

  constructor(
    public readonly data: AgentNode,
    public readonly simulation: any // We'll type this properly later
  ) {
    this.brain = new AgentBrain(this);
  }

  /** Determines if the agent is currently available to respond to user messages. */
  public canChat(): boolean {
    return this.state === 'idle';
  }

  public async think(prompt: string, options: any = {}): Promise<{ text: string, toolCalls?: any[] }> {
    return this.brain.think(prompt, options);
  }

  public async spark() {
    return this.brain.spark();
  }

  public async executeTask(taskId: string) {
    return this.brain.executeTask(taskId);
  }

  public async concludeProject() {
    return this.brain.concludeProject();
  }

  public getStatus(): string {
    return `${this.data.name} is ${this.state}${this.currentTaskId ? ` working on ${this.currentTaskId}` : ''}`;
  }

  public getCurrentTaskId(): string | null {
    return this.currentTaskId;
  }

  public setTask(taskId: string | null) {
    this.currentTaskId = taskId;
    this.setState(taskId ? 'working' : 'idle');
  }

  public setState(state: AgentState) {
    this.state = state;
    useUiStore.getState().setAgentStatus(this.data.index, state);
  }

  public appendHistory(message: LLMMessage) {
    this.brain.appendHistory(message);
  }

  public get isThinking(): boolean {
    return this.brain.isThinking;
  }

  public dispose() {
    // No-op for now
  }
}
