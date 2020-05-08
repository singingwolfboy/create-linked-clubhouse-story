import * as core from "@actions/core";
import { context } from "@actions/github";
import { WebhookPayloadPullRequest } from "@octokit/webhooks";
import { HttpClient } from "@actions/http-client";
import {
  CLUBHOUSE_STORY_URL_REGEXP,
  getClubhouseURLFromPullRequest,
  getClubhouseStoryIdFromBranchName,
  getClubhouseWorkflowForStory,
  getClubhouseStoryById,
  updateClubhouseStoryById,
} from "./util";

export default async function closed(): Promise<void> {
  const payload = context.payload as WebhookPayloadPullRequest;
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

  const workflow = await getClubhouseWorkflowForStory(story, http);
  if (!workflow) {
    core.setFailed(`Could not get Clubhouse workflow for story ${storyId}`);
    return;
  }
  const stateName = payload.pull_request.merged
    ? core.getInput("merged-state-name")
    : core.getInput("closed-state-name");
  const workflowState = workflow.states.find(
    (state) => state.name === stateName
  );
  if (!workflowState) {
    core.setFailed(
      `Could not find Clubhouse workflow state named ${stateName}`
    );
    return;
  }
  const updatedStory = await updateClubhouseStoryById(storyId, http, {
    workflow_state_id: workflowState.id,
  });
  if (!updatedStory) {
    core.setFailed(
      `Could not update Clubhouse story ${storyId} to workflow state ${workflowState.id}`
    );
    return;
  }
}
