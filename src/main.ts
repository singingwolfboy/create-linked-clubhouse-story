// import { getInput, setOutput, setFailed, debug, error } from "@actions/core";
import * as core from "@actions/core";
import { GitHub, context } from "@actions/github";
import { WebhookPayloadPullRequest } from "@octokit/webhooks";
import { HttpClient } from "@actions/http-client";
import {
  ClubhouseMember,
  ClubhouseProject,
  ClubhouseStory,
  ClubhouseCreateStoryBody,
} from "./types";

const clubhouseURLRegex = /https:\/\/app.clubhouse.io\/\w+\/story\/(\d+)\/[A-Za-z0-9-]*/;

interface Stringable {
  toString(): string;
}

/**
 * Convert a Map to a sorted string representation. Useful for debugging.
 *
 * @param {Map} map - The input Map to convert to a string.
 * @returns {string} Sorted string representation.
 */
function stringFromMap(map: Map<Stringable, Stringable>): string {
  return JSON.stringify(Object.fromEntries(Array.from(map.entries()).sort()));
}

const GITHUB_TOKEN: string = core.getInput("github-token", { required: true });
const CLUBHOUSE_TOKEN: string = core.getInput("clubhouse-token", {
  required: true,
});
const PROJECT_NAME: string = core.getInput("project-name", { required: true });

async function getClubhouseUserId(
  githubUsername: string,
  http: HttpClient
): Promise<string | undefined> {
  let emailToClubhouseId;

  try {
    const membersResponse = await http.getJson<ClubhouseMember[]>(
      `https://api.clubhouse.io/api/v3/members?token=${CLUBHOUSE_TOKEN}`
    );
    const members = membersResponse.result;
    if (!members) {
      core.setFailed(
        `HTTP ${membersResponse.statusCode} https://api.clubhouse.io/api/v3/members`
      );
      return;
    }
    emailToClubhouseId = members.reduce((e2id, member) => {
      const email = member.profile.email_address;
      const clubhouseId = member.id;
      if (email) {
        e2id.set(email, clubhouseId);
      }
      return e2id;
    }, new Map<string, string>());
    core.debug(`email to Clubhouse ID: ${stringFromMap(emailToClubhouseId)}`);
  } catch (err) {
    core.setFailed(
      `HTTP ${err.statusCode} https://api.clubhouse.io/api/v3/members\n${err.message}`
    );
    return;
  }

  const octokit = new GitHub(GITHUB_TOKEN);
  const userResponse = await octokit.users.getByUsername({
    username: githubUsername,
  });
  const user = userResponse.data;
  if (user.email) {
    return emailToClubhouseId.get(user.email);
  } else {
    core.warning(
      `could not get email address for GitHub user @${githubUsername}`
    );
  }
}

async function getClubhouseProjectId(
  projectName: string,
  http: HttpClient
): Promise<number | undefined> {
  try {
    const projectsResponse = await http.getJson<ClubhouseProject[]>(
      `https://api.clubhouse.io/api/v3/projects?token=${CLUBHOUSE_TOKEN}`
    );
    const projects = projectsResponse.result;
    if (!projects) {
      core.setFailed(
        `HTTP ${projectsResponse.statusCode} https://api.clubhouse.io/api/v3/projects`
      );
      return;
    }
    const projectNameToClubhouseId = projects.reduce((p2id, project) => {
      p2id.set(project.name, project.id);
      return p2id;
    }, new Map<string, number>());
    core.debug(
      `Clubhouse project name to ID: ${stringFromMap(projectNameToClubhouseId)}`
    );

    return projectNameToClubhouseId.get(projectName);
  } catch (err) {
    core.setFailed(
      `HTTP ${err.statusCode} https://api.clubhouse.io/api/v3/projects\n${err.message}`
    );
    return;
  }
}

async function createClubhouseStory(
  payload: WebhookPayloadPullRequest,
  http: HttpClient
): Promise<ClubhouseStory | null> {
  const githubUsername = payload.pull_request.user.login;
  const clubhouseUserId = await getClubhouseUserId(githubUsername, http);
  const clubhouseProjectId = await getClubhouseProjectId(PROJECT_NAME, http);
  if (!clubhouseProjectId) {
    core.setFailed(`Could not find Clubhouse ID for project: ${PROJECT_NAME}`);
    return null;
  }

  const body: ClubhouseCreateStoryBody = {
    name: payload.pull_request.title,
    description: payload.pull_request.body,
    project_id: clubhouseProjectId,
  };
  if (clubhouseUserId) {
    body.owner_ids = [clubhouseUserId];
  }

  try {
    const storyResponse = await http.postJson<ClubhouseStory>(
      `https://api.clubhouse.io/api/v3/stories?token=${CLUBHOUSE_TOKEN}`,
      body
    );
    const story = storyResponse.result;
    if (!story) {
      core.setFailed(
        `HTTP ${
          storyResponse.statusCode
        } https://api.clubhouse.io/api/v3/stories\n${JSON.stringify(body)}`
      );
      return null;
    }
    return storyResponse.result;
  } catch (err) {
    core.setFailed(
      `HTTP ${
        err.statusCode
      } https://api.clubhouse.io/api/v3/stories\n${JSON.stringify(body)}\n${
        err.message
      }`
    );
    return null;
  }
}

async function getClubhouseURLFromPullRequest(
  payload: WebhookPayloadPullRequest
): Promise<string | null> {
  // is there a clubhouse link in the description?
  const results = payload.pull_request.body.match(clubhouseURLRegex);
  if (results) {
    return results[0];
  }

  // what about in the first page of comments?
  const octokit = new GitHub(GITHUB_TOKEN);
  const params = {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.pull_request.number,
  };
  const commentsResponse = await octokit.issues.listComments(params);
  if (commentsResponse.status === 200) {
    const commentWithURL = commentsResponse.data.find((comment) =>
      clubhouseURLRegex.test(comment.body)
    );
    if (commentWithURL) {
      const match = commentWithURL.body.match(clubhouseURLRegex);
      if (match) {
        return match[0];
      }
    }
  } else {
    core.warning(
      `HTTP ${
        commentsResponse.status
      } octokit.issues.listComments(${JSON.stringify(params)})`
    );
  }

  return null;
}

async function addCommentToPullRequest(
  payload: WebhookPayloadPullRequest,
  comment: string
): Promise<boolean> {
  const octokit = new GitHub(GITHUB_TOKEN);
  const params = {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.pull_request.number,
    body: comment,
  };
  const commentResponse = await octokit.issues.createComment(params);
  if (commentResponse.status !== 201) {
    core.setFailed(
      `HTTP ${
        commentResponse.status
      } octokit.issues.createComment(${JSON.stringify(params)})`
    );
    return false;
  }
  return true;
}

async function run(): Promise<void> {
  if (context.eventName !== "pull_request") {
    core.setFailed("This action only works with `pull_request` events");
    return;
  }

  const payload = context.payload as WebhookPayloadPullRequest;
  const clubhouseURL = await getClubhouseURLFromPullRequest(payload);
  if (clubhouseURL) {
    const match = clubhouseURL.match(clubhouseURLRegex);
    if (match) {
      const storyId = match[1];
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
  const comment = `Clubhouse story: ${story.app_url}`;
  await addCommentToPullRequest(payload, comment);
}

run();
