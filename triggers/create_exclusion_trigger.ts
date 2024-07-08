import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import CreateExclusionWorkflow from "../workflows/create_exclusion_workflow.ts";

/**
 * Triggers determine when workflows are executed. A trigger
 * file describes a scenario in which a workflow should be run,
 * such as a user pressing a button or when a specific event occurs.
 * https://api.slack.com/automation/triggers
 */
const createExclusionTrigger: Trigger<
  typeof CreateExclusionWorkflow.definition
> = {
  type: TriggerTypes.Shortcut,
  name: "Submit the all issues (pipeline) link",
  description: "Submit an exclusion request to the channel's workflow",
  workflow: `#/workflows/${CreateExclusionWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: TriggerContextData.Shortcut.interactivity,
    },
    channel: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default createExclusionTrigger;
