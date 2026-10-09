---
title: Version Control
description: Commit OpenPencil documents to a GitHub repository as reviewable JSON, work on branches with pull requests, comment on the canvas through GitHub issues, and resolve concurrent edits.
---

# Version Control

OpenPencil can keep a document in a GitHub repository. Each save is one commit on the configured branch, and the repository holds a folder of plain JSON files that review and diff like code.

## Set up

Open **Settings → Version control**.

1. **Sign in.** If the hosted editor itself asked you to sign in with GitHub, you are already signed in here. Otherwise, in the hosted web app choose **Sign in with GitHub**. In the desktop app or in local development, open **Use a personal access token instead** and paste a [fine-grained token](https://github.com/settings/personal-access-tokens/new) for the repository with **Contents: read and write** (add **Pull requests** and **Issues: read and write** for branches, pull requests and comments). Either is kept in the system credential store on desktop. In a browser it lasts for the session unless **Settings → General → Remember credentials on this browser** is on.
2. **Choose a repository.** Owner, repository, branch, and folder. Documents are saved under `<folder>/<document-name>/`. **Test access** checks that the account can see the branch and commit to it.

Signing out forgets the token on this device; in a hosted editor behind GitHub sign-in it also signs you out of the editor. To revoke the authorization itself, use **Authorized apps** in your GitHub settings.

## Save and commit

Save to GitHub from any of these:

- The **Save to GitHub** button in the right panel header, next to **Connect AI**. Once the document is on GitHub, the button shows the short commit SHA instead.
- **File → Save to GitHub…** in the menu bar (and the desktop menu).
- **Save to GitHub…** in the command palette.

Until you sign in and choose a repository, the menu and palette commands open **Settings → Version control**, and the button offers **Set up GitHub**.

- **Save to GitHub** commits an open document to a new folder in the repository.
- Once a document is on GitHub, **Save** (<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>S</kbd>) commits it. The default message names the changed pages, such as `Update Landing page` / `Pages: Cover, Components`; write your own in the commit popover.
- **Save** on a document that is not on GitHub yet writes its file as before. While GitHub is set up, the first such save of each document shows a hint with a **Save to GitHub** button.
- The header shows the commit the document matches, for example `Committed 3f2a9c1 · 2 minutes ago`, with a link to the commit on GitHub.

Only files that changed are uploaded: OpenPencil compares Git blob hashes computed locally with the branch before creating blobs. Unsaved work stays protected by crash recovery until a commit of that revision succeeds.

## Open from GitHub

The home screen lists **GitHub documents** from the configured folder. Opening one loads its latest commit on the branch into a tab.

## Concurrent edits

If the branch moved since the document was loaded or last committed:

- When the other commits changed **different files** (for example another page), OpenPencil commits on top of them. The popover suggests reloading to see their changes.
- When the **same file** changed on both sides, nothing is committed. Choose **Reload from GitHub** (discards local edits), **Save as new document**, or **Overwrite GitHub**.

OpenPencil never force-pushes; the branch update is always a fast-forward.

## Branches and pull requests

The branch button next to the commit button shows the branch the document is bound to. Open it to:

- **Switch branch.** Filter the repository's branches and pick one; OpenPencil loads that branch's version of the document. With uncommitted changes, choose **Commit first** (they are committed to the current branch, then the other branch loads), **Discard and switch**, or cancel. If the document does not exist on that branch, **Add on next commit** keeps the open version and creates it there with your next commit.
- **New branch…** creates a branch from the latest commit on the current branch. The suggested name is `design/<document>-<4 characters>`; names follow Git's rules. Commits go to the new branch from then on, with the same conflict handling as on the default branch.
- **Open pull request** (on any branch other than the repository's default) opens a form with a title and a description that lists the pages changed on the branch, compared with the default branch. Create it ready for review or as a draft.

When the branch already has a pull request, the popover shows **View pull request #N** with its state (Open, Draft, Merged, or Closed) and, for open ones, the review state (Approved, Changes requested, Reviewed, or Awaiting review). After a pull request is merged on GitHub, **Switch to main** (the default branch) loads the merged result, and OpenPencil offers to delete the merged branch.

The pull request description lists changed pages by name. It does not include before/after preview images yet.

## Comments

Comments are GitHub issues pinned to the canvas. Turn on comment mode with the **Comments** button in the toolbar or <kbd>C</kbd>; <kbd>Esc</kbd> cancels a draft, then leaves comment mode.

- **Add a comment.** Click a layer or an empty spot on the page and write a comment. It becomes an issue in the repository: the title is the first line, the body is your Markdown, and the issue gets the labels `design-comment` and `doc:<document-slug>` (created if the repository lacks them). If the current branch has an open pull request, the issue says `Related to #N`.
- **Pins follow layers.** A comment on a layer stays attached as the layer moves. If the layer is deleted, its comments are listed under **Layer deleted** and their pins stay at the original position.
- **Threads.** The comments panel lists open comments on this page and on other pages. Select one to read replies (author, avatar, relative time, Markdown rendered safely), **Reply**, **Resolve** (closes the issue), **Reopen**, or **Open in GitHub**. **Show resolved** includes closed issues.
- Comments refresh when the window regains focus (at most every 30 seconds) and with the refresh button. After GitHub's rate limit is reached, they pause until it resets.

Comment mode needs a document that is committed to GitHub, because layer IDs are only stable once the document is saved there (a `.fig` file gets new IDs each time it is opened). Before that, the button explains **Commit to GitHub to comment**.

Each issue body ends with a hidden anchor such as `<!-- openpencil:anchor {"doc":"documents/landing-page","page":"0:1","node":"12:34",…} -->` that records the page, the layer, its position, the branch, and the commit. A body without a valid anchor is listed without a pin.

## GitHub identity in shared rooms

When you are signed in with GitHub, people in a shared room see your GitHub name and avatar on your cursor and in the room's avatar list instead of the name you typed. Avatars load only from `avatars.githubusercontent.com`.

The name is for display only. A room is still protected only by its link: anyone with the link can join and choose any name, including yours. Room access tied to GitHub accounts is planned for a later version.

## File format

A document folder contains:

```text
documents/landing-page/
  document.json              manifest: name, format version, page order, images, root node
  pages/cover.json           one file per page: nodes in tree order
  pages/cover.source.json    imported .fig provenance for that page's nodes
  pages/components.json
  pages/components.source.json
  styles.json                shared style definitions
  styles.source.json
  variables.json             collections, modes, variables, active modes
  images/<hash>.png          image bytes, named by content hash
  fig-schema.bin             original .fig schema (imported documents only)
```

The files are deterministic: the same document always produces the same bytes. Object keys are sorted, nodes follow tree order, short values stay on one line, and nothing time-dependent is written. Node IDs are preserved across save and load.

Each node record stores only what differs from a new node of its type, or, for an instance layer, from the component layer it was cloned from (named by `$base`). Values plain JSON cannot hold use tagged objects such as `{ "$bytes": "…" }` or `{ "$number": "-0" }`. A change to one rectangle produces a diff like this:

```diff
     {
       "id": "0:42",
       "name": "Hero",
       "parentId": "0:2",
       "type": "RECTANGLE",
-      "width": 200
+      "width": 320
     },
```

The renderer's cached text pictures are not saved; they are rebuilt when fonts load.

## Limits

- GitHub accepts files up to 100 MB; OpenPencil warns above 50 MB. Large imported files mostly grow the `.source.json` sidecars. Before uploading anything, a commit checks every file and names the page that is too large; split that page into smaller pages, or commit a copy of the document without it.
- Saving serializes the whole document on the main thread, which can pause the editor for a few seconds on very large documents.
- A recovered crash snapshot reopens as a local document, without its GitHub link; save it to GitHub again or reload the remote copy.
