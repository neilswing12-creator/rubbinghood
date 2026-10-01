import { AgentActionContext } from '../ToolRegistry';
import { useCoreStore } from '../../../integration/store/coreStore';
import { useUiStore } from '../../../integration/store/uiStore';

export function completeTask(agent: AgentActionContext, args: { taskId: string, output: string }): boolean {
  const store = useCoreStore.getState();
  const { taskId, output } = args;

  // HUMAN-IN-THE-LOOP: If agent requires validation, submit for review instead of completing.
  const agentStatus = useUiStore.getState().agentStatuses[agent.data.index];
  
  if (agent.data.humanInTheLoop && agentStatus !== 'on_hold') {
    const tasks = useCoreStore.getState().tasks;
    const task = tasks.find(t => t.id === taskId);
    const taskTitle = task?.title || taskId;
    
    store.submitTaskForReview(taskId, output);
    agent.setState('on_hold');
    agent.appendHistory({
      role: 'assistant',
      content: `I've finished **"${taskTitle}"** and submitted it for review.`,
      metadata: { reviewTaskId: taskId }
    });
    return true;
  }

  store.updateTaskStatus(taskId, 'done');
  store.setTaskOutput(taskId, output);
  store.addLogEntry({ agentIndex: agent.data.index, action: `completed task`, taskId });
  
  return true;
}
