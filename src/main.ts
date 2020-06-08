import * as core from "@actions/core";
import { context } from "@actions/github";
import { WebhookPayloadPullRequest } from "@octokit/webhooks";
import opened from "./opened";
import closed from "./closed";
import { getIgnoredUsers } from "./util";

async function run(): Promise<void> {
  if (context.eventName !== "pull_request") {
    core.setFailed("This action only works with `pull_request` events");
    return;
  }

  const payload = context.payload as WebhookPayloadPullRequest;
  const ignoredUsers = getIgnoredUsers();
  const author = payload.pull_request.user.login;
  if (ignoredUsers.has(author)) {
    core.debug(`ignored pull_request event from user ${author}`);
    return;
  }

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
