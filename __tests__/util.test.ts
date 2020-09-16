import nock from "nock";
import { HttpClient } from "@actions/http-client";
import * as process from "process";
import * as util from "../src/util";

/* eslint-disable @typescript-eslint/no-explicit-any */

beforeEach(() => {
  process.env["INPUT_CLUBHOUSE-TOKEN"] = "fake-clubhouse-token";
  process.env["INPUT_GITHUB-TOKEN"] = "fake-github-token";
  process.env["INPUT_PROJECT-NAME"] = "fake-project";
  if (!nock.isActive()) {
    nock.activate();
  }
});

afterEach(() => {
  delete process.env["INPUT_CLUBHOUSE-TOKEN"];
  delete process.env["INPUT_GITHUB-TOKEN"];
  delete process.env["INPUT_PROJECT-NAME"];
  nock.restore();
});

test("getClubhouseUserId", async () => {
  const chScope = nock("https://api.clubhouse.io")
    .get("/api/v3/members")
    .query(true)
    .reply(200, [
      { id: "abc", profile: { email_address: "octocat@github.com" } },
    ]);
  const ghScope = nock("https://api.github.com")
    .get("/users/octocat")
    .reply(200, { email: "octocat@github.com" });

  const http = new HttpClient();
  const chId = await util.getClubhouseUserId("octocat", http);
  expect(chId).toEqual("abc");

  chScope.done();
  ghScope.done();
});

test("getClubhouseUserId user-map", async () => {
  const USER_MAP = { octocat: "abc" };
  process.env["INPUT_USER-MAP"] = JSON.stringify(USER_MAP);

  const http = new HttpClient();
  const chId = await util.getClubhouseUserId("octocat", http);
  expect(chId).toEqual("abc");

  delete process.env["INPUT_USER-MAP"];
});

test("getClubhouseProjectByName", async () => {
  const scope = nock("https://api.clubhouse.io")
    .get("/api/v3/projects")
    .query(true)
    .reply(200, [{ id: "abc", name: "fake-project" }]);

  const http = new HttpClient();
  const project = await util.getClubhouseProjectByName("fake-project", http);
  expect(project).toEqual({ id: "abc", name: "fake-project" });

  scope.done();
});

test("getClubhouseWorkflowState", async () => {
  const scope = nock("https://api.clubhouse.io")
    .get("/api/v3/teams/123")
    .query(true)
    .reply(200, {
      id: 123,
      name: "fake-team",
      workflow: {
        name: "fake-workflow",
        states: [
          { name: "Plan", type: "unstarted" },
          { name: "Execute", type: "started" },
          { name: "Finished", type: "done" },
          { name: "Aborted", type: "done" },
        ],
      },
    });

  const http = new HttpClient();
  const project = { name: "fake-team", team_id: 123 };
  const workflowState = await util.getClubhouseWorkflowState(
    "Finished",
    http,
    project as any
  );
  expect(workflowState).toEqual({ name: "Finished", type: "done" });

  scope.done();
});

test("getClubhouseStoryIdFromBranchName matching", () => {
  [["ch1", "1"], 
    ["ch89/something", "89"], 
    ["ch99-something", "99"],
    ["prefix-1/ch123", "123"],
    ["prefix-1-ch321", "321"],
    ["prefix/ch5678/suffix", "5678"],
    ["prefix-ch6789/suffix-more", "6789"],
    ["prefix/ch7890-suffix", "7890"],
    ["prefix-ch0987-suffix-extra", "0987"]].forEach(item => {
    const id = util.getClubhouseStoryIdFromBranchName(item[0]);
    expect(id).toEqual(item[1]);
  });
});

test("getClubhouseStoryIdFromBranchName non-matching", () => {
  ["prefix/ch8765+suffix", "ch554X", "ach8765", "this_ch1234"].forEach(branch => {
    const id = util.getClubhouseStoryIdFromBranchName(branch);
    expect(id).toBeNull();
  })
});

test("getClubhouseURLFromPullRequest", async () => {
  const payload = {
    pull_request: {
      body: "no url here!",
      number: 123,
    },
    repository: {
      owner: {
        login: "octocat",
      },
      name: "example",
    },
  };

  const scope = nock("https://api.github.com")
    .get("/repos/octocat/example/issues/123/comments")
    .reply(200, [{ body: "no url here, either!" }]);

  const url = await util.getClubhouseURLFromPullRequest(payload as any);
  expect(url).toBeNull();

  scope.done();
});

test("getClubhouseURLFromPullRequest desc", async () => {
  const payload = {
    pull_request: {
      body: "Clubhouse story: https://app.clubhouse.io/org/story/12345",
      number: 123,
    },
    repository: {
      owner: {
        login: "octocat",
      },
      name: "example",
    },
  };

  const url = await util.getClubhouseURLFromPullRequest(payload as any);
  expect(url).toEqual("https://app.clubhouse.io/org/story/12345");
});

test("getClubhouseURLFromPullRequest comment", async () => {
  const payload = {
    pull_request: {
      body: "no url here!",
      number: 123,
    },
    repository: {
      owner: {
        login: "octocat",
      },
      name: "example",
    },
  };

  const scope = nock("https://api.github.com")
    .get("/repos/octocat/example/issues/123/comments")
    .reply(200, [
      { body: "no url here, either!" },
      { body: "Clubhouse story: https://app.clubhouse.io/org/story/12345" },
    ]);

  const url = await util.getClubhouseURLFromPullRequest(payload as any);
  expect(url).toEqual("https://app.clubhouse.io/org/story/12345");

  scope.done();
});
