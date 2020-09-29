# Create Linked Clubhouse Story

This is a [GitHub Action](https://github.com/features/actions) that will
automatically create a story on [Clubhouse](https://clubhouse.io/) when
a pull request is opened, unless the pull request already has a link to
a Clubhouse story in the description.

## Basic Usage

[Create a Clubhouse API token](https://app.clubhouse.io/settings/account/api-tokens),
and store it as an encrypted secret in your GitHub repository settings.
[Check the GitHub documentation for how to create an encrypted secret.](https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets#creating-encrypted-secrets)
Name this secret `CLUBHOUSE_TOKEN`.

Create a file named `clubhouse.yml` in the `.github/workflows` directory of your repository. Put in the following content:

```yaml
on:
  pull_request:
    types: [opened, closed]

jobs:
  clubhouse:
    runs-on: ubuntu-latest
    steps:
      - uses: singingwolfboy/create-linked-clubhouse-story@v1.5
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          clubhouse-token: ${{ secrets.CLUBHOUSE_TOKEN }}
          project-name: Engineering
          opened-state-name: Started
          merged-state-name: Done
          closed-state-name: Abandoned
```

The `project-name` variable should contain the name of the Clubhouse project
that you want the Clubhouse story to be associated with. The
`opened-state-name`, `merged-state-name`, and `closed-state-name` variables
should contain the name of the state that you want the Clubhouse story to
be in when the pull request is opened, merged, and closed, respectively.

## Disabled for Built-In Integration

[Clubhouse already has an integration with GitHub.](https://help.clubhouse.io/hc/en-us/articles/207540323-Using-The-Clubhouse-GitHub-Integration)
It works for the opposite use-case, assuming that the Clubhouse story exists
_before_ the pull request is created.

This Action will specifically check for branch names that follow the naming
convention for this built-in integration. Any branch name that contains
`ch####` will be ignored by this Action, on the assumption that a Clubhouse
story already exists for the pull request. The `ch####` must be separated
from leading or following text with either a `/` or a `-`. So, branches
named `ch1`, `prefix/ch23`, `prefix-ch123`, `ch3456/suffix`, `ch3456-suffux`,
`prefix/ch987/suffix` would match, but `xch123` and `ch987end` would not.

## Customizing the Pull Request Comment

You can customize the comment posted on pull requests using the `comment-template`
variable, like this:

```yaml
- uses: singingwolfboy/create-linked-clubhouse-story@v1.5
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    clubhouse-token: ${{ secrets.CLUBHOUSE_TOKEN }}
    project-name: Engineering
    opened-state-name: Started
    merged-state-name: Done
    closed-state-name: Abandoned
    comment-template: >-
      Thanks for the pull request! [I've created a Clubhouse story
      for you.]({{{ story.app_url }}})
```

This comment template is processed using the [Mustache](https://mustache.github.io/)
templating system. It receives [the Story object returned from the Clubhouse API](https://clubhouse.io/api/rest/v3/#Story). Note that you may want to use the
triple mustache syntax to disable HTML escaping.

GitHub will automatically process the comment text as [Markdown](https://guides.github.com/features/mastering-markdown/),
so you can use features like links and images if you make your comment
template output valid Markdown, as shown above.

If you don't provide a comment template, this action will use this comment template
by default: `Clubhouse story: {{{ story.app_url }}}`

## Customizing the Clubhouse Story Title and Body

You can customize the Clubhouse **title** or **body** when creating stories using the `clubhouse-story-title-template` and `clubhouse-story-body-template`
variables, like this:

```yaml
- uses: singingwolfboy/create-linked-clubhouse-story@v1.7
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    clubhouse-token: ${{ secrets.CLUBHOUSE_TOKEN }}
    project-name: Engineering
    opened-state-name: Started
    merged-state-name: Done
    closed-state-name: Abandoned
    clubhouse-story-title-template: >-
      {{{ payload.repository.name }}} - {{{ payload.pull_request.title }}} 
    clubhouse-story-body-template: >-
      :zap: New story created for pull request [**{{{ payload.pull_request.title }}}**]({{{ payload.pull_request.html }}}) in repo **{{{ payload.repository.name }}}**. The body of the PR is: 
      {{{ payload.pull_request.body }}}
```

The story title and body templates are processed using the [Mustache](https://mustache.github.io/)
templating system. It receives [the Payload object returned from the GitHub API](https://docs.github.com/en/free-pro-team@latest/developers/webhooks-and-events/webhook-events-and-payloads#pull_request). Note that you may want to use the triple mustache syntax to disable HTML escaping. Also Clubhouse supports full Markdown formatting, emojis, and @ mentions. Feel free to use them to your heart's desire. :heart_eyes_cat:

If you don't provide a title or body template, this action will simply use the Pull Request Title (`{{{ payload.pull_request.title }}}`) and Pull Request Body (`{{{ payload.pull_request.body }}}`) by default.  

## User Map

This Action does its best to automatically assign the created Clubhouse story
to the person who created the GitHub pull request. However, due to limitations
of the GitHub API and the Clubhouse API, this will only work automatically
when the GitHub user and the Clubhouse user share the same _primary_ email
address. Even though both services allow you to add multiple secondary email
addresses, only the _primary_ email address is exposed in the API.

As a workaround, you can maintain a user map, which teaches this Action how to
map GitHub users to Clubhouse users. The user map should be passed in the
`with` section, and due to the limitations of GitHub Actions, must be a JSON
formatted string. Here's an example:

```yaml
- uses: singingwolfboy/create-linked-clubhouse-story@v1.5
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    clubhouse-token: ${{ secrets.CLUBHOUSE_TOKEN }}
    project-name: Engineering
    user-map: |
      {
        "octocat": "12345678-9012-3456-7890-123456789012",
        "mona": "01234567-8901-2345-6789-012345678901"
      }
```

The keys of this JSON object must be GitHub usernames, while the values
must be Clubhouse UUIDs that identify members. Unfortunately, these UUIDs
are not exposed on the Clubhouse website; the best way to look them up is to
[go to the User Directory for your Clubhouse workspace](https://app.clubhouse.io/settings/users),
open the Developer Tools in your browser, find the API request for
`https://app.clubhouse.io/backend/api/private/members`,
and examine the API response to find the `id` for each user.
Note that Clubhouse makes a distinction between a `User` and a `Member`:
you need to look up the UUID for the `Member` object.

## Ignored Users

You can also add a list of GitHub users to ignore for this integration by using the `ignored-users` input.
Multiple users should be separated by commas.

```yaml
- uses: singingwolfboy/create-linked-clubhouse-story@v1.5
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    clubhouse-token: ${{ secrets.CLUBHOUSE_TOKEN }}
    project-name: Engineering
    ignored-users: hubot, dependabot
```

## Only Users

You can also add a list of GitHub `only-users` for this integration. This works opposite of the ignored users list above. For example, if you wanted only PRs from a specific GitHub user such as dependabot PRs. 
Multiple users should be separated by commas.

```yaml
- uses: singingwolfboy/create-linked-clubhouse-story@v1.4
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    clubhouse-token: ${{ secrets.CLUBHOUSE_TOKEN }}
    project-name: Engineering
    only-users: dependabot
```
