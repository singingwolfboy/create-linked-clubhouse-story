# Create Linked Shortcut Story

This is a [GitHub Action](https://github.com/features/actions) that will
automatically create a story on [Shortcut](https://shortcut.com/) when
a pull request is opened, unless the pull request already has a link to
a Shortcut story in the description.

**NOTE**: You must use v2.0+ -- older versions reference "Clubhouse" (former name of Shortcut)

## Basic Usage

[Create a Shortcut API token](https://app.shortcut.com/settings/account/api-tokens),
and store it as an encrypted secret in your GitHub repository settings.
[Check the GitHub documentation for how to create an encrypted secret.](https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets#creating-encrypted-secrets)
Name this secret `SHORTCUT_TOKEN`.

Create a file named `shortcut.yml` in the `.github/workflows` directory of your repository. Put in the following content:

```yaml
on:
  pull_request:
    types: [opened, closed]

jobs:
  shortcut:
    runs-on: ubuntu-latest
    steps:
      - uses: singingwolfboy/create-linked-shortcut-story@v2.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          shortcut-token: ${{ secrets.SHORTCUT_TOKEN }}
          project-name: Engineering
          opened-state-name: Started
          merged-state-name: Done
          closed-state-name: Abandoned
```

The `project-name` variable should contain the name of the Shortcut project
that you want the Shortcut story to be associated with. The
`opened-state-name`, `merged-state-name`, and `closed-state-name` variables
should contain the name of the state that you want the Shortcut story to
be in when the pull request is opened, merged, and closed, respectively.

## Disabled for Built-In Integration

[Shortcut already has an integration with GitHub.](https://help.shortcut.com/hc/en-us/articles/207540323-Using-The-Shortcut-GitHub-Integration)
It works for the opposite use-case, assuming that the Shortcut story exists
_before_ the pull request is created.

This Action will specifically check for branch names that follow the naming
convention for this built-in integration. Any branch name that contains
`ch####` will be ignored by this Action, on the assumption that a Shortcut
story already exists for the pull request. The `ch####` must be separated
from leading or following text with either a `/` or a `-`. So, branches
named `ch1`, `prefix/ch23`, `prefix-ch123`, `ch3456/suffix`, `ch3456-suffux`,
`prefix/ch987/suffix` would match, but `xch123` and `ch987end` would not.

## Customizing the Pull Request Comment

You can customize the comment posted on pull requests using the `comment-template`
variable, like this:

```yaml
- uses: singingwolfboy/create-linked-shortcut-story@v2.0
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    shortcut-token: ${{ secrets.SHORTCUT_TOKEN }}
    project-name: Engineering
    opened-state-name: Started
    merged-state-name: Done
    closed-state-name: Abandoned
    comment-template: >-
      Thanks for the pull request! [I've created a Shortcut story
      for you.]({{{ story.app_url }}})
```

This comment template is processed using the [Mustache](https://mustache.github.io/)
templating system. It receives [the Story object returned from the Shortcut API](https://shortcut.com/api/rest/v3/#Story). Note that you may want to use the
triple mustache syntax to disable HTML escaping.

GitHub will automatically process the comment text as [Markdown](https://guides.github.com/features/mastering-markdown/),
so you can use features like links and images if you make your comment
template output valid Markdown, as shown above.

If you don't provide a comment template, this action will use this comment template
by default: `Shortcut story: {{{ story.app_url }}}`

## Customizing the Shortcut Story Title and Body

You can customize the Shortcut **title** and **description** when creating stories using the `story-title-template` and `story-description-template`
variables, like this:

```yaml
- uses: singingwolfboy/create-linked-shortcut-story@v2.0
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    shortcut-token: ${{ secrets.SHORTCUT_TOKEN }}
    project-name: Engineering
    opened-state-name: Started
    merged-state-name: Done
    closed-state-name: Abandoned
    story-title-template: >-
      {{{ payload.repository.name }}} - {{{ payload.pull_request.title }}}
    story-description-template: >-
      :zap: New story created for pull request [**{{{ payload.pull_request.title }}}**]({{{ payload.pull_request.html_url }}})
      in repo **{{{ payload.repository.name }}}**.
      {{{ #payload.pull_request.body }}}
        The body of the PR is: {{{ payload.pull_request.body }}}
      {{{ /payload.pull_request.body }}}
```

The story title and body templates are processed using the [Mustache](https://mustache.github.io/)
templating system. It receives [the Payload object returned from the GitHub API](https://docs.github.com/en/free-pro-team@latest/developers/webhooks-and-events/webhook-events-and-payloads#pull_request). Note that you may want to use the triple mustache syntax to disable HTML escaping. Also Shortcut supports full Markdown formatting, emojis, and @ mentions. Feel free to use them to your heart's desire. :heart_eyes_cat:

If you don't provide a title or body template, this action will simply use the Pull Request Title (`{{{ payload.pull_request.title }}}`) and Pull Request Body (`{{{ payload.pull_request.body }}}`) by default.

## User Map

This Action does its best to automatically assign the created Shortcut story
to the person who created the GitHub pull request. However, due to limitations
of the GitHub API and the Shortcut API, this will only work automatically
when the GitHub user and the Shortcut user share the same _primary_ email
address. Even though both services allow you to add multiple secondary email
addresses, only the _primary_ email address is exposed in the API.

As a workaround, you can maintain a user map, which teaches this Action how to
map GitHub users to Shortcut users. The user map should be passed in the
`with` section, and due to the limitations of GitHub Actions, must be a JSON
formatted string. Here's an example:

```yaml
- uses: singingwolfboy/create-linked-shortcut-story@v2.0
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    shortcut-token: ${{ secrets.SHORTCUT_TOKEN }}
    project-name: Engineering
    user-map: |
      {
        "octocat": "12345678-9012-3456-7890-123456789012",
        "mona": "01234567-8901-2345-6789-012345678901"
      }
```

The keys of this JSON object must be GitHub usernames, while the values
must be Shortcut UUIDs that identify members. Unfortunately, these UUIDs
are not exposed on the Shortcut website; the best way to look them up is to
[go to the User Directory for your Shortcut workspace](https://app.shortcut.com/settings/users),
open the Developer Tools in your browser, find the API request for
`https://app.shortcut.com/backend/api/private/members`,
and examine the API response to find the `id` for each user.
Note that Shortcut makes a distinction between a `User` and a `Member`:
you need to look up the UUID for the `Member` object.

## Ignored Users

You can also add a list of GitHub users to ignore for this integration by using the `ignored-users` input.
Multiple users should be separated by commas.

```yaml
- uses: singingwolfboy/create-linked-shortcut-story@v2.0
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    shortcut-token: ${{ secrets.SHORTCUT_TOKEN }}
    project-name: Engineering
    ignored-users: hubot, dependabot
```

## Only Users

You can also add a list of GitHub `only-users` for this integration. This works opposite of the ignored users list above. For example, if you wanted only PRs from a specific GitHub user such as dependabot PRs.
Multiple users should be separated by commas.

```yaml
- uses: singingwolfboy/create-linked-shortcut-story@v2.0
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    shortcut-token: ${{ secrets.SHORTCUT_TOKEN }}
    project-name: Engineering
    only-users: dependabot
```

## Iteration Support

Shortcut supports the concept of [iterations](https://help.shortcut.com/hc/en-us/articles/360028953452-Iterations-Overview)
 -- time-boxed periods of development for stories. You can configure this Action
to automatically assign the Shortcut stories it creates to Shortcut iterations,
using GitHub labels and Shortcut groups to identify the correct iteration to use.

In order to use this feature, this Action makes a few assumptions about
the way you use Shortcut and GitHub:

- We assume that each team has an associated [Shortcut group](https://help.shortcut.com/hc/en-us/articles/360039328751-Groups-Group-Management),
  and that Shortcut iterations are associated with this group.
- We assume that the correct iteration to use is the *most recent*
  in-progress iteration for the group, as determined by the "last updated" time.
  (However, you may exclude specific iterations by name.)
- We assume that each team has an associated [GitHub label](https://docs.github.com/en/free-pro-team@latest/github/managing-your-work-on-github/managing-labels),
  and that this label is applied to pull requests consistently.
  (You may do this manually, or use an automated system like the
  [Labeler Action](https://github.com/actions/labeler).)

If you want to use this feature, and you have a different workflow that
does *not* match these assumptions, open a GitHub Issue on this repo
and let's talk about it! Maybe we can find a way to make this Action
support other workflows, as well.

If your workflow is compatible with these assumptions, and you want to use this feature,
first you must modify the [`on` section](https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-syntax-for-github-actions#on)
of your config file to include the
[`labeled` activity type for the `pull_request` event](https://docs.github.com/en/free-pro-team@latest/actions/reference/events-that-trigger-workflows#pull_request).
For example:

```yaml
on:
  pull_request:
    types: [opened, closed, labeled]
```

Next, provide a JSON-formatted string to the `label-iteration-group-map` input.
This is used to map GitHub labels to Shortcut groups. Here is an example:

```yaml
- uses: singingwolfboy/create-linked-shortcut-story@v2.0
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    shortcut-token: ${{ secrets.SHORTCUT_TOKEN }}
    project-name: Engineering
    label-iteration-group-map: |
      {
        "Team Octocat": {
          "groupId": "12345678-9012-3456-7890-123456789012",
          "excludeName": "Backlog"
        },
        "Unicorns": {
          "groupId": "34567890-1234-5678-9012-345678901234"
        }
      }
```

In this example, "Team Octocat" and "Unicorns" are labels on GitHub.
The "groupId" refers to the ID of the Shortcut group that are associated
with these respective teams. The "excludeName" key is optional;
if provided, it is used to exclude specific iterations from consideration.
