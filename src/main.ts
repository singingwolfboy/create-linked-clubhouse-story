import * as core from "@actions/core";
import { context } from "@actions/github";
import { WebhookPayloadPullRequest } from "@octokit/webhooks";
import opened from "./opened";
import closed from "./closed";

async function run(): Promise<void> {
  if (context.eventName !== "pull_request") {
    core.setFailed("This action only works with `pull_request` events");
    return;
  }

  const payload = context.payload as WebhookPayloadPullRequest;
  switch (payload.action) {
    case "opened":
      return opened();
    case "closed":
      return closed();
    default:
      core.setFailed(
        "This action only works with the `opened` and `closed` actions for `pull_request` events"
      );
      return;
  }
}

run();
