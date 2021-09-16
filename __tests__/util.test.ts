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
  delete process.env["INPUT_ONLY-USERS"];
  delete process.env["INPUT_IGNORED-USERS"];
  nock.restore();
});

test("getClubhouseUserId", async () => {
  const chScope = nock("https://api.clubhoust.io")
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
  const scope = nock("https://api.clubhoust.io")
    .get("/api/v3/projects")
    .query(true)
    .reply(200, [{ id: "abc", name: "fake-project" }]);

  const http = new HttpClient();
  const project = await util.getClubhouseProjectByName("fake-project", http);
  expect(project).toEqual({ id: "abc", name: "fake-project" });

  scope.done();
});

test("getClubhouseWorkflowState", async () => {
  const scope = nock("https://api.clubhoust.io")
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

describe("createClubhouseStory", () => {
  let scope: nock.Scope;
  const http = new HttpClient();
  const payload = {
    action: "opened",
    number: 123,
    pull_request: {
      url: "https://api.github.com/repos/octocat/Hello-World/pulls/1347",
      html_url: "https://github.com/octocat/Hello-World/pull/1347",
      id: 1,
      number: 1347,
      state: "open",
      user: {
        login: "octocat",
      },
      title: "Amazing new feature",
      body: "Please pull these awesome changes in!",
    },
    repository: {
      name: "Hello-World",
      owner: {
        login: "octocat",
      },
    },
  };

  beforeEach(() => {
    process.env["INPUT_USER-MAP"] = JSON.stringify({ octocat: "abc" });
    process.env["INPUT_PROJECT-NAME"] = "fake-project";
    process.env["INPUT_STORY-TITLE-TEMPLATE"] =
      "{{{ payload.pull_request.title }}}";
    process.env["INPUT_STORY-DESCRIPTION-TEMPLATE"] =
      "{{{ payload.pull_request.body }}}";

    scope = nock("https://api.clubhoust.io")
      .get("/api/v3/projects")
      .query(true)
      .reply(200, [{ id: "abc", name: "fake-project" }]);
  });

  afterEach(() => {
    delete process.env["INPUT_USER-MAP"];
    delete process.env["INPUT_PROJECT-NAME"];
    delete process.env["INPUT_STORY-TITLE-TEMPLATE"];
    delete process.env["INPUT_STORY-DESCRIPTION-TEMPLATE"];
    scope.done();
  });

  test("with no templates", async () => {
    scope
      .post("/api/v3/stories", (body) => {
        expect(body.name).toEqual("Amazing new feature");
        expect(body.description).toEqual(
          "Please pull these awesome changes in!"
        );
        return true;
      })
      .query(true)
      .reply(200, { id: 1 });
    await util.createClubhouseStory(payload as any, http);
  });

  test("with title template", async () => {
    process.env["INPUT_STORY-TITLE-TEMPLATE"] =
      "{{ payload.repository.name }} - {{ payload.pull_request.title }}";
    scope
      .post("/api/v3/stories", (body) => {
        expect(body.name).toEqual("Hello-World - Amazing new feature");
        expect(body.description).toEqual(
          "Please pull these awesome changes in!"
        );
        return true;
      })
      .query(true)
      .reply(200, { id: 1 });
    await util.createClubhouseStory(payload as any, http);
  });

  test("with description template", async () => {
    process.env[
      "INPUT_STORY-DESCRIPTION-TEMPLATE"
    ] = `:zap: New story created for pull request [**{{{ payload.pull_request.title }}}**]({{{ payload.pull_request.html_url }}}) in repo **{{{ payload.repository.name }}}**.
{{{ #payload.pull_request.body }}}
  The body of the PR is: {{{ payload.pull_request.body }}}
{{{ /payload.pull_request.body }}}`;
    scope
      .post("/api/v3/stories", (body) => {
        expect(body.name).toEqual("Amazing new feature");
        expect(body.description).toEqual(
          `:zap: New story created for pull request [**Amazing new feature**](https://github.com/octocat/Hello-World/pull/1347) in repo **Hello-World**.

  The body of the PR is: Please pull these awesome changes in!
`
        );
        return true;
      })
      .query(true)
      .reply(200, { id: 1 });
    await util.createClubhouseStory(payload as any, http);
  });
});

test.each([
  ["ch1", "1"],
  ["ch89/something", "89"],
  ["ch99-something", "99"],
  ["prefix-1/ch123", "123"],
  ["prefix-1-ch321", "321"],
  ["prefix/ch5678/suffix", "5678"],
  ["prefix-ch6789/suffix-more", "6789"],
  ["prefix/ch7890-suffix", "7890"],
  ["prefix-ch0987-suffix-extra", "0987"],
])("getClubhouseStoryIdFromBranchName matches %s", (branch, expected) => {
  const id = util.getClubhouseStoryIdFromBranchName(branch);
  expect(id).toEqual(expected);
});

test.each(["prefix/ch8765+suffix", "ch554X", "ach8765", "this_ch1234"])(
  "getClubhouseStoryIdFromBranchName does not match %s",
  (branch) => {
    const id = util.getClubhouseStoryIdFromBranchName(branch);
    expect(id).toBeNull();
  }
);

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
      body: "Clubhouse story: https://app.shortcut.com/org/story/12345",
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
  expect(url).toEqual("https://app.shortcut.com/org/story/12345");
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
      { body: "Clubhouse story: https://app.shortcut.com/org/story/12345" },
    ]);

  const url = await util.getClubhouseURLFromPullRequest(payload as any);
  expect(url).toEqual("https://app.shortcut.com/org/story/12345");

  scope.done();
});

