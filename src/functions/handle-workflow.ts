import { Database } from "@/types/supabase";
import { ActionEvent, handleAction } from "./handle-action";
import { TwitchApi } from "@/services/twitchApi";

// The relation `workflows(*, workflow_actions(*))` returns a single workflow (via FK)
// with an array of `workflow_actions`, or null if missing.
export type WorkflowTrigger = Database["public"]["Tables"]["workflow_triggers"]["Row"] & {
  workflows:
    | (Database["public"]["Tables"]["workflows"]["Row"] & {
        workflow_actions: Database["public"]["Tables"]["workflow_actions"]["Row"][];
      })
    | null;
};

export async function handleWorkflow(workflowData: WorkflowTrigger[], twitchApi: TwitchApi, triggerData: any) {
  for (const workflowTrigger of workflowData) {
    const workflow = workflowTrigger.workflows;
    if (!workflow) continue;

    // Sort actions by order (ascending)
    const sortedActions = [...workflow.workflow_actions].sort((a, b) => a.order - b.order);

    console.log(`Running workflow "${workflow.name}" with ${sortedActions.length} actions`);

    // Simple execution context to store outputs
    const context: Record<string, any> = {};

    const resluts: Record<string, any> = {
      trigger: triggerData,
    };

    for (const action of sortedActions) {
      console.log(`Executing action [${action.order}] type=${action.type}`);
      context[action.id] = action.config;

      try {
        // This would call your action executor
        const actionEvent: ActionEvent = {
          action: action.type,
          module: action.module,
          context: context,
          currentActionContext: action.config,
          results: resluts,
        };

        const result = await handleAction(actionEvent, twitchApi);

        // Store result in results
        resluts[action.id] = result;
      } catch (err) {
        console.error(`Action ${action.id} failed:`, err);
        break; // stop workflow if action fails
      }
    }

    console.log(`Workflow "${workflow.name}" completed`);
  }
}
