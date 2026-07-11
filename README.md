# declutter

Interactively removes junk files and directories from your machine.

`declutter` deletes a curated list of known junk paths (shell histories, package manager caches, tool state directories, etc.) and then searches for files matching junk patterns like `.DS_Store`, prompting before removing them.

## Requirements

- The [`fd`](https://github.com/sharkdp/fd) binary must be on your `PATH`
- Must be run as root (it removes files from system locations like `/Volumes` and `/Applications`)

## Install

```sh
npm install -g @adamhl8/declutter
```

## Usage

```sh
sudo declutter
```