test("shouldProcessPullRequestForUser user lists not defined", async () => {
  expect(util.shouldProcessPullRequestForUser("fake-user-1")).toBeTruthy();
});

test("shouldProcessPullRequestForUser user in both lists", async () => {
  const author = "fake-user-1";
  process.env["INPUT_ONLY-USERS"] = `${author}, fake-user-2`;
  process.env["INPUT_IGNORED-USERS"] = `${author}, fake-user-3`;
  expect(() => util.shouldProcessPullRequestForUser(author)).toThrowError(
    `PR author ${author} is defined in both ignored-users and only-users lists. Cancelling Clubhouse workflow...`
  );
});

test("shouldProcessPullRequestForUser both lists defined", async () => {
  process.env["INPUT_ONLY-USERS"] = "fake-user-1, fake-user-2";
  process.env["INPUT_IGNORED-USERS"] = "fake-user-3, fake-user-4";
  expect(() => {
    util.shouldProcessPullRequestForUser("fake-user-2");
  }).toBeTruthy();
});

const usersTestCases = [
  // [author, userList, expectedResult, userListType]
  ["fake-user-1", "fake-user-2", "false", "INPUT_ONLY-USERS"],
  ["fake-user-2", "fake-user-2", "true", "INPUT_ONLY-USERS"],
  ["fake-user-1", "fake-user-2, fake-user-3", "false", "INPUT_ONLY-USERS"],
  ["fake-user-2", "fake-user-2, fake-user-3", "true", "INPUT_ONLY-USERS"],
  ["fake-user-1", "fake-user-2", "true", "INPUT_IGNORED-USERS"],
  ["fake-user-2", "fake-user-2", "false", "INPUT_IGNORED-USERS"],
  ["fake-user-1", "fake-user-2, fake-user-3", "true", "INPUT_IGNORED-USERS"],
  ["fake-user-2", "fake-user-2, fake-user-3", "false", "INPUT_IGNORED-USERS"],
];

describe("shouldProcessPullRequestForUser", () => {
  test.each(usersTestCases)(
    "for author %p and list %p, returns %p for input type %p",
    (user, userList, expectedResult, inputListType) => {
      process.env[inputListType] = userList;
      const result = util.shouldProcessPullRequestForUser(user);
      if (expectedResult === "true") {
        expect(result).toBeTruthy();
      } else if (expectedResult === "false") {
        expect(result).toBeFalsy();
      }
    }
  );
});

