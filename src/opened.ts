import * as core from "@actions/core";
import { context } from "@actions/github";
import { PullRequestOpenedEvent } from "@octokit/webhooks-types";
import { HttpClient } from "@actions/http-client";
import Mustache from "mustache";
import {
  SHORTCUT_STORY_URL_REGEXP,
  getShortcutURLFromPullRequest,
  createShortcutStory,
  addCommentToPullRequest,
  getShortcutStoryIdFromBranchName,
} from "./util";

export default async function opened(): Promise<void> {
  const payload = context.payload as PullRequestOpenedEvent;
  const branchName = payload.pull_request.head.ref;
  let storyId = getShortcutStoryIdFromBranchName(branchName);
  if (storyId) {
    core.debug(`found story ID ${storyId} in branch ${branchName}`);
    core.setOutput("story-id", storyId);
    return;
  }

  const shortcutURL = await getShortcutURLFromPullRequest(payload);
  if (shortcutURL) {
    const match = shortcutURL.match(SHORTCUT_STORY_URL_REGEXP);
    if (match) {
      storyId = match[1];
      core.setOutput("story-id", storyId);
    }
    return;
  }

  const http = new HttpClient();

  const story = await createShortcutStory(payload, http);
  if (!story) {
    return;
  }
  core.setOutput("story-id", story.id.toString());
  const COMMENT_TEMPLATE = core.getInput("comment-template");
  const comment = Mustache.render(COMMENT_TEMPLATE, { story });
  await addCommentToPullRequest(payload, comment);
}
