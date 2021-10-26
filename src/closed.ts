import * as core from "@actions/core";
import { context } from "@actions/github";
import { PullRequestClosedEvent } from "@octokit/webhooks-types";
import { HttpClient } from "@actions/http-client";
import {
  SHORTCUT_STORY_URL_REGEXP,
  getShortcutURLFromPullRequest,
  getShortcutStoryIdFromBranchName,
  getShortcutStoryById,
  updateShortcutStoryById,
  getShortcutProject,
  getShortcutWorkflowState,
} from "./util";

export default async function closed(): Promise<void> {
  const payload = context.payload as PullRequestClosedEvent;
  const branchName = payload.pull_request.head.ref;
  let storyId = getShortcutStoryIdFromBranchName(branchName);
  if (storyId) {
    core.debug(`found story ID ${storyId} in branch ${branchName}`);
    core.setOutput("story-id", storyId);
    return;
  }

  const shortcutURL = await getShortcutURLFromPullRequest(payload);
  if (!shortcutURL) {
    core.setFailed("Shortcut URL not found!");
    return;
  }
  const match = shortcutURL.match(SHORTCUT_STORY_URL_REGEXP);
  if (match) {
    storyId = match[1];
    core.setOutput("story-id", storyId);
  } else {
    core.debug(`invalid Shortcut URL: ${shortcutURL}`);
    return;
  }

  const http = new HttpClient();
  const story = await getShortcutStoryById(storyId, http);
  if (!story) {
    core.setFailed(`Could not get Shortcut story ${storyId}`);
    return;
  }
  const project = await getShortcutProject(story.project_id, http);
  if (!project) {
    core.setFailed(`Could not get Shortcut project ${story.project_id}`);
    return;
  }
  const stateName = payload.pull_request.merged
    ? core.getInput("merged-state-name")
    : core.getInput("closed-state-name");
  const workflowState = await getShortcutWorkflowState(
    stateName,
    http,
    project
  );
  if (!workflowState) {
    core.setFailed(`Could not find Shortcut workflow state named ${stateName}`);
    return;
  }
  await updateShortcutStoryById(storyId, http, {
    workflow_state_id: workflowState.id,
  });
}
