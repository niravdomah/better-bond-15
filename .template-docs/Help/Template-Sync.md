# Template Sync

Keep your project up to date with the latest template improvements, bug fixes, and security patches. When you trigger a sync, the workflow opens a pull request in your repo containing any new changes from the template.

---

## How It Works

1. You click **Run workflow** on the `Sync from Template` action (see "Triggering a sync" below).
2. The workflow reads the template source (by default `stadium-software/stadium-8`), compares it to your repo, and filters out anything listed in your `.templatesyncignore`.
3. If there are changes, a pull request is created with the label `template-sync`.
4. You review the PR, resolve any conflicts, and merge when you're ready.

If there's nothing to sync, no PR is created and the workflow finishes quietly.

> **v1 is manual-only.** Automated weekly syncs may be added in a future version. For now, trigger a sync whenever you want to check for template updates.

---

## Setup

You need to add one secret to your repo: a fine-grained Personal Access Token (PAT) with read access to the template source.

**Step 1: Generate a fine-grained PAT**

1. Go to [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
2. **Token name:** anything memorable (e.g. `template-sync for my-project`).
3. **Expiration:** as long as your org's policy allows, up to 1 year. Avoid "no expiration" — expiry is a helpful prompt to re-confirm you still need access.
4. **Resource owner:** `stadium-software`.
5. **Repository access → Only select repositories:** pick `stadium-software/stadium-8`.
6. **Permissions → Repository permissions → Contents:** set to `Read-only`. Leave everything else at "No access".
7. Click **Generate token** and copy the token value — you won't be able to see it again.

**Step 2: Add the token as a repo secret**

1. In your repo, go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret**.
3. **Name:** `TEMPLATE_SYNC_PAT`
4. **Secret:** paste the token value from Step 1.
5. Click **Add secret**.

**Step 3: Allow GitHub Actions to create pull requests**

The sync workflow opens a PR with the template changes. By default, many GitHub orgs disallow `GITHUB_TOKEN` from creating PRs — so without this step you'll see an error like `GitHub Actions is not permitted to create or approve pull requests` when the workflow runs.

1. In your repo, go to **Settings → Actions → General**.
2. Scroll down to **Workflow permissions**.
3. Tick **Allow GitHub Actions to create and approve pull requests**.
4. Click **Save**.

If the checkbox is greyed out, your org has the setting locked at the organization level. Ask your org admin to enable it under **Organization Settings → Actions → General → Workflow permissions**.

That's it. Head to "Triggering a sync" below.

### Syncing from a different template source

This repo is pre-configured to sync from the template source it was created from. If you want to sync from the other channel instead, follow these steps.

The two channels are:

- **Release (`Digiata/Stadium-8`)** — stable, recommended for production projects.
- **Dev-build (`stadium-software/stadium-8`)** — ⚠️ latest unreleased changes, may be unstable. Use only if you're specifically testing template changes before they ship.

**To switch channels:**

1. Generate a PAT following the setup above, but in Step 1.4 and Step 1.5 pick the source you want to sync from.
2. In **Settings → Secrets and variables → Actions → Variables**, click **New repository variable** and add:
   - **Name:** `TEMPLATE_SOURCE_REPO`
   - **Value:** the `<owner>/<repo>` you picked (e.g. `Digiata/Stadium-8` or `stadium-software/stadium-8`)

---

## Triggering a sync

1. In your repo on GitHub, go to **Actions → Sync from Template**.
2. Click **Run workflow**.
3. Pick the branch (usually `main`) and click **Run workflow**.
4. Wait a minute or two. If there are changes, a PR labelled `template-sync` will appear.

You can trigger a sync as often as you like. There's no scheduled run — you're in control of when to check for updates.

---

## What Gets Synced

The `.templatesyncignore` file controls which files are skipped. By default:

| Synced (auto-updated) | Not synced (your territory) |
|---|---|
| `.claude/` agents, commands, hooks, scripts | `web/` (your application code) |
| `.github/` scripts, issue templates, etc. | `.github/workflows/` (manual — see below) |
| `.template-docs/` guides and help docs | `documentation/` (your specs) |
| Root config (`CLAUDE.md`, `.gitignore`, etc.) | `generated-docs/` (your generated output) |
| | `.env` files, IDE settings, your `/README.md` |

For `web/` changes, review the `CHANGELOG.md` included in the sync PR to understand what changed and apply updates manually.

### Workflow files require manual updates

Files under `.github/workflows/` are intentionally excluded from automatic sync. This isn't a limitation of the template — it's a hardcoded GitHub security policy: the default `GITHUB_TOKEN` (used by the sync workflow to push changes back to your repo) is not permitted to create or modify workflow files. The reasoning is that this prevents a compromised workflow from rewriting other workflows on the repo to escalate privileges.

Workflow updates are rare (these files are stable and don't change often). When the template does ship a workflow change, here's how to pick it up:

1. Open the template repo (`stadium-software/stadium-8` or `Digiata/Stadium-8`) on GitHub.
2. Navigate to `.github/workflows/` and open the file that has changed (e.g. `sync-template.yml`).
3. Click **Raw** to see the unformatted content, then copy everything.
4. In your own repo, open the same file in your editor and paste the new content over the existing version.
5. Commit and push. (You'll need write access to your own repo, which you presumably already have.)

This restriction will go away once the sync mechanism moves to a GitHub-App-based setup in a future release — GitHub Apps can be granted explicit `workflows: write` permission, which `GITHUB_TOKEN` cannot.

---

## Reviewing Sync PRs

Sync PRs may include:

- Updated agent definitions or workflow improvements
- New or improved quality gate checks
- Security patches to CI/CD workflows
- Documentation updates

Review the PR diff carefully. If there are merge conflicts, resolve them in favour of whichever version is correct for your project.

---

## Troubleshooting

### I see an issue titled "Template sync: action required"

The workflow opens this issue automatically when it can't run. The body explains which cause applies:

1. **No credentials configured.** You haven't set `TEMPLATE_SYNC_PAT`. Follow the setup steps above.
2. **Template source unreachable.** The workflow couldn't read the template source. Most often this means your `TEMPLATE_SYNC_PAT` is expired, invalid, or doesn't have access to the source — generate a fresh PAT and update the secret. Less commonly it can be a transient GitHub issue (retry in a few minutes) or the source repo has been renamed (check your `TEMPLATE_SOURCE_REPO` variable if you set one).

Once you've resolved the cause, close the issue and click **Run workflow** again.

The workflow will only open **one** such issue per repo at a time — while an action-required issue is already open, subsequent failed runs update the body in place instead of creating a new issue or stacking comments.

### Workflow runs but no PR is created

Most likely your repo is already up to date with the template — no action needed. But if you've previously had a sync run that failed *after* pushing a branch (most often because the "Allow GitHub Actions to create and approve pull requests" toggle hadn't been enabled yet — see Setup Step 3), the action may be detecting that orphaned branch and exiting early on subsequent runs. The workflow log will show a message like:

> `::warn::Git branch 'chore/template_sync_<hash>' exists in the remote repository`

To recover, either:

- **Open the PR manually from the existing branch.** Go to your repo's **Branches** tab, find the `chore/template_sync_<hash>` branch, and click **New pull request** next to it. The branch already has the synced changes — you just need to open the PR.
- **Delete the orphaned branch and re-run.** Cleaner if you'd prefer a fresh end-to-end run. Delete the branch from the **Branches** tab, then click **Run workflow** on Sync from Template again.

### PR has merge conflicts

The sync found changes in files you've also modified. Review each conflict and keep the version that's correct for your project.

### Workflow doesn't run at all

The sync workflow has a guard condition that skips the template source repos (`stadium-software/stadium-8` and `Digiata/Stadium-8`). It only runs in repos created from the template. If you're testing in one of those repos, use a separate test repo instead.

---

## Migrating from the old SSH-based setup

If your repo was set up against an earlier version of this workflow that used SSH authentication, you can safely remove the old `TEMPLATE_SSH_PRIVATE_KEY` secret — it's no longer referenced by the workflow. Go to **Settings → Secrets and variables → Actions** and delete it.
