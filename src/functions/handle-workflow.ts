import { Database } from "@/types/supabase";
import { ActionEvent, handleAction } from "./handle-action";
import { TwitchApi } from "@/services/twitchApi";



export type WorkflowData = Database["public"]["Tables"]["workflows"]["Row"] & {
  workflow_actions: Database["public"]["Tables"]["workflow_actions"]["Row"][];
  workflow_trigger_id: string
};



export async function handleWorkflow(workflowData: WorkflowData[], twitchApi: TwitchApi, triggerData: any, broadcasterId: string) {
  let index = 0;
  for (const workflow of workflowData) {
    if (!workflow) continue;

    // Sort actions by order (ascending)
    const sortedActions = [...workflow.workflow_actions].sort((a, b) => a.order - b.order);

    console.log(`Running workflow "${workflow.name}" with ${sortedActions.length} actions`);

    // Simple execution context to store outputs
    const context: Record<string, any> = {};

    const resluts: Record<string, any> = {
      [workflow.workflow_trigger_id]: triggerData,
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

        const result = await handleAction(actionEvent, twitchApi, broadcasterId);

        // Store result in results
        resluts[action.id] = result;
      } catch (err) {
        console.log(err);
        console.log("error in action handler " + action.type + " " + err);
        break; // stop workflow if action fails
      }
    }

    console.log(`Workflow "${workflow.name}" completed`);
    index++;
  }
}
