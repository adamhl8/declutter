#!/usr/bin/env bun
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import process from "node:process"

import { $ } from "bun"
import type { Result } from "ts-explicit-errors"
import { attempt, err, isErr } from "ts-explicit-errors"

const TILDE_REGEX = /^~(?=$|\/|\\)/v
const HOME_DIR = os.homedir()

const untildify = (pathWithTilde: string) => (HOME_DIR ? pathWithTilde.replace(TILDE_REGEX, HOME_DIR) : pathWithTilde)

export const resolvePath = (pathToResolve: string) => {
  let resolvedPath = pathToResolve.trim()
  resolvedPath = untildify(resolvedPath)
  resolvedPath = path.resolve(resolvedPath)
  return resolvedPath
}

const PATTERNS_TO_REMOVE = [/^\.DS_Store/v, /^\.localized/v, /^\._.*/v] as const

const SEARCH_PATHS = ["~", "/Volumes", "/Applications"] as const

const PATHS_TO_REMOVE = [
  "~/.android",
  "~/.bash_history",
  "~/bun_repl_history",
  "~/.cache",
  "~/.cocoapods",
  "~/.cups",
  "~/.dbclient",
  "~/.degit",
  "~/.embedded-postgres-go",
  "~/.expo",
  "~/.gradle",
  "~/.hawtjni",
  "~/.lemminx",
  "~/.lesshst",
  "~/.matplotlib",
  "~/.m2",
  "~/.node_repl_history",
  "~/.npm",
  "~/.pnpm-state",
  "~/.python_history",
  "~/.sonarlint",
  "~/.sts4",
  "~/.swiftpm",
  "~/.yarn",
  "~/.yarnrc",
  "~/Movies",
  "~/Music",
  "~/.viminfo",
  "~/.zsh_history",
] as const

/** Removes each path, tolerating ones that don't exist. Returns the resolved paths that were actually removed. */
const removePaths = async (pathsToRemove: readonly string[]) => {
  const pathRemovePromises = pathsToRemove.map(async (pathToRemove) => {
    const resolvedPath = resolvePath(pathToRemove)

    const rmResult = await attempt(async () => fs.rm(resolvedPath, { recursive: true }))
    if (isErr(rmResult)) {
      if (!rmResult.message.startsWith("ENOENT"))
        console.error(`Failed to remove '${resolvedPath}': ${rmResult.message}`)
      return
    }

    return resolvedPath
  })
  const removedPaths = await Promise.all(pathRemovePromises)

  return removedPaths.filter((removedPath) => removedPath !== undefined)
}

const findMatchesByPattern = async () => {
  // fd has no "or" flag, so alternate the patterns into one regex to search each path a single time
  const combinedPattern = PATTERNS_TO_REMOVE.map((regex) => regex.source).join("|")
  const searchPaths = SEARCH_PATHS.map(resolvePath)

  const stdout = await $`fd --unrestricted --absolute-path --type f ${combinedPattern} ${searchPaths}`.text()
  const matches = stdout.trim().split("\n").filter(Boolean)

  const matchesByPattern = new Map<RegExp, string[]>(PATTERNS_TO_REMOVE.map((regex) => [regex, []]))
  for (const match of matches) {
    // fd tests the file name rather than the full path, so group on the same thing. First match wins, so a file
    // matching multiple patterns is only prompted for once.
    const name = path.basename(match)
    const regex = PATTERNS_TO_REMOVE.find((patternRegex) => patternRegex.test(name))
    if (regex) matchesByPattern.get(regex)?.push(match)
  }

  return matchesByPattern
}

const handlePatterns = async () => {
  console.info("\nFinding files matching patterns...")
  const matchesByPattern = await findMatchesByPattern()

  for (const [regex, matches] of matchesByPattern) {
    const pattern = regex.source
    if (matches.length === 0) {
      console.info(`\nNo matches found for pattern '${pattern}'`)
      continue
    }

    console.info(`\nFound ${matches.length} files matching pattern '${pattern}':`)
    console.info(matches.join("\n"))

    // oxlint-disable-next-line eslint/no-alert - prompt is bun's stdin reader here
    const response = prompt("\nRemove? [y/N]")
    if (response?.trim().toLowerCase() !== "y") continue

    const removedPaths = await removePaths(matches)

    console.info(`Removed ${removedPaths.length} files`)
  }
}

const declutter = async (): Promise<Result> => {
  if (os.userInfo().uid !== 0) return err("declutter must be run as root", undefined)

  console.info("Removing paths...")
  const removedPaths = await removePaths(PATHS_TO_REMOVE)
  for (const removedPath of removedPaths) console.info(`Removed '${removedPath}'`)

  await handlePatterns()
}

const main = async (): Promise<number> => {
  const result = await declutter()
  if (isErr(result)) {
    console.error(result.messageChain)
    return 1
  }
  return 0
}

process.exitCode = await main()
