import { AgentActionContext } from '../ToolRegistry';
import { useCoreStore } from '../../../integration/store/coreStore';

export function proposeTask(agent: AgentActionContext, args: { title: string, description: string, agentId: number, requiresApproval?: boolean }): boolean {
  const store = useCoreStore.getState();
  const { title, description, agentId, requiresApproval } = args;

  // Simplified: Trust the agentId provided by the LLM, fallback to self if invalid or 0
  const finalAgentId = agentId > 0 ? agentId : agent.data.index;

  const newTask = store.addTask({
    title,
    description,
    assignedAgentId: finalAgentId,
    status: 'scheduled',
    requiresUserApproval: requiresApproval || false
  });

  store.addLogEntry({ agentIndex: agent.data.index, action: `proposed task: "${title}"`, taskId: newTask.id });
  
  return true;
}
