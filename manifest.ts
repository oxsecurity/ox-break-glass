import { Manifest } from "deno-slack-sdk/mod.ts";
import { CreateExclusionFunction } from "./functions/create_exclusion.ts";
import CreateExclusionWorkflow from "./workflows/create_exclusion_workflow.ts";

/**
 * The app manifest contains the app's configuration. This
 * file defines attributes like app name and description.
 * https://api.slack.com/future/manifest
 */
export default Manifest({
  name: "ox-break-glass",
  description: "A Slack workflow using Deno that creates OX Exceptions",
  icon: "assets/ox-app-icon.png",
  functions: [CreateExclusionFunction],
  workflows: [CreateExclusionWorkflow],
  outgoingDomains: ["api.cloud.ox.security"],
  botScopes: ["commands", "chat:write", "chat:write.public"],
});
