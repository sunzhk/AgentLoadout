import { Command } from "commander";
import { homedir } from "node:os";
import chalk from "chalk";
import { PRESETS, TOOLS, getToolsByIds, validateToolIds } from "./catalog.js";
import type { PresetId } from "./catalog.js";
import { detectPlatform } from "./platform.js";
import { resolveInstallPlan } from "./resolve.js";
import { runInstallPlan } from "./installers/index.js";
import { verifyTools, printVerifyResults, verifyResultsToJson } from "./verify.js";
import { writeReceipt, readReceipt } from "./receipt.js";
import {
  selectPresets,
  selectTools,
  printPreview,
  confirmInstall,
  selectAgents,
} from "./ui.js";
import { writeSkills, findToolsMissingSkills } from "./skills.js";
import { createSymlinks, removeSymlink } from "./symlink.js";
import type { AgentId } from "./symlink.js";
import { paths, AGENT_TIER, AGENT_SKILL_LINKS } from "./paths.js";

const program = new Command();

program
  .name("agent-loadout")
  .description("One command to load out your terminal for agentic coding")
  .version("1.0.2");

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log(chalk.dim("\n  Cancelled."));
  process.exit(0);
});

// ── Default command: install ────────────────────────────

program
  .command("install", { isDefault: true })
  .description("Install tools (interactive by default)")
  .option("--preset <presets...>", "Install specific presets without prompts")
  .option("--tool <tools...>", "Install specific tools by ID")
  .option("--skip <tools...>", "Exclude specific tools by ID")
  .option("--all", "Install everything")
  .option("--apply", "Actually run the install (default is preview only)")
  .option("--agents <agents...>", "Agents to create symlinks for")
  .action(async (opts) => {
    const platformInfo = await detectPlatform();

    let tools;

    if (opts.tool) {
      const { valid, invalid } = validateToolIds(opts.tool as string[]);
      if (invalid.length > 0) {
        console.log(
          chalk.red(
            `Unknown tool${invalid.length > 1 ? "s" : ""}: ${invalid.map((t: string) => `'${t}'`).join(", ")}. Run ${chalk.dim("agent-loadout list --json")} to see all tool IDs.`,
          ),
        );
        process.exit(1);
      }
      tools = getToolsByIds(valid);
    } else if (opts.all) {
      tools = TOOLS;
    } else if (opts.preset) {
      const rawIds = opts.preset as string[];
      const validIds = PRESETS.map((p) => p.id);
      const invalid = rawIds.filter((p) => !validIds.includes(p as PresetId));
      if (invalid.length > 0) {
        console.log(
          chalk.red(
            `Unknown preset${invalid.length > 1 ? "s" : ""}: ${invalid.map((p: string) => `'${p}'`).join(", ")}. Available: ${validIds.join(", ")}`,
          ),
        );
        process.exit(1);
      }
      const presetIds = rawIds as PresetId[];
      tools = TOOLS.filter((t) => presetIds.includes(t.preset));
    } else {
      // Interactive flow
      const presetIds = await selectPresets();
      if (presetIds.length === 0) {
        console.log(chalk.dim("No presets selected. Nothing to install."));
        return;
      }
      tools = await selectTools(presetIds);
      if (tools.length === 0) {
        console.log(chalk.dim("No tools selected. Nothing to install."));
        return;
      }
    }

    // Apply --skip filter
    if (opts.skip) {
      const skipSet = new Set(opts.skip as string[]);
      tools = tools.filter((t) => !skipSet.has(t.id));
      if (tools.length === 0) {
        console.log(chalk.dim("All tools were skipped. Nothing to install."));
        return;
      }
    }

    // Resolve per-platform install plan
    const plan = resolveInstallPlan(tools, platformInfo);

    // Preview
    printPreview(tools, plan, platformInfo);

    // Non-interactive modes need --apply
    if (!opts.apply && (opts.all || opts.preset || opts.tool)) {
      const parts: string[] = [];
      if (opts.tool) parts.push(`--tool ${(opts.tool as string[]).join(" ")}`);
      else if (opts.all) parts.push("--all");
      else parts.push(`--preset ${(opts.preset as string[]).join(" ")}`);
      if (opts.skip) parts.push(`--skip ${(opts.skip as string[]).join(" ")}`);
      console.log(chalk.yellow("Dry run — add --apply to install. Example:"));
      console.log(
        chalk.dim(`  npx agent-loadout install ${parts.join(" ")} --apply`),
      );
      return;
    }

    if (plan.resolved.length === 0) {
      console.log(chalk.dim("No installable tools for this platform."));
      return;
    }

    // Interactive mode: ask to confirm
    if (!opts.all && !opts.preset && !opts.tool) {
      const proceed = await confirmInstall();
      if (!proceed) {
        console.log(chalk.dim("Cancelled."));
        return;
      }
    }

    // Install
    await runInstallPlan(plan);

    // Verify (only resolved tools)
    console.log();
    console.log(chalk.bold("Verifying..."));
    const resolvedTools = plan.resolved.map((r) => r.tool);
    const results = await verifyTools(resolvedTools, platformInfo.platform);
    printVerifyResults(results);

    // Write skills to canonical directory
    const skillCount = await writeSkills(resolvedTools);
    if (skillCount > 0) {
      console.log(
        chalk.dim(`\n  ${skillCount} skill files written to ~/.agents/skills/agent-loadout/`),
      );
    }

    // Create symlinks (Tier 1 默认全选)
    const defaultAgents = Object.entries(AGENT_TIER)
      .filter(([, tier]) => tier === 1)
      .map(([id]) => id);
    const selectedAgents = (opts.agents as string[] | undefined) ??
      (opts.all || opts.preset || opts.tool
        ? defaultAgents
        : await selectAgents(defaultAgents));

    if (selectedAgents.length > 0) {
      const linkResults = await createSymlinks(selectedAgents as AgentId[]);
      for (const [agent, result] of Object.entries(linkResults)) {
        const shortPath = AGENT_SKILL_LINKS[agent].replace(homedir(), "~");
        if (result === "created") {
          console.log(chalk.dim(`  🔗 ${shortPath}`));
        } else if (result === "blocked") {
          console.log(
            chalk.yellow(`  ⚠  ${shortPath} blocked — real directory exists. Remove it first: rm -rf ${AGENT_SKILL_LINKS[agent]}`),
          );
        }
      }
    }

    // Write receipt
    await writeReceipt({
      platform: platformInfo.platform,
      selections: tools.map((t) => t.id),
      installed: verifyResultsToJson(results),
      timestamp: new Date().toISOString(),
    });
    console.log(chalk.dim("  Receipt saved to ~/.agent-loadout/receipt.json"));
  });

