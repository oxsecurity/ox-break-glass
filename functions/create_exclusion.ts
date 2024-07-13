import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

// The metadata definition for the create_exclusion function
export const CreateExclusionFunction = DefineFunction({
  callback_id: "create_exclusion",
  title: "Create Exclusion",
  description: "Create an exclusion using OX's API",
  source_file: "./functions/create_exclusion.ts",
  input_parameters: {
    properties: {
      input: { type: Schema.types.string },
      submitting_user: { type: Schema.slack.types.user_id },
    },
    required: ["input", "submitting_user"],
  },
  output_parameters: {
    properties: {
      output: { type: Schema.types.string },
    },
    required: ["output"],
  },
});

// Define a function to handle the parsed JSON result
function parseResult(result: undefined, submitter: string) {
  const data = result.data.getCICDIssue;
  interface Input {
    oxIssueId: string;
    issueId: string;
    issueName: string;
    appId: string;
    appName: string;
    appType: string;
    comment: string; //using for Slack submitter
    policyId: string;
    policyName: string;
    policyCategory: string;
    exclusionMode: string;
    expiredAt: Date;
    rule: Rule;
  }

  interface Exclusion {
    _id: string;
    fileName: string;
    realMatch: string;
    aggId: string;
  }

  interface Rule {
    exclusions: string[];
    exclusionCategory: string;
    id: string;
  }
  const input: Input = {};
  const rule: Rule = {};
  const threeHourExpiration = new Date();
  threeHourExpiration.setHours(threeHourExpiration.getHours() + 3);
  rule.exclusions = [];
  const comment = submitter; //Slack submitter

  for (let i = 0; i < data.aggregations.items.length; i++) {
    if (JSON.stringify(data) === "{}" || data === null) {
      const error =
        `Error! There is a fundamental problem with the submitted issue data. Please verify and try again. data: ${
          JSON.stringify(data)
        }`;
      return error;
    } else if (!data.aggregations.items.length && data !== null) {
      const error = data;
      return `Error! The items array is empty, which is usually the result of submitting a duplicate issueId. Please retrieve or generate a new issueId. error: ${
        JSON.stringify(error)
      }`;
    } else if (data.aggregations.items[i]) {
      input.oxIssueId = data.oxIssueId;
      input.issueId = data.issueId;
      input.issueName = data.issueName;
      input.appId = data.app.appId;
      input.appName = data.app.appName;
      input.appType = data.app.appType;
      input.policyId = data.policy.policyId;
      input.policyName = data.policy.policyName;
      input.policyCategory = data.category.policyCategory;
      input.exclusionMode = "pipelineScan";
      input.expiredAt = threeHourExpiration;
      input.rule = rule;
      const aggregations = data.aggregations;
      rule.exclusions.push(JSON.stringify(aggregations.items[i]));
      rule.exclusionCategory = data.exclusionCategory;
      rule.id = "1";
      input.comment = comment;
    }
  }
  return input;
}

// Define a function to get all the CICD issues related to a job
async function getIssues(jobNumber: string, authKey: string): Promise<string> {
  // Build a GraphQL HTTP request with OX's API
  const apiUrl = `https://api.cloud.ox.security/api/apollo-gateway`;

  // Define the GraphQL query as a string
  const query = `
  query GetCICDIssues($getCicdIssuesInput: CICDIssuesInput) {
    getCICDIssues(getCICDIssuesInput: $getCicdIssuesInput) {
      issues {
        scanId
      }
    }
  }`;

  const queryPayload = {
    query,
    variables: {
      "getCicdIssuesInput": { "filters": { "jobNumber": [jobNumber] } },
    },
  };
  const queryResponse = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": authKey,
    },
    body: JSON.stringify(queryPayload),
  });

  const queryStatus = queryResponse.status;
  if (queryStatus != 200) {
    const queryBody = queryResponse;
    const queryError = `API query error (status: ${queryStatus}, body: ${
      JSON.stringify(queryBody)
    })`;
    return queryError;
  }
  const queryResult = await queryResponse.json();
  if (!queryResult || queryResult.length === 0) {
    const queryError = `Get Issue failed: ${queryResult}`;
    return queryError;
  }
  // Return the full issue data NOTE: do NOT JSON.stringify otherwise it'll overescape things
  return queryResult;
}

