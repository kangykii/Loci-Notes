# Loci Notes Worktrees

This repo uses dedicated git worktrees for focused feature expansion. Each
worktree is a separate checkout backed by its own branch, while `C:\Loci-Notes`
remains the primary checkout for release and mainline work.

## Active Worktrees

| Focus area | Path | Branch |
| --- | --- | --- |
| Templates | `C:\Loci-Notes-worktrees\templates` | `feature/templates` |
| Format blocks and AI | `C:\Loci-Notes-worktrees\format-blocks-ai` | `feature/format-blocks-ai` |
| Atoms and sets | `C:\Loci-Notes-worktrees\atoms-sets` | `feature/atoms-sets` |
| Widgets | `C:\Loci-Notes-worktrees\widgets` | `feature/widgets` |
| Landing page | `C:\Loci-Notes-worktrees\landing-page` | `feature/landing-page` |

## Daily Workflow

List active worktrees:

```powershell
git worktree list
```

Install dependencies only in a worktree you are actively building or running:

```powershell
cd C:\Loci-Notes-worktrees\templates
npm install
npm run build
```

Keep each worktree on its own branch. Do not check out the same branch in more
than one worktree.

## Cleanup

After a feature branch has been merged, remove its worktree and delete the
local branch:

```powershell
cd C:\Loci-Notes
git worktree remove C:\Loci-Notes-worktrees\templates
git branch -d feature/templates
```

Use `git branch -D` only when intentionally discarding unmerged branch work.