// ── Verify command ──────────────────────────────────────

program
  .command("verify")
  .alias("doctor")
  .description("Check which tools are installed")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const platformInfo = await detectPlatform();
    const receipt = await readReceipt();
    const toolIds = receipt?.selections ?? TOOLS.map((t) => t.id);
    const tools = getToolsByIds(toolIds);

    const results = await verifyTools(tools, platformInfo.platform);
    const installed = results.filter((r) => r.installed).length;
    const allInstalled = installed === results.length;

    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            ok: allInstalled,
            platform: platformInfo.platform,
            installed,
            total: results.length,
            tools: results,
          },
          null,
          2,
        ),
      );
    } else {
      printVerifyResults(results);
    }

    process.exit(allInstalled ? 0 : 1);
  });

// ── List command ────────────────────────────────────────

program
  .command("list")
  .description("Print the tool catalog")
  .option("--json", "Output as JSON")
  .option("--brewfile", "Output macOS Brewfile (darwin only)")
  .action(async (opts) => {
    if (opts.brewfile) {
      const { generateBrewfileFromCatalog } = await import("./catalog.js");
      console.log(generateBrewfileFromCatalog());
      return;
    }

    if (opts.json) {
      console.log(JSON.stringify({ presets: PRESETS, tools: TOOLS }, null, 2));
      return;
    }

    const platformInfo = await detectPlatform();

    for (const preset of PRESETS) {
      const marker = preset.defaultOn ? chalk.green("●") : chalk.dim("○");
      console.log(
        `\n${marker} ${chalk.bold(preset.name)} — ${preset.description}`,
      );
      const presetTools = TOOLS.filter((t) => t.preset === preset.id);
      const maxName = Math.max(...presetTools.map((t) => t.name.length));
      for (const t of presetTools) {
        const platformInstalls = t.install[platformInfo.platform];
        const method = platformInstalls
          ? chalk.yellow(platformInstalls[0].method)
          : chalk.dim("n/a");
        console.log(
          `    ${t.name.padEnd(maxName)}  ${method}  ${chalk.dim(t.description)}`,
        );
      }
    }
    console.log();
  });

