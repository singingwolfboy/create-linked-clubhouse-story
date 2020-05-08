import * as core from "@actions/core";
import { GitHub } from "@actions/github";
import { WebhookPayloadPullRequest } from "@octokit/webhooks";
import { HttpClient } from "@actions/http-client";
import {
  ClubhouseMember,
  ClubhouseProject,
  ClubhouseStory,
  ClubhouseCreateStoryBody,
  ClubhouseUpdateStoryBody,
  ClubhouseWorkflowState,
  ClubhouseTeam,
} from "./types";

export const CLUBHOUSE_STORY_URL_REGEXP = /https:\/\/app.clubhouse.io\/\w+\/story\/(\d+)(\/[A-Za-z0-9-]*)?/;
export const CLUBHOUSE_BRANCH_NAME_REGEXP = /^(?:.+\/)?ch(\d+)(?:\/.+)?$/;

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

export async function getClubhouseUserId(
  githubUsername: string,
  http: HttpClient
): Promise<string | undefined> {
  const USER_MAP_STRING = core.getInput("user-map");
  if (USER_MAP_STRING) {
    try {
      const USER_MAP = JSON.parse(USER_MAP_STRING) as Record<string, string>;
      if (githubUsername in USER_MAP) {
        return USER_MAP[githubUsername];
      }
    } catch (err) {
      core.warning("`user-map` is not valid JSON");
    }
  }

  const CLUBHOUSE_TOKEN = core.getInput("clubhouse-token", {
    required: true,
  });

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

  const GITHUB_TOKEN = core.getInput("github-token", {
    required: true,
  });

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

export async function getClubhouseStoryById(
  id: number | string,
  http: HttpClient
): Promise<ClubhouseStory | null> {
  const CLUBHOUSE_TOKEN = core.getInput("clubhouse-token", {
    required: true,
  });
  try {
    const storyResponse = await http.getJson<ClubhouseStory>(
      `https://api.clubhouse.io/api/v3/stories/${id}?token=${CLUBHOUSE_TOKEN}`
    );
    const story = storyResponse.result;
    if (!story) {
      core.setFailed(
        `HTTP ${storyResponse.statusCode} https://api.clubhouse.io/api/v3/stories/${id}`
      );
    }
    return story;
  } catch (err) {
    core.setFailed(
      `HTTP ${err.statusCode} https://api.clubhouse.io/api/v3/stories/${id}\n${err.message}`
    );
    return null;
  }
}

export async function getClubhouseProject(
  id: number | string,
  http: HttpClient
): Promise<ClubhouseProject | null> {
  const CLUBHOUSE_TOKEN = core.getInput("clubhouse-token", {
    required: true,
  });
  try {
    const projectResponse = await http.getJson<ClubhouseProject>(
      `https://api.clubhouse.io/api/v3/projects/${id}?token=${CLUBHOUSE_TOKEN}`
    );
    return projectResponse.result;
  } catch (err) {
    core.setFailed(
      `HTTP ${err.statusCode} https://api.clubhouse.io/api/v3/projects/${id}\n${err.message}`
    );
    return null;
  }
}

export async function getClubhouseProjectByName(
  projectName: string,
  http: HttpClient
): Promise<ClubhouseProject | undefined> {
  const CLUBHOUSE_TOKEN = core.getInput("clubhouse-token", {
    required: true,
  });
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
    return projects.find((project) => project.name === projectName);
  } catch (err) {
    core.setFailed(
      `HTTP ${err.statusCode} https://api.clubhouse.io/api/v3/projects\n${err.message}`
    );
    return;
  }
}

