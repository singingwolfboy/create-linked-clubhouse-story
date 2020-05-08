import * as core from "@actions/core";
import { context } from "@actions/github";
import { WebhookPayloadPullRequest } from "@octokit/webhooks";
import { HttpClient } from "@actions/http-client";
import Mustache from "mustache";
import {
  CLUBHOUSE_STORY_URL_REGEXP,
  getClubhouseURLFromPullRequest,
  createClubhouseStory,
  addCommentToPullRequest,
  getClubhouseStoryIdFromBranchName,
} from "./util";

export default async function opened(): Promise<void> {
  const payload = context.payload as WebhookPayloadPullRequest;
  const branchName = payload.pull_request.head.ref;
  let storyId = getClubhouseStoryIdFromBranchName(branchName);
  if (storyId) {
    core.debug(`found story ID ${storyId} in branch ${branchName}`);
    core.setOutput("story-id", storyId);
    return;
  }

  const clubhouseURL = await getClubhouseURLFromPullRequest(payload);
  if (clubhouseURL) {
    const match = clubhouseURL.match(CLUBHOUSE_STORY_URL_REGEXP);
    if (match) {
      storyId = match[1];
      core.setOutput("story-id", storyId);
    }
    return;
  }

  const http = new HttpClient();
  const story = await createClubhouseStory(payload, http);
  if (!story) {
    return;
  }
  core.setOutput("story-id", story.id.toString());
  const COMMENT_TEMPLATE = core.getInput("comment-template");
  const comment = Mustache.render(COMMENT_TEMPLATE, { story });
  await addCommentToPullRequest(payload, comment);
}
