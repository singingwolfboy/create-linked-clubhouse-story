import * as core from "@actions/core";
import { context } from "@actions/github";
import { PullRequestLabeledEvent } from "@octokit/webhooks-types";
import { HttpClient } from "@actions/http-client";
import {
  getClubhouseStoryIdFromPullRequest,
  getClubhouseStoryById,
  updateClubhouseStoryById,
  getClubhouseIterationInfo,
  getLatestMatchingClubhouseIteration,
  delay,
} from "./util";

export default async function labeled(): Promise<void> {
  const payload = context.payload as PullRequestLabeledEvent;

  // Do this up front because we want to return fast if the new label was not
  // configured for Iteration support
  const newLabel = payload.label?.name;
  if (!newLabel) {
    core.debug("missing label information from payload");
    return;
  }
  core.debug(`new label on GitHub: "${newLabel}"`);
  const clubhouseIterationInfo = getClubhouseIterationInfo(newLabel);
  if (!clubhouseIterationInfo) {
    core.debug(`label "${newLabel}" is not configured for iteration matching`);
    return;
  }

  core.debug(`Waiting 10s to ensure Clubhouse ticket has been created`);
  await delay(10000);
  const storyId = await getClubhouseStoryIdFromPullRequest(payload);
  if (!storyId) {
    core.setFailed("Could not find Clubhouse story ID");
    return;
  }
  core.debug(`Clubhouse story ID: ${storyId}`);

  const http = new HttpClient();
  const story = await getClubhouseStoryById(storyId, http);
  if (!story) {
    core.setFailed(`Could not get Clubhouse story ${storyId}`);
    return;
  }

  const clubhouseIteration = await getLatestMatchingClubhouseIteration(
    clubhouseIterationInfo,
    http
  );
  if (!clubhouseIteration) {
    core.setFailed(`Could not find Clubhouse iteration for story ${storyId}`);
    return;
  }
  core.debug(
    `assigning Clubhouse iteration: "${clubhouseIteration.name}", ID ${clubhouseIteration.id}`
  );
  await updateClubhouseStoryById(storyId, http, {
    iteration_id: clubhouseIteration.id,
  });
  core.setOutput("iteration-url", clubhouseIteration.app_url);
  core.setOutput("iteration-name", clubhouseIteration.name);
}
