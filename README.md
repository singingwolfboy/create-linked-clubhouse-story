# Create Linked Clubhouse Story

This is a [GitHub Action](https://github.com/features/actions) that will
automatically create a story on [Clubhouse](https://clubhouse.io/) when
a pull request is opened, unless the pull request already has a link to
a Clubhouse story in the description.

## Basic Usage

[Create a Clubhouse API token](https://app.clubhouse.io/settings/account/api-tokens),
and store it as an encrypted secret in your GitHub repository settings.
[Check the GitHub documentation for how to create an encrypted secret.](https://help.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets#creating-encrypted-secrets).
Name this secret `CLUBHOUSE_TOKEN`.

Create a file named `clubhouse-create.yml` in the `.github/workflows` directory of your repository. Put in the following content:

```yaml
on:
  pull_request:
    types: [opened]

jobs:
  clubhouse-create:
    runs-on: ubuntu-latest
    steps:
      - uses: singingwolfboy/create-linked-clubhouse-story@master
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          clubhouse-token: ${{ secrets.CLUBHOUSE_TOKEN }}
          project-name: Engineering
```

The `project-name` variable should contain the name of the Clubhouse project
that you want the Clubhouse story to be associated with.
