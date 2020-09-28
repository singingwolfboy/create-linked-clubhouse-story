import * as core from "@actions/core";
import { context } from "@actions/github";
import { EventPayloads } from "@octokit/webhooks";
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
  const payload = context.payload as EventPayloads.WebhookPayloadPullRequest;
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

  const CLUBHOUSE_STORY_TITLE_TEMPLATE = core.getInput(
    "clubhouse-story-title-template"
  );
  const storyTitle = Mustache.render(CLUBHOUSE_STORY_TITLE_TEMPLATE, {
    payload,
  });

  const CLUBHOUSE_STORY_BODY_TEMPLATE = core.getInput(
    "clubhouse-story-body-template"
  );
  const storyBody = Mustache.render(CLUBHOUSE_STORY_BODY_TEMPLATE, { payload });

  const story = await createClubhouseStory(
    payload,
    http,
    storyTitle,
    storyBody
  );
  if (!story) {
    return;
  }
  core.setOutput("story-id", story.id.toString());
  const COMMENT_TEMPLATE = core.getInput("comment-template");
  const comment = Mustache.render(COMMENT_TEMPLATE, { story });
  await addCommentToPullRequest(payload, comment);
}
