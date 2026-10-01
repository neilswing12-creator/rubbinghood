import { AgentActionContext } from '../ToolRegistry';
import { useCoreStore } from '../../../integration/store/coreStore';

export function setUserBrief(agent: AgentActionContext, args: { brief: string }): boolean {
  const store = useCoreStore.getState();
  const { brief } = args;

  // VALIDATION: Only Lead Agent (index 1) can set the brief
  if (agent.data.index !== 1) {
    console.warn(`[ToolRegistry] Agent ${agent.data.name} attempted set_user_brief, but is not the Lead Agent.`);
    return false;
  }
  
  if (store.phase !== 'idle') return false;

  store.startProject(brief);
  store.addLogEntry({ agentIndex: agent.data.index, action: 'defined project brief', taskId: undefined });
  
  return true;
}