// ── Skills command ──────────────────────────────────────

program
  .command("skills")
  .description("Manage skill files and agent symlinks")
  .option("--force", "Rewrite skill files for all installed tools")
  .option("--agents <agents...>", "Agents to link: claude, pi, codex, augment, qwen, gemini, cline, roocode, amazonq, opencode, windsurf, aider")
  .option("--link", "Create symlinks for selected agents")
  .option("--unlink <agents...>", "Remove symlinks for specified agents")
  .action(async (opts) => {
    const platformInfo = await detectPlatform();
    const results = await verifyTools(TOOLS, platformInfo.platform);
    const installedIds = new Set(results.filter((r) => r.installed).map((r) => r.id));
    const installedTools = TOOLS.filter((t) => installedIds.has(t.id));

    let didSomething = false;

    // ── Write skill files ──
    if (opts.force) {
      console.log(chalk.dim(`  Writing skills for ${installedTools.length} installed tools...`));
      const written = await writeSkills(installedTools);
      console.log(
        chalk.green(`  ${written} skill files written to ~/.agents/skills/agent-loadout/`),
      );
      didSomething = true;
    } else if (!opts.link && !opts.unlink) {
      // Default behavior: fill gaps
      if (installedTools.length === 0) {
        console.log(chalk.dim("  No installed tools found."));
        return;
      }
      console.log(chalk.dim(`  Scanning ${installedTools.length} installed tools...`));
      const missingIds = await findToolsMissingSkills(installedTools.map((t) => t.id));

      if (missingIds.length === 0) {
        console.log(chalk.green(`  ✓ All ${installedTools.length} installed tools already have skill files.`));
      } else {
        const alreadyHave = installedTools.length - missingIds.length;
        console.log(chalk.dim(`  ${alreadyHave} already have skill files`));
        console.log(chalk.dim(`  Writing ${missingIds.length} missing: ${missingIds.join(", ")}`));

        const toolsToWrite = installedTools.filter((t) => missingIds.includes(t.id));
        const written = await writeSkills(toolsToWrite);
        console.log(
          chalk.green(`  ${written} skill files written to ~/.agents/skills/agent-loadout/`),
        );
      }
      didSomething = true;
    }

    // ── Link symlinks ──
    if (opts.link || opts.agents) {
      const defaultAgents = Object.entries(AGENT_TIER)
        .filter(([, tier]) => tier === 1)
        .map(([id]) => id);
      const agents = (opts.agents as string[] | undefined) ??
        await selectAgents(defaultAgents);

      if (agents.length > 0) {
        const linkResults = await createSymlinks(agents as AgentId[]);
        for (const [agent, result] of Object.entries(linkResults)) {
          const shortPath = AGENT_SKILL_LINKS[agent].replace(homedir(), "~");
          if (result === "created") {
            console.log(chalk.green(`  🔗 ${shortPath}`));
          } else if (result === "already-exists") {
            console.log(chalk.dim(`  ✓  ${shortPath} (already linked)`));
          } else if (result === "blocked") {
            console.log(
              chalk.yellow(`  ⚠  ${shortPath} blocked — remove existing directory first`),
            );
          }
        }
      }
      didSomething = true;
    }

    // ── Unlink ──
    if (opts.unlink) {
      for (const agent of opts.unlink as string[]) {
        const result = await removeSymlink(agent as AgentId);
        const shortPath = AGENT_SKILL_LINKS[agent]?.replace(homedir(), "~") ?? agent;
        if (result === "removed") {
          console.log(chalk.dim(`  ✗  unlinked ${shortPath}`));
        } else if (result === "not-found") {
          console.log(chalk.dim(`  -  ${shortPath} not found`));
        } else {
          console.log(chalk.yellow(`  ⚠  ${shortPath} is not a symlink — skipped`));
        }
      }
      didSomething = true;
    }

    if (!didSomething) {
      console.log(chalk.dim("  Nothing to do. Use --force, --link, or --unlink."));
    }
  });

program.parse();
