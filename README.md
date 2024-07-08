<!-- [![OX Security Scan](https://github.com/oxsecurity/ox-break-glass/actions/workflows/ox.yml/badge.svg)](https://github.com/oxsecurity/ox-break-glass/actions/workflows/ox.yml) -->
[![Deno Linter](https://github.com/oxsecurity/ox-break-glass/actions/workflows/deno.yml/badge.svg)](https://github.com/oxsecurity/ox-break-glass/actions/workflows/deno.yml)

# ox-break-glass

## Precautions

This is sample code for a one-off tool, not an official product. As such, it 
is not supported, though issues will be addressed on a best-effort basis.

## Background and design

To ensure quality and maintain trust, AppDev teams typically agree to safety
procedures established by AppSec representatives. The most powerful of these
blocks a build, with the intent of preventing a disaster (for example,
inadvertent sharing of AWS keys publicly). Yet inevitably, situations arise that
require emergency bypassing of established policies because the importance of
getting a release out takes precedence over the risk to safety. The ability to
bypass OX's safeguards can be controlled by creating an Exclusion.

The requirement is to not force the dev team to login to OX and instead use a
familiar tools, their CI/CD pipeline and Slack, to create a temporary exemption,
which then on a re-run of the build, allows it to proceed. This workflow
delivers that.

## Steps to install the app

1. clone this repo, cd into the ox-break-glass directory
2. make sure you've the necessary permissions by running `slack auth list`
   _(reach out to your Slack admin if you don't have the proper permissions)_
3. gather two tokens: an OX API Token from the Ox Dashboard & a Slack OAuth
   token with `users.profile:read` Bot Token Scope from a Slack app
4. run `slack install` from within the `ox-break-glass` directory and follow the
   prompts
5. run `slack env add OX_API_KEY <your_api_key_here>`
6. run `slack env add SLACK_TOKEN <your_slack_xoxb*_token_here>`
7. check that the environment variables were deployed with `slack env list`
8. run `slack deploy` to deploy the application
9. when prompted to `Choose a trigger definition file` accept the listed option
   (`triggers/create_exclusion_trigger.ts`)
10. you will then be provided a link to the Workflow which you should then copy
    and paste into an appropriately secured channel with only trained,
    authorized, and vetted members. The link will looks something like this:
    `https://slack.com/shortcuts/Ft07661HPM0U/a30ad178a0227bd7d37c23274cb6a15f`

## Steps to use the workflow

1. create a Slack channel (i.e. Break Glass Workflow)
2. add the workflow link and pin that message to the channel for easy future
   access
3. use `Start Workflow` and enter in the "all issues" link from the OX output in
   your CI/CD platform

One option for retrieving the input (YAML scans):<br>
<img width="700" alt="image" src="https://github.com/aaronhmiller/ox-break-glass/assets/223486/93d2746d-6eec-4eba-bdf0-c6ffd5373fc2"><br>
Second option (GitHub App):<br>
<img width="700" alt="image" src="https://github.com/aaronhmiller/ox-break-glass/assets/223486/da335adf-659b-41d4-bc95-ff7295447210"><br>
Third option (GitLab App):<br>
<img width="325" alt="image" src="https://github.com/aaronhmiller/ox-break-glass/assets/223486/a4eb1dcd-7aaf-4f9c-9dbf-95b0c6acfd5e"><br>
Fourth option (BitBucket App):<br>
<img width="200" alt="image" src="https://github.com/aaronhmiller/ox-break-glass/assets/223486/a410b861-1e4f-4936-8235-04ba5071cb4c">


4. check the output, which if successful will look something like this:
   ```
   Success! status: 200 response: {"data":{"excludeAlert":{"exclusions":[{"id":"6646e659d706ddad04646729",
   "issueName":"K8s container should not be privileged"}]}}}
   ```
5. check in Ox for a newly created Exclusion. The `excluded by` field should say
   `api@ox.security` and the comments will have the Slack user's information. By
   default, the Exclusion has a hard coded 3 hour expiration.
6. if instead you see an error, follow the advice from it. Usually errors arise
   from malformed or previously used data

Here's a recording demonstrating how to use it:
![using-ox-break-glass](https://github.com/aaronhmiller/ox-break-glass/assets/223486/1a09480d-23d4-47fe-a405-d43afc2bdd0e)

## Steps to debug

1. use `slack run` to create a locally running instance of the app
2. examine the output in the terminal where you ran `slack run` as you test the
   workflow/app
3. add `console.log()` statements as needed to the
   `/functions/create_exclusion.ts`

## How the workflow & custom function were built

Follow
[this tutorial](https://api.slack.com/tutorials/tracks/wfb-function#next).
You'll need to deviate slightly from their outdated instructions about custom
inputs and use Forms instead. Add a form from the Steps area and then the rest
should work.

## Steps to uninstall the app

1. from the app's directory, run `slack uninstall`
2. to fully remove, run `slack delete`

You may need to remove the app from both the `Deployed` and `Local` environments

## Historical info

##### _Outdated given added workflow and trigger features but keeping for historical reasons..._

##### _Workflow details_

Here's a screenshot of the workflow's form: <br>
<img width="400" alt="image" src="https://github.com/aaronhmiller/ox-break-glass/assets/223486/b5ca8ee4-3b4e-420d-9d9c-1792683564e1">

The custom `Create Exclusion` step is the key here that links the workflow to
the code in the `/functions/create_exclusion.ts` file. You'll also need to add
your OX_API_KEY and create a channel to run the workflow within.

##### _Steps to create the workflow_

1. from Slack -> ... More, choose Automations -> Workflow builder -> Create
   Workflow
2. start from scratch and select `From a link in Slack`
3. collect info from a form (the All Issues link)
4. use the "Custom Step" to select the `ox-break-glass` app and use the
   `Create Exclusion` function from that app
5. add a variable and choose `{} Answer to: What is the All Issues link` for the
   input and `Submitting User` as `{} Person who used this workflow` <br>
   <img width="300" alt="image" src="https://github.com/aaronhmiller/ox-break-glass/assets/223486/fc68ae09-c14b-4055-bf31-4e8729c1262b">
6. add a send a message step, send it to the channel where the workflow was used
   and informative text
7. use the `{} Output` variable to confirm the Exclusion API's output