export async function getClubhouseWorkflowState(
  stateName: string,
  http: HttpClient,
  project: ClubhouseProject
): Promise<ClubhouseWorkflowState | null> {
  const CLUBHOUSE_TOKEN = core.getInput("clubhouse-token", {
    required: true,
  });

  const teamId = project.team_id;

  try {
    const teamResponse = await http.getJson<ClubhouseTeam>(
      `https://api.clubhouse.io/api/v3/teams/${teamId}?token=${CLUBHOUSE_TOKEN}`
    );

    const team = teamResponse.result;
    if (!team) {
      core.setFailed(
        `HTTP ${teamResponse.statusCode} https://api.clubhouse.io/api/v3/teams/${teamId}`
      );
      return null;
    }

    return (
      team.workflow.states.find((state) => state.name === stateName) || null
    );
  } catch (err) {
    core.setFailed(
      `HTTP ${err.statusCode} https://api.clubhouse.io/api/v3/teams/${teamId}\n${err.message}`
    );
    return null;
  }
}

export async function createClubhouseStory(
  payload: WebhookPayloadPullRequest,
  http: HttpClient
): Promise<ClubhouseStory | null> {
  const CLUBHOUSE_TOKEN = core.getInput("clubhouse-token", {
    required: true,
  });
  const PROJECT_NAME = core.getInput("project-name", {
    required: true,
  });
  const STATE_NAME = core.getInput("opened-state-name");

  const githubUsername = payload.pull_request.user.login;
  const clubhouseUserId = await getClubhouseUserId(githubUsername, http);
  const clubhouseProject = await getClubhouseProjectByName(PROJECT_NAME, http);
  if (!clubhouseProject) {
    core.setFailed(`Could not find Clubhouse project: ${PROJECT_NAME}`);
    return null;
  }

  const body: ClubhouseCreateStoryBody = {
    name: payload.pull_request.title,
    description: payload.pull_request.body,
    project_id: clubhouseProject.id,
    external_tickets: [
      {
        external_id: payload.pull_request.id.toString(),
        external_url: payload.pull_request.html_url,
      },
    ],
  };
  if (clubhouseUserId) {
    body.owner_ids = [clubhouseUserId];
  }
  if (STATE_NAME) {
    const workflowState = await getClubhouseWorkflowState(
      STATE_NAME,
      http,
      clubhouseProject
    );
    if (workflowState) {
      body.workflow_state_id = workflowState.id;
    }
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

export function getClubhouseStoryIdFromBranchName(
  branchName: string
): string | null {
  const match = branchName.match(CLUBHOUSE_BRANCH_NAME_REGEXP);
  if (match) {
    return match[1];
  }
  return null;
}

export async function getClubhouseURLFromPullRequest(
  payload: WebhookPayloadPullRequest
): Promise<string | null> {
  const GITHUB_TOKEN = core.getInput("github-token", {
    required: true,
  });

  // is there a clubhouse link in the description?
  const results = payload.pull_request.body.match(CLUBHOUSE_STORY_URL_REGEXP);
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
      CLUBHOUSE_STORY_URL_REGEXP.test(comment.body)
    );
    if (commentWithURL) {
      const match = commentWithURL.body.match(CLUBHOUSE_STORY_URL_REGEXP);
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

export async function addCommentToPullRequest(
  payload: WebhookPayloadPullRequest,
  comment: string
): Promise<boolean> {
  const GITHUB_TOKEN = core.getInput("github-token", {
    required: true,
  });

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

export async function updateClubhouseStoryById(
  id: number | string,
  http: HttpClient,
  body: ClubhouseUpdateStoryBody
): Promise<ClubhouseStory | null> {
  const CLUBHOUSE_TOKEN = core.getInput("clubhouse-token", {
    required: true,
  });
  try {
    const storyResponse = await http.putJson<ClubhouseStory>(
      `https://api.clubhouse.io/api/v3/stories/${id}?token=${CLUBHOUSE_TOKEN}`,
      body
    );
    const story = storyResponse.result;
    if (!story) {
      core.setFailed(
        `HTTP ${storyResponse.statusCode} https://api.clubhouse.io/api/v3/stories/${id}`
      );
    }
    return story;
  } catch (err) {
    core.setFailed(
      `HTTP ${err.statusCode} https://api.clubhouse.io/api/v3/stories/${id}\n${err.message}`
    );
    return null;
  }
}
