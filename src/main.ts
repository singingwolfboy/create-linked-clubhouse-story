import { getInput, setOutput, setFailed, debug } from "@actions/core";
import { GitHub, context } from "@actions/github";
import { WebhookPayloadPullRequest } from "@octokit/webhooks";
import { HttpClient } from "@actions/http-client";
import { ClubhouseMember, ClubhouseProject, ClubhouseStory } from "./types";

const clubhouseURLRegex = /https:\/\/app.clubhouse.io\/\w+\/story\/(\d+)\/[A-Za-z0-9-]*/;

async function getClubhouseUserId(
  githubUsername: string,
  http: HttpClient
): Promise<string | undefined> {
  const CLUBHOUSE_TOKEN: string = getInput("clubhouse-token");
  const GITHUB_TOKEN: string = getInput("github-token");

  const membersResponse = await http.getJson<ClubhouseMember[]>(
    `https://api.clubhouse.io/api/v3/members?token=${CLUBHOUSE_TOKEN}`
  );
  if (!membersResponse.result) {
    setFailed("Clubhouse API failure: /members");
    return;
  }
  const emailToClubhouseId = membersResponse.result.reduce((e2id, member) => {
    const email = member.profile.email_address;
    const clubhouseId = member.id;
    if (email) {
      e2id.set(email, clubhouseId);
    }
    return e2id;
  }, new Map<string, string>());
  debug(JSON.stringify(emailToClubhouseId));

  const octokit = new GitHub(GITHUB_TOKEN);
  const userResponse = await octokit.users.getByUsername({
    username: githubUsername,
  });
  const user = userResponse.data;
  if (user.email) {
    return emailToClubhouseId.get(user.email);
  }
}

async function getClubhouseProjectId(
  projectName: string,
  http: HttpClient
): Promise<number | undefined> {
  const CLUBHOUSE_TOKEN: string = getInput("clubhouse-token");

  const projectsResponse = await http.getJson<ClubhouseProject[]>(
    `https://api.clubhouse.io/api/v3/projects?token=${CLUBHOUSE_TOKEN}`
  );
  if (!projectsResponse.result) {
    setFailed("Clubhouse API failure: /projects");
    return;
  }
  const projectNameToClubhouseId = projectsResponse.result.reduce(
    (p2id, project) => {
      p2id.set(project.name, project.id);
      return p2id;
    },
    new Map<string, number>()
  );
  debug(JSON.stringify(projectNameToClubhouseId));

  return projectNameToClubhouseId.get(projectName);
}

async function createClubhouseStory(
  payload: WebhookPayloadPullRequest,
  http: HttpClient
): Promise<ClubhouseStory | null> {
  const CLUBHOUSE_TOKEN: string = getInput("clubhouse-token");
  const PROJECT_NAME: string = getInput("project-name");
  const githubUsername = payload.pull_request.user.login;
  const clubhouseUserId = await getClubhouseUserId(githubUsername, http);
  const clubhouseProjectId = await getClubhouseProjectId(PROJECT_NAME, http);

  const storyResponse = await http.postJson<ClubhouseStory>(
    `https://api.clubhouse.io/api/v3/stories?token=${CLUBHOUSE_TOKEN}`,
    {
      name: payload.pull_request.title,
      description: payload.pull_request.body,
      owner_ids: [clubhouseUserId],
      project_id: clubhouseProjectId,
    }
  );
  if (storyResponse.statusCode !== 200) {
    setFailed("Clubhouse API failure: /stories");
    return null;
  }
  return storyResponse.result;
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
  const GITHUB_TOKEN: string = getInput("github-token");
  const octokit = new GitHub(GITHUB_TOKEN);
  const commentsResponse = await octokit.issues.listComments({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.pull_request.number,
  });
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
  }

  return null;
}

async function addCommentToPullRequest(
  payload: WebhookPayloadPullRequest,
  comment: string
): Promise<boolean> {
  const GITHUB_TOKEN: string = getInput("github-token");
  const octokit = new GitHub(GITHUB_TOKEN);
  const commentResponse = await octokit.issues.createComment({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.pull_request.number,
    body: comment,
  });
  if (commentResponse.status !== 200) {
    setFailed("GitHub API failure: create comment");
    return false;
  }
  return true;
}

async function run(): Promise<void> {
  if (context.eventName !== "pull_request") {
    debug("This action only works with `pull_request` events");
    return;
  }
  const payload = context.payload as WebhookPayloadPullRequest;
  try {
    const clubhouseURL = await getClubhouseURLFromPullRequest(payload);
    if (clubhouseURL) {
      const match = clubhouseURL.match(clubhouseURLRegex);
      if (match) {
        const storyId = match[1];
        setOutput("story-id", storyId);
      }
      return;
    }

    const http = new HttpClient();
    const story = await createClubhouseStory(payload, http);
    if (!story) {
      return;
    }
    setOutput("story-id", story.id.toString());
    const url = `https://app.clubhouse.io/nylas/story/${story.id}/`;
    const comment = `Clubhouse story: ${url}`;
    await addCommentToPullRequest(payload, comment);
  } catch (error) {
    setFailed(error.message);
  }
}

run();
