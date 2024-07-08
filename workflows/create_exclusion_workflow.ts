import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { CreateExclusionFunction } from "../functions/create_exclusion.ts";

/**
 * A workflow is a set of steps that are executed in order.
 * Each step in a workflow is a function.
 * https://api.slack.com/automation/workflows
 */
const CreateExclusionWorkflow = DefineWorkflow({
  callback_id: "create_exclusion_workflow",
  title: "Submit all issues link",
  description: "Submit an exclusion request to the channel's workflow",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
      },
      channel: {
        type: Schema.slack.types.channel_id,
      },
    },
    required: ["channel", "interactivity"],
  },
});

/**
 * For collecting input from users, we recommend the
 * built-in OpenForm function as a first step.
 * https://api.slack.com/automation/functions#open-a-form
 */
const inputForm = CreateExclusionWorkflow.addStep( //collect info, step 0
  Schema.slack.functions.OpenForm,
  {
    title: "Submit all issues link",
    interactivity: CreateExclusionWorkflow.inputs.interactivity,
    submit_label: "Submit",
    fields: {
      elements: [{
        name: "input",
        title: "What is the All Issues link?",
        description:
          "URL will come from your CI/CD platform. It'll look like: https://app.ox[snip]job[Number|Id]%22%3A%5B%29290158214%22%5D%7D",
        type: Schema.types.string,
      }],
      required: ["input"],
    },
  },
);

/**
 * Custom functions are reusable building blocks
 * of automation deployed to Slack infrastructure. They
 * accept inputs, perform calculations, and provide
 * outputs, just like typical programmatic functions.
 * https://api.slack.com/automation/functions/custom
 */

const createExclusionFunctionStep = CreateExclusionWorkflow.addStep( //custom step, step 1
  CreateExclusionFunction,
  {
    input: inputForm.outputs.fields.input,
    submitting_user: inputForm.outputs.interactivity.interactor.id,
  },
);

CreateExclusionWorkflow.addStep( //send message, step 2
  Schema.slack.functions.SendMessage,
  {
    channel_id: CreateExclusionWorkflow.inputs.channel,
    message:
      "Assuming a successful result, all the blocking issues now have 3 hour exclusions applied. You can now re-run the CI/CD flow and it will pass.\n" +
      "Output from the workflow: ```" +
      createExclusionFunctionStep.outputs.output + "```\n" +
      "Input: `" + inputForm.outputs.fields.input + "`",
  },
);

export default CreateExclusionWorkflow;
