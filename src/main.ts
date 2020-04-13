import { getInput, setOutput, setFailed, debug } from "@actions/core";
import { GitHub, context } from "@actions/github";
import { WebhookPayloadPullRequest } from "@octokit/webhooks";
import { HttpClient } from "@actions/http-client";
import { ClubhouseMember, ClubhouseProject, ClubhouseStory } from "./types";

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

async function run(): Promise<void> {
  if (context.eventName !== "pull_request") {
    debug("This action only works with `pull_request` events");
    return;
  }
  const payload = context.payload as WebhookPayloadPullRequest;
  try {
    const http = new HttpClient();
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
    if (!storyResponse.result) {
      setFailed("Clubhouse API failure: /stories");
      return;
    }
    setOutput("story-id", storyResponse.result.id.toString());
  } catch (error) {
    setFailed(error.message);
  }
}

run();
