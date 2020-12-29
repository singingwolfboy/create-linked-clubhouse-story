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
  getClubhouseIterationInfo,
  getLatestMatchingClubhouseIteration,
  delay,
} from "./util";

export default async function labeled(): Promise<void> {
  const payload = context.payload as EventPayloads.WebhookPayloadPullRequest;

  // Do this up front because we want to return fast if the new label was not
  // configured for Iteration support
  core.debug(`PR labels: ${JSON.stringify(payload.pull_request.labels)}`);
  const newGithubLabel = payload.label ? payload.label.name : undefined;
  core.debug(`newGithubLabel: ${newGithubLabel}`);
  const clubhouseIterationInfo = getClubhouseIterationInfo(newGithubLabel);
  core.debug(`ClubhouseIterationInfo: ${JSON.stringify(clubhouseIterationInfo)}`);
  if (!clubhouseIterationInfo) {
    core.debug(`No new label configured for iteration matching. Done!`);
    return;
  }

  core.debug(`Waiting 10s to ensure CH ticket has been created`);
  await delay(10000);
  const branchName = payload.pull_request.head.ref;
  let storyId = getClubhouseStoryIdFromBranchName(branchName);
  if (storyId) {
    core.debug(`found story ID ${storyId} in branch ${branchName}`);
  }

  const clubhouseURL = await getClubhouseURLFromPullRequest(payload);
  if (!clubhouseURL) {
    core.setFailed("Clubhouse URL not found!");
    return;
  }

  const match = clubhouseURL.match(CLUBHOUSE_STORY_URL_REGEXP);
  if (match) {
    storyId = match[1];
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

  const clubhouseIteration = await getLatestMatchingClubhouseIteration(
    clubhouseIterationInfo,
    http
  );
  core.debug(`clubhouseIteration: ${JSON.stringify(clubhouseIteration)}`);
  if (clubhouseIteration) {
    await updateClubhouseStoryById(storyId, http, {
      iteration_id:  clubhouseIteration.id,
    });
    core.setOutput("iteration-url", clubhouseIteration.app_url);
    core.setOutput("iteration-name", clubhouseIteration.name);
  } else {
    core.setFailed(`Could not find Clubhouse Iteration for story`);
  }
}