describe("getLatestMatchingClubhouseIteration", () => {
  test("happy path", async () => {
    const scope = nock("https://api.clubhoust.io")
      .get("/api/v3/iterations")
      .query(true)
      .reply(200, [
        {
          id: 1,
          name: "abc",
          status: "started",
          group_ids: ["123"],
          updated_at: "2020-01-01T12:00:00",
        },
      ]);

    const iterationInfo = { groupId: "123" };
    const http = new HttpClient();
    const result = await util.getLatestMatchingClubhouseIteration(
      iterationInfo,
      http
    );
    expect(result).toBeTruthy();
    expect(result!.id).toEqual(1);
  });

  test("no iterations", async () => {
    const scope = nock("https://api.clubhoust.io")
      .get("/api/v3/iterations")
      .query(true)
      .reply(200, []);

    const iterationInfo = { groupId: "123" };
    const http = new HttpClient();
    const result = await util.getLatestMatchingClubhouseIteration(
      iterationInfo,
      http
    );
    expect(result).toBeUndefined();
  });

  test("matching unstarted iteration", async () => {
    const scope = nock("https://api.clubhoust.io")
      .get("/api/v3/iterations")
      .query(true)
      .reply(200, [
        {
          id: 1,
          name: "abc",
          status: "unstarted",
          group_ids: ["123"],
          updated_at: "2020-01-01T12:00:00",
        },
      ]);

    const iterationInfo = { groupId: "123" };
    const http = new HttpClient();
    const result = await util.getLatestMatchingClubhouseIteration(
      iterationInfo,
      http
    );
    expect(result).toBeUndefined();
  });

  test("multiple matches", async () => {
    const scope = nock("https://api.clubhoust.io")
      .get("/api/v3/iterations")
      .query(true)
      .reply(200, [
        {
          id: 1,
          name: "abc",
          status: "started",
          group_ids: ["123"],
          updated_at: "2020-01-01T12:00:00",
        },
        {
          id: 2,
          name: "def",
          status: "started",
          group_ids: ["123"],
          updated_at: "2020-01-02T12:00:00",
        },
        {
          id: 3,
          name: "hij",
          status: "started",
          group_ids: ["123"],
          updated_at: "2020-01-03T12:00:00",
        },
        {
          id: 4,
          name: "klm",
          status: "started",
          group_ids: [],
          updated_at: "2020-01-04T12:00:00",
        },
      ]);

    const iterationInfo = { groupId: "123" };
    const http = new HttpClient();
    const result = await util.getLatestMatchingClubhouseIteration(
      iterationInfo,
      http
    );
    expect(result).toBeTruthy();
    expect(result!.id).toEqual(3);
  });

  test("excludes", async () => {
    const scope = nock("https://api.clubhoust.io")
      .get("/api/v3/iterations")
      .query(true)
      .reply(200, [
        {
          id: 1,
          name: "abc",
          status: "started",
          group_ids: ["123"],
          updated_at: "2020-01-01T12:00:00",
        },
        {
          id: 2,
          name: "def",
          status: "started",
          group_ids: ["123"],
          updated_at: "2020-01-02T12:00:00",
        },
        {
          id: 3,
          name: "hij",
          status: "started",
          group_ids: ["123"],
          updated_at: "2020-01-03T12:00:00",
        },
        {
          id: 4,
          name: "klm",
          status: "started",
          group_ids: [],
          updated_at: "2020-01-04T12:00:00",
        },
      ]);

    const iterationInfo = { groupId: "123", excludeName: "hij" };
    const http = new HttpClient();
    const result = await util.getLatestMatchingClubhouseIteration(
      iterationInfo,
      http
    );
    expect(result).toBeTruthy();
    expect(result!.id).toEqual(2);
  });
});
