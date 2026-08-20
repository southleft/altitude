---
title: "Useful Git Commands for Front-End Developers"
date: 2024-02-28
category: "development"
categoryName: "Development"
excerpt: "Here’s a list of useful Git commands to master to help you navigate your next front-end project!"
hero: "https://southleft.pages.dev/media/Person-Holding-Small-Paper-1-1.webp"
---

Git (Global Information Tracker) is a version control system that helps you keep track of your project source code and assets that are stored in a repository such as [GitHub](https://github.com/) or [GitLab](https://about.gitlab.com/). Most consider it a necessary skill in the modern development workflow since most projects store the source code in some type of remote repository.

Front-end developers depend on Git to help them manage and configure their project requirements. Common front-end build systems such as [Webpack](https://webpack.js.org/), [Parcel](https://parceljs.org/), or [Vite](https://vitejs.dev/) typically require per-project customization, which leads developers to leverage Git to help them deal with pesky transient files and prevent them from polluting their repos with unnecessary files.

Git has a plethora of commands available, so here’s a list of useful Git commands to master to help you navigate your next front-end project. _This article assumes you already have some working knowledge of Git_.

## Branch

The command `git branch` is used to manage branches in your Git repository. This command lets you create, delete, rename, and manage branches to develop features isolated from each other.

```bash
# List existing branches
git branch

# Navigate to another branch
git checkout branch
or
git switch branch

# Create new branch from current branch
git checkout -b new-branch

# Push new local branch to remote repository
git push -u origin new-branch

# Rename a branch
git checkout branch-name
git branch -m new-branch-name
git branch (check status of branch)
```

### Practical usage

When working on large-scale projects, it’s imperative to check what branch you are working on in order to prevent unwanted changes to other branches. There’s nothing worse than making a bunch of updates to a branch, only to realize you’ve been working in the wrong branch for an hour 😅

## Status

The `git status` command returns information about the working directory and the staging area, such as:

-   Changes made in the working directory
-   Files that are currently being tracked or untracked
-   Files that are currently staged or unstaged

### Practical usage

On large-scale projects, you will likely update many files throughout the day. When you need a recap of your current changes, run the command `git status`.

## Log

The `git log` command is used to view the commit history and changelog of a Git repository. It allows you to review the previous commits made by yourself and other developers in the repository.

```bash
# See the commit history for the current branch
git log

#--oneline (shows only the commit id & commit message)
git log --oneline
```

### Practical usage

The `git log` command comes in handy for accessing the commit log of a project. It provides a paper trail that you can scan quickly for reference if you ever lose track of what you were working on the previous day or week.

## Add

The `git add` command adds file changes in your working directory to the staging area. This command prepares those changes for the next commit snapshot of the repository.

```bash
git add

# Add all files in working directory
git add .

# Add all files that changed
git add -u
```

### Practical usage

Any time you make changes to your current working directory, you will eventually want to push those changes to the remote repository. You will need to add those changes to the staging area first by using the command `git add`.

## Commit

The `git commit` command captures a snapshot of the current working directory’s staged changes.

```bash
git commit

# commit message flag
git commit -m 'Your commit message'

# add files and commit message
git commit -am 'Another commit message'
```

### Practical usage

After adding changes to the staging area, run the `git commit` command and write a short message explaining the awesome feature you just integrated 😏

## Checkout & Switch

Both `git checkout` and `git switch` are used to navigate between branches.

```bash
# checkout a specific branch
git checkout branch-name

# Create new branch from current branch and switch to it

git checkout -b new-branch

# Switch branches using the switch command
git switch branch-name
```

### Practical usage

Navigating between branches is something you’ll do frequently in larger projects. The `checkout` and `switch` commands can both be used to accomplish this, although `switch` was created specifically for switching branches, while `checkout` can switch branches _and_ restore files.

## Pull

The `git pull` command is used to fetch and download updates from a remote repository and update the local repository to match that content.

```bash
# Command
git pull
```

### Practical usage

When working with a team of developers, you will have to pull in their changes frequently to keep your branch in sync. Use `git pull` to fetch the latest commits from the remote repo.

## Push

`git push` is used to push updates from the local repository to the remote repository. This command only uploads your commits; it does not upload any uncommitted changes in your working directory.

```bash
# push changes to remote branch
git push

# Set upstream first if new branch
git push -u origin your-branch
```

### Practical usage

When you make commits locally using `git commit`, those commits are recorded in your local repository, but they are not shared with the remote repository by default. You need to explicitly push your commits to the remote repository so other developers have access to your commits.

## Stash

The `git stash` command allows you to temporarily save changes that you have made to your working directory but aren’t ready to commit yet. This lets you switch branches or clean up your working directory without losing your uncommitted changes.

```bash
# Command
git stash

# stash both tracked and untracked files in your working directory
git stash -u

# List your stashed changes
git stash list

# Reapply your most recently stashed changes
git stash pop

# Delete your entire stash
git stash clear
```

### Practical usage

One scenario in which the `git stash` command comes in handy is when you need to merge updates into your current working branch but aren’t quite ready to commit your changes at that moment. `git stash` lets you temporarily store uncommitted work to clean up your current branch or switch context; changes are saved locally and can be reapplied from the stash later.

## Remote

The `git remote` command allows you to manage remote connections to GitHub, GitLab, or other remote repositories. It lets you add, remove, rename, and set URLs for remote repositories.

```bash
# Command
git remote

# list remote connections to other repositories
git remote -v

# Remove remote
git remote remove <name>

# Change a remote URL
git remote set-url <name> <new-url>
```

### Practical usage

There are times when a project’s repository needs to be migrated to another repository. The `git remote` command allows you to remove the existing remote and set a new remote URL so all changes moving forward can be pushed to the correct remote repository.

## _Bonus Command:_ Clean

The `git clean` command is used to remove untracked files from your working directory. This instantly cleans up your working directory. However, use it with caution as it permanently deletes files—so be sure to use the `-n` flag to do a dry-run first, to see what files will be removed.

```bash
git clean

# Dry run of what files will be removed
git clean -n

# Delete untracked files from working directory
git clean -f
```

## Summary

Git has many commands to master, but, hopefully, this article has helped shed some light on some of the most common and practical commands that you can use to navigate your next project.