// Define a function to get unique CICD issues and enforcements related to a job AND a specific scan
async function getDedupedIssues(
  jobNumber: string,
  scanID: string,
  authKey: string,
): Promise<string> {
  // Build a GraphQL HTTP request with OX's API
  const apiUrl = `https://api.cloud.ox.security/api/apollo-gateway`;

  // Define the GraphQL query as a string
  const query = `
  query GetCICDIssues($getCicdIssuesInput: CICDIssuesInput) {
    getCICDIssues(getCICDIssuesInput: $getCicdIssuesInput) {
      issues { 
        issueId 
        cicdFields { 
          enforcement 
        }
      }
    }
  }`;

  const queryPayload = {
    query,
    variables: {
      "getCicdIssuesInput": {
        "filters": { "jobNumber": [jobNumber] },
        "scanID": scanID,
      },
    },
  };
  const queryResponse = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": authKey,
    },
    body: JSON.stringify(queryPayload),
  });

  const queryStatus = queryResponse.status;
  if (queryStatus != 200) {
    const queryBody = queryResponse;
    const queryError = `API query error (status: ${queryStatus}, body: ${
      JSON.stringify(queryBody)
    })`;
    return queryError;
  }
  const queryResult = await queryResponse.json();
  if (!queryResult || queryResult.length === 0) {
    const queryError = `Get Issue failed: ${queryResult}`;
    return queryError;
  }
  // Return the full issue data NOTE: do NOT JSON.stringify otherwise it'll overescape things
  //console.log("return queryResult from getDedupedIssues: ", JSON.stringify(queryResult));
  return queryResult;
}

// Define a function to get the CICD issue
async function getIssue(
  issueId: string,
  authKey: string,
  submitter: string,
): Promise<string> {
  // Build a GraphQL HTTP request with OX's API
  const apiUrl = `https://api.cloud.ox.security/api/apollo-gateway`;

  // Define the GraphQL query as a string
  const query = `
  query GetCICDIssueForExclusion($getSingleIssueInput: SingleIssueInput) {
    getCICDIssue(getSingleIssueInput: $getSingleIssueInput) {
          oxIssueId:issueId issueId:id issueName:mainTitle occurrences app {
            appId:id
            appName:name
            appType:type
          } policy {
            policyId:id
            policyName:name
          } category {
            policyCategory:name
          } exclusionCategory aggregations {
            items {
                _id
                fileName
                realMatch
                aggId
            }
          }
      }
  }
  `;

  const queryPayload = {
    query,
    variables: { "getSingleIssueInput": { "issueId": issueId } },
  };

  const queryResponse = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": authKey,
    },
    body: JSON.stringify(queryPayload),
  });

  const queryStatus = queryResponse.status;
  if (queryStatus != 200) {
    const queryBody = queryResponse;
    const queryError = `API query error (status: ${queryStatus}, body: ${
      JSON.stringify(queryBody)
    })`;
    return queryError;
  }
  const queryResult = await queryResponse.json();
  if (!queryResult || queryResult.length === 0) {
    const queryError = `Get Issue failed: ${queryResult}`;
    return queryError;
  }
  // Return the full issue data NOTE: do NOT JSON.stringify otherwise it'll overescape things
  return parseResult(queryResult, submitter); //inject submitter during parsing for the exclusion comment
}

