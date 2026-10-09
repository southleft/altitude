---
title: Version Control
description: Commit OpenPencil documents to a GitHub repository as reviewable JSON, open them again, and resolve concurrent edits.
---

# Version Control

OpenPencil can keep a document in a GitHub repository. Each save is one commit on the configured branch, and the repository holds a folder of plain JSON files that review and diff like code.

## Set up

Open **Settings → Version control**.

1. **Sign in.** In the hosted web app, choose **Sign in with GitHub**. In the desktop app, in local development, or on a preview deployment without its own OAuth app, open **Use a personal access token instead** and paste a [fine-grained token](https://github.com/settings/personal-access-tokens/new) for the repository with **Contents: read and write**. Either is kept in the system credential store on desktop. In a browser it lasts for the session unless **Settings → General → Remember credentials on this browser** is on.
2. **Choose a repository.** Owner, repository, branch, and folder. Documents are saved under `<folder>/<document-name>/`. **Test access** checks that the account can see the branch and commit to it.

Signing out forgets the token on this device. To revoke the authorization itself, use **Authorized apps** in your GitHub settings.

## Save and commit

Use the commit button in the editor header (next to **Connect agent**):

- **Save to GitHub** commits an open document to a new folder in the repository.
- Once a document is on GitHub, **Save** (<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>S</kbd>) commits it. The default message names the changed pages, such as `Update Landing page` / `Pages: Cover, Components`; write your own in the commit popover.
- The header shows the commit the document matches, for example `Committed 3f2a9c1 · 2 minutes ago`, with a link to the commit on GitHub.

Only files that changed are uploaded: OpenPencil compares Git blob hashes computed locally with the branch before creating blobs. Unsaved work stays protected by crash recovery until a commit of that revision succeeds.

## Open from GitHub

The home screen lists **GitHub documents** from the configured folder. Opening one loads its latest commit on the branch into a tab.

## Concurrent edits

If the branch moved since the document was loaded or last committed:

- When the other commits changed **different files** (for example another page), OpenPencil commits on top of them. The popover suggests reloading to see their changes.
- When the **same file** changed on both sides, nothing is committed. Choose **Reload from GitHub** (discards local edits), **Save as new document**, or **Overwrite GitHub**.

OpenPencil never force-pushes; the branch update is always a fast-forward.

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

- GitHub accepts files up to 100 MB; OpenPencil warns above 50 MB. Large imported files mostly grow the `.source.json` sidecars.
- Saving serializes the whole document on the main thread, which can pause the editor for a few seconds on very large documents.
- A recovered crash snapshot reopens as a local document, without its GitHub link; save it to GitHub again or reload the remote copy.
