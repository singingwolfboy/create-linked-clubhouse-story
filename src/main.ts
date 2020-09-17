import * as core from "@actions/core";
import { context } from "@actions/github";
import { EventPayloads } from "@octokit/webhooks";
import opened from "./opened";
import closed from "./closed";
import { getExcludedUsers, getIncludedUsers } from "./util";

async function run(): Promise<void> {
  if (context.eventName !== "pull_request") {
    core.setFailed("This action only works with `pull_request` events");
    return;
  }

  const payload = context.payload as EventPayloads.WebhookPayloadPullRequest;
  const excludedUsers = getExcludedUsers();
  const includedUsers = getIncludedUsers();
  const author = payload.pull_request.user.login;
  if(includedUsers) {
    core.debug(`included-users is set ${includedUsers}. Only PRs from these users will create a Clubhouse story`)
    if (includedUsers.has(author)) {
      core.debug(`${author} is in included-users`);
    }
    else
      return;
  }

  if (excludedUsers.has(author)) {
    core.debug(`ignored pull_request event from user ${author} who is listed in exluded-users`);
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