// Define a function to lookup the submitter
async function lookupSubmitter(
  memberId: string,
  authKey: string,
): Promise<string> {
  // Build an HTTP request with Slack's API
  const apiUrl = `https://slack.com/api/users.profile.get?user=` + memberId;
  const myHeaders = new Headers();
  myHeaders.append("Authorization", "Bearer " + authKey);

  type RequestOptions = { method: string; headers: string; redirect: string };
  const requestOptions: RequestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };
  const response = await fetch(apiUrl, requestOptions);
  const result = await response.json();
  const name = await result.profile.real_name;
  return name;
}
// Define a function to create the Exclusion
async function createExclusion(
  input: string,
  authKey: string,
): Promise<string> {
  await input;

  // Build a GraphQL HTTP request with OX's API
  const apiUrl = `https://api.cloud.ox.security/api/apollo-gateway`;

  // Define GraphQL Mutation Query as a string
  const query = `
  mutation Mutation($input: ExcludeAlertInput!) {
    excludeAlert (input:$input) {
      exclusions {
        id
        issueName
      }
    }
  }`;

  const mutationPayload = {
    query,
    variables: { input }, //input passed in as param during data flow
  };

  const mutationResponse = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": authKey,
    },
    body: JSON.stringify(mutationPayload),
  });

  const mutationStatus = mutationResponse.status;
  if (mutationStatus === 400) {
    const mutationBody = mutationResponse;
    const mutationError =
      `Error! API mutation error, duplicate or improperly formatted request (status: ${mutationStatus}, body: ${
        JSON.stringify(mutationBody)
      }, payload: ${JSON.stringify(mutationPayload)})`;
    return mutationError;
  } else if (mutationStatus === 401) {
    const mutationError =
      `Error! API Authentication problem. Check that your env has a properly set OX_API_KEY. (status: ${mutationStatus}, body: ${
        JSON.stringify(mutationResponse)
      }, payload: ${JSON.stringify(mutationPayload)})`;
    return mutationError;
  }
  const mutationResult = await mutationResponse.json();
  if (!mutationResult || mutationResult.length === 0) {
    const mutationError = `Error! Mutation failed: ${mutationResult}`;
    return mutationError;
  }
  const success = `Success! status: ${mutationStatus} response: ${
    JSON.stringify(mutationResult)
  }`;
  return success;
}

// Needs decoding b/c it's coming from a URL
function getJobNumber(input: string) {
  const decoded = decodeURIComponent(input);
  const params = new URL(decoded).searchParams;
  const job = JSON.parse(params.get("filters"));
  let output = "";
  if (decoded.includes("summary")) { //GitLab app
    output = job.jobId[0];
  } else if (decoded.includes("issues")) {
    output = job.jobNumber[0]; //YAML scans & BitBucket and GitHub apps
  } else {
    output = "error parsing input";
  }
  return output;
}

// Entry point for the app/workflow
// inputs.input originates in the workflow form
// outputs: output data sent at the end of the workflow
export default SlackFunction(
  CreateExclusionFunction,
  async ({ inputs, env }) => {
    const authKey = env["OX_API_KEY"];
    if (!authKey) {
      // Since it's impossible to continue in this case, this function returns an error.
      const error =
        "Error! OX_API_KEY env value is missing. Please add `.env` file for `slack run`. If you've already deployed this app, `slack env add OX_API_KEY (value)` command configures the env variable for you.";
      return { error };
    }
    const slackToken = env["SLACK_TOKEN"];

    const jobNumber = getJobNumber(inputs.input);
    const submitter = inputs.submitting_user;
    const userName = await lookupSubmitter(submitter, slackToken);
    const userString = "Entered by Slack User: " + userName + " (" + submitter +
      ")";
    const issuesArray = await getIssues(jobNumber, authKey);
    const scanID = await issuesArray.data.getCICDIssues.issues[0].scanId; //get only first scanID to de-dupe issues
    const dedupedIssuesArray = await getDedupedIssues(
      jobNumber,
      scanID,
      authKey,
    );
    const blockingIssues = await dedupedIssuesArray.data.getCICDIssues.issues;
    const parsedStringArray = [];
    for (let i = 0; i < blockingIssues.length; i++) {
      if (blockingIssues[i].cicdFields.enforcement === "Block") {
        const parsedIssue = await getIssue(
          blockingIssues[i].issueId,
          authKey,
          userString,
        );
        const exclusionResult = await createExclusion(parsedIssue, authKey);
        const resultString = await JSON.stringify(exclusionResult);
        parsedStringArray.push(await JSON.parse(resultString)); //.parse undoes overescaping caused by .stringify
      }
    }
    //console.log(parsedStringArray.toString());
    return { outputs: { output: parsedStringArray.toString() } };
  },
);
