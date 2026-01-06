# Y3 Labs

A collection of browser-based games built by a father-and-son team, deployed on the Internet Computer (ICP).

## Team

- [zire](https://github.com/zire) - Lead developer
- [brandonatorock](https://github.com/brandonatorock) - Junior developer

## Games

| Game | Description |
|------|-------------|
| [Pacboy 2025](src/games/pacboy-2025/) | A Pac-Man inspired maze game |
| [Space Intruder](src/games/space-intruder/) | A Space Invaders style shooter |

## Workflow

### The Golden Rules

1. **Never work directly on `main` branch** - Always create a new branch first
2. **Always `Pull` before you start** - Get the latest code before making changes
3. **Small commits** - Save your work often with clear messages
4. **Ask for review** - Create a Pull Request so `zire` can review the code

### How Git Push/Pull Works

```
    YOUR COMPUTER                                     GITHUB (cloud)
    ┌─────────────────────┐                          ┌─────────────────────┐
    │                     │                          │                     │
    │   Working Files     │                          │   Remote Repository │
    │   (your code)       │                          │   (shared code)     │
    │                     │                          │                     │
    └──────────┬──────────┘                          └──────────┬──────────┘
               │                                                │
               │  git add + git commit                          │
               │  (save locally)                                │
               ▼                                                │
    ┌─────────────────────┐                                     │
    │                     │         git push                    │
    │   Local Repository  │ ─────────────────────────────────── │
    │   (your commits)    │         ───────────────────────►    │
    │                     │                                     │
    │                     │         git pull                    │
    │                     │ ─────────────────────────────────── │
    │                     │         ◄───────────────────────    │
    └─────────────────────┘                                     │
                                                                │
                                                                ▼
                                                     ┌─────────────────────┐
                                                     │   Pull Request      │
                                                     │   (ask to merge)    │
                                                     └─────────────────────┘
```

**The Flow:**

1. You write code in your **Working Files**
2. `git add` + `git commit` saves changes to your **Local Repository**
3. `git push` uploads your commits to **GitHub**
4. `git pull` downloads new commits from **GitHub** to your computer
5. **Pull Request** asks to merge your branch into `main`

### Step-by-Step Guide

#### Starting a New Task

```bash
# 1. Make sure you're on main and have the latest code
git checkout main
git pull

# 2. Create your own branch (yourname/what-you-are-doing)
git checkout -b brandon/add-new-enemy
```

#### Saving Your Work

```bash
# 1. See what files you changed
git status

# 2. Add the files you want to save (one at a time is safer)
git add src/games/space-intruder/game.js

# 3. Save with a message explaining what you did
git commit -m "Add alien enemy that shoots lasers"

# 4. Push your branch to GitHub
git push -u origin brandon/add-new-enemy
```

#### Creating a Pull Request

After pushing your branch, go to [https://github.com/Inturious-Labs/Y3-Labs](https://github.com/Inturious-Labs/Y3-Labs) and:

1. Click the green "Compare & pull request" button
2. Write a short description of what you changed
3. Click "Create pull request"
4. Wait for `zire` to review it

### Helpful Commands

| Command | What it does |
|---------|--------------|
| `git status` | Shows what files you changed |
| `git diff` | Shows exactly what you changed in each file |
| `git log --oneline -5` | Shows the last 5 commits |
| `git branch` | Shows all your branches (star = current one) |

### Branch Naming

Use this format: `yourname/what-you-are-doing`

Examples:

- `brandon/fix-player-speed`
- `brandon/add-power-up`
- `herbert/update-homepage`

### Commit Message Tips

Good commit messages explain **what** you did:

- "Add jump animation to player"
- "Fix bug where score resets to zero"
- "Make enemies move faster each level"

Not so helpful:

- "Fixed stuff"
- "Changes"
- "asdfasdf"

## Development

### Project Structure

```
y3labs/
├── src/
│   ├── index.html          # Main entry (redirects to inturious.com)
│   └── games/
│       ├── pacboy-2025/    # Pac-Man style game
│       └── space-intruder/ # Space Invaders style game
├── dfx.json                # ICP deployment config
└── README.md               # You are here
```

## License

Open source project by [Y3 Labs](https://inturious.com/products/y3-labs/index.html), a subsidiary of [Inturious Labs](https://inturious.com/).
