import * as core from "@actions/core";
import { context } from "@actions/github";
import { EventPayloads } from "@octokit/webhooks";
import { HttpClient } from "@actions/http-client";
import {
  CLUBHOUSE_STORY_URL_REGEXP,
  getClubhouseURLFromPullRequest,
  getClubhouseStoryIdFromBranchName,
  getClubhouseStoryById,
  updateClubhouseStoryById,
  getClubhouseProject,
  getClubhouseWorkflowState,
} from "./util";

export default async function closed(): Promise<void> {
  const payload = context.payload as EventPayloads.WebhookPayloadPullRequest;
  const branchName = payload.pull_request.head.ref;
  let storyId = getClubhouseStoryIdFromBranchName(branchName);
  if (storyId) {
    core.debug(`found story ID ${storyId} in branch ${branchName}`);
    core.setOutput("story-id", storyId);
    return;
  }

  const clubhouseURL = await getClubhouseURLFromPullRequest(payload);
  if (!clubhouseURL) {
    core.setFailed("Clubhouse URL not found!");
    return;
  }
  const match = clubhouseURL.match(CLUBHOUSE_STORY_URL_REGEXP);
  if (match) {
    storyId = match[1];
    core.setOutput("story-id", storyId);
  } else {
    core.debug(`invalid Clubhouse URL: ${clubhouseURL}`);
    return;
  }

  const http = new HttpClient();
  const story = await getClubhouseStoryById(storyId, http);
  if (!story) {
    core.setFailed(`Could not get Clubhouse story ${storyId}`);
    return;
  }
  const project = await getClubhouseProject(story.project_id, http);
  if (!project) {
    core.setFailed(`Could not get Clubhouse project ${story.project_id}`);
    return;
  }
  const stateName = payload.pull_request.merged
    ? core.getInput("merged-state-name")
    : core.getInput("closed-state-name");
  const workflowState = await getClubhouseWorkflowState(
    stateName,
    http,
    project
  );
  if (!workflowState) {
    core.setFailed(
      `Could not find Clubhouse workflow state named ${stateName}`
    );
    return;
  }
  await updateClubhouseStoryById(storyId, http, {
    workflow_state_id: workflowState.id,
  });
}
