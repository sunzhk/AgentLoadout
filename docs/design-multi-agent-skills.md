# 多 Agent Skill 文件自动发现 — 设计方案

## 背景

[AgentLoadout](https://github.com/conorluddy/AgentLoadout) 是一个终端工具安装器，安装完成后会生成 Skill 文件（Markdown + YAML frontmatter），告诉 AI Agent 如何使用这些工具。

当前库只将 Skill 文件写入 Claude Code 的发现路径 `~/.claude/skills/agent-loadout/`，不支持其他 AI Agent。

本 Fork 的目标：让 Skill 文件能被多种 Agent 自动发现，覆盖 pi、OpenAI Codex 及用户自定义 Agent。

---

## 当前架构问题

### 1. `src/paths.ts` — Skill 目标目录硬编码为单 Agent

```ts
// 当前：只写 Claude Code
const SKILL_TARGETS: Record<string, string> = {
  claude: join(homedir(), ".claude", "skills", "agent-loadout"),
};

const GENERIC_SKILLS = join(BASE_DIR, "skills");  // ~/.agent-loadout/skills/
```

### 2. `src/skills.ts` — 索引 SKILL.md 缺少 `name` 字段

当前索引文件 (`buildTOC`) 生成的 frontmatter：
```yaml
---
description: "Core: rg(fast-regex-search) ..."
source: agent-loadout
---
```

缺少 `name` 字段。pi 和 Agent Skills 标准（[agentskills.io](https://agentskills.io/specification)）要求必须有 `name`。

> **注意**：单个工具文件的 `buildFrontmatter` 已正确包含 `name: ${tool.name}`，只有索引 SKILL.md 缺失。

### 3. 无用户自定义扩展能力

用户无法追加自己的 Agent skill 目录，不能通过环境变量或配置文件来适配非主流 Agent。

### 4. 写入了非标准路径 `~/.agent-loadout/skills/`

该路径不被任何主流 Agent 发现，属于无效写入，应废弃。

---

## 目标

| # | 目标 | 说明 |
|---|------|------|
| 1 | 统一 canonical 路径 | 所有 skill 文件写入 `~/.agents/skills/agent-loadout/` |
| 2 | symlink 到各 Agent | 用户选择支持的 Agent，自动创建 symlink |
| 3 | 覆盖主流 Agent | Tier 1~3 共 10+ 个 Agent（详见下方 Agent 支持列表）|
| 4 | SKILL.md 符合 Agent Skills 标准 | 索引 frontmatter 加 `name` 字段 |
| 5 | 用户可选 Agent | CLI 交互选择 / `--agents` 参数 |
| 6 | 支持环境变量/配置文件追加 | `AGENT_LOADOUT_EXTRA_SKILL_DIRS` / `config.json` 追加非标准目录 |
| 7 | 向后兼容 | 已有用户升级后不受影响；旧路径不写入但也不主动删除 |

---

## 整体架构

```
~/.agents/skills/agent-loadout/   ← canonical 源（唯一写入点）
  ├── SKILL.md                    ← 索引/TOC
  ├── rg.md
  ├── fd.md
  ├── ...（60+ 工具 skill 文件）

~/.claude/skills/agent-loadout    ← symlink → ~/.agents/skills/agent-loadout
~/.pi/agent/skills/agent-loadout  ← symlink → ~/.agents/skills/agent-loadout
~/.codex/skills/agent-loadout     ← symlink → ~/.agents/skills/agent-loadout
~/.augment/skills/agent-loadout   ← symlink → ~/.agents/skills/agent-loadout
~/.qwen/skills/agent-loadout      ← symlink → ~/.agents/skills/agent-loadout
~/.gemini/skills/agent-loadout    ← symlink → ~/.agents/skills/agent-loadout
...（更多见下方完整列表）
```

## Agent 支持列表

共覆盖 **13 个**主流 AI Coding Agent，按支持程度分三级。

### Tier 1 — 已确认（5 个）

实测验证，这些 Agent 已使用 `~/.agents/skills/` symlink 模式，与 `android-cli`、`agp-9-upgrade` 等现有 skill 共享同一套 skill 文件。

| Agent | skill 发现目录 | 厂商 | 状态 |
|-------|---------------|------|------|
| **Claude Code** | `~/.claude/skills/` | Anthropic | ✅ 已确认 — 当前唯一支持的 Agent |
| **pi** | `~/.pi/agent/skills/` | Earendil | ✅ 已确认 — 机器上全部是 symlink |
| **OpenAI Codex** | `~/.codex/skills/` | OpenAI | ✅ 已确认 — 同 symlink 模式 |
| **Augment Code** | `~/.augment/skills/` | Augment | ✅ 已确认 — 同 symlink 模式 |
| **Qwen Code** | `~/.qwen/skills/` | Alibaba | ✅ 已确认 — 同 symlink 模式 |

### Tier 2 — 高度可能（1 个）

已有 `skills/` 目录（空），遵循 agentskills.io 规范，支持 symlink 发现。

| Agent | skill 发现目录 | 厂商 | 状态 |
|-------|---------------|------|------|
| **Gemini CLI** | `~/.gemini/skills/` | Google | ⬜ 目录已存在，空 — 等待验证 |

### Tier 3 — 可能支持（6 个）

主流 Agent，有独立配置目录，但目前未观察到 `skills/` 子目录。symlink 提前创建，当它们支持 agentskills.io 时自动生效。

| Agent | skill 发现目录 | 厂商 | 状态 |
|-------|---------------|------|------|
| **Cline** | `~/.cline/skills/` | Cline | ⬜ 目录存在，无 skills/ — 预埋 |
| **Roo Code** | `~/.roocode/skills/` | Roo | ⬜ 目录存在，无 skills/ — 预埋 |
| **Amazon Q Developer** | `~/.amazonq/skills/` | AWS | ⬜ 目录存在，无 skills/ — 预埋 |
| **OpenCode** | `~/.opencode/skills/` | OpenCode | ⬜ 目录存在，无 skills/ — 预埋 |
| **Windsurf** | `~/.windsurf/skills/` | Codeium | ⬜ 目录存在，无 skills/ — 预埋 |
| **Aider** | `~/.aider/skills/` | Aider | ⬜ 目录存在，无 skills/ — 预埋 |

### 明确排除 — 不兼容机制

以下 Agent 使用**完全不同的指令/规则机制**，不支持 `agentskills.io` 目录 + `SKILL.md` 模式，无法通过 symlink 覆盖。

| Agent | 机制 | 说明 |
|-------|------|------|
| **Cursor** | `.cursor/rules/` 单文件 `.mdc` | 项目级规则文件，非全局 skill 目录 |
| **GitHub Copilot** | `.github/copilot-instructions.md` | 单文件指令，仓库级 |
| **Tabby** | 内置模型配置 | 无外部 skill 机制 |
| **Continue** | `~/.continue/config.json` | JSON 配置，非目录扫描 |

### 发现方式

所有 Tier 1~3 Agent 都遵循同一机制：扫描 skill 发现目录下的子目录，找到含 `SKILL.md` 的目录即加载为 skill。**symlink 被视为子目录**，在已确认的 Agent 中均正常工作。

---

## 修改范围

### 文件清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `src/paths.ts` | **重写** | 删除 `SKILL_TARGETS`，新增 `CANONICAL_SKILL_DIR`、`AGENT_SKILL_LINKS` 映射、`CONFIG_PATH` |
| `src/skills.ts` | 修改 | `buildTOC` 加 `name`；`writeSkills` 只写 canonical 目录；新增 `linkSkills` |
| `src/symlink.ts` | **新增** | symlink 创建/删除/检测逻辑 |
| `src/config.ts` | **新增** | 读取 `~/.agent-loadout/config.json` |
| `src/index.ts` | 修改 | `install`/`skills` 命令加 link 阶段 + `--agents` 参数 |
| `src/ui.ts` | 修改 | 新增 Agent 选择交互（checkbox） |
| `CLAUDE.md` | 修改 | 更新架构描述和 "What NOT to do" |

### 不改动的文件

| 文件 | 原因 |
|------|------|
| `src/catalog.ts` | 工具定义与 Agent 无关 |
| `src/installers/*.ts` | 安装逻辑与 Agent 无关 |
| `src/verify.ts` | 验证逻辑与 Agent 无关 |
| `src/receipt.ts` | 收据记录与 Agent 无关 |
| `src/skills/*.ts` | 单个 Skill 内容不变 |
| `src/platform.ts` | 平台检测不变 |

---

## 详细设计

### 1. `src/paths.ts` — 改为 canonical + link 映射

```ts
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

const BASE_DIR = join(homedir(), ".agent-loadout");

/** Canonical skill 目录 — 唯一写入点 */
export const CANONICAL_SKILL_DIR = join(
  homedir(), ".agents", "skills", "agent-loadout"
);

/** Agent 支持分级 */
export const AGENT_TIER: Record<string, 1 | 2 | 3> = {
  claude:     1, // Anthropic — 已确认
  pi:         1, // Earendil — 已确认
  codex:      1, // OpenAI — 已确认
  augment:    1, // Augment — 已确认
  qwen:       1, // Alibaba — 已确认
  gemini:     2, // Google — skills/ 目录已存在
  cline:      3, // Cline — 预埋
  roocode:    3, // Roo Code — 预埋
  amazonq:    3, // AWS — 预埋
  opencode:   3, // OpenCode — 预埋
  windsurf:   3, // Codeium — 预埋
  aider:      3, // Aider — 预埋
} as const;

/** 已知 Agent 的 skill 目录 → 全部通过 symlink 指向 canonical */
export const AGENT_SKILL_LINKS: Record<string, string> = {
  claude:     join(homedir(), ".claude", "skills", "agent-loadout"),
  pi:         join(homedir(), ".pi", "agent", "skills", "agent-loadout"),
  codex:      join(homedir(), ".codex", "skills", "agent-loadout"),
  augment:    join(homedir(), ".augment", "skills", "agent-loadout"),
  qwen:       join(homedir(), ".qwen", "skills", "agent-loadout"),
  gemini:     join(homedir(), ".gemini", "skills", "agent-loadout"),
  cline:      join(homedir(), ".cline", "skills", "agent-loadout"),
  roocode:    join(homedir(), ".roocode", "skills", "agent-loadout"),
  amazonq:    join(homedir(), ".amazonq", "skills", "agent-loadout"),
  opencode:   join(homedir(), ".opencode", "skills", "agent-loadout"),
  windsurf:   join(homedir(), ".windsurf", "skills", "agent-loadout"),
  aider:      join(homedir(), ".aider", "skills", "agent-loadout"),
};

/** Agent 可读名称（含厂商，方便用户识别） */
export const AGENT_LABELS: Record<string, string> = {
  claude:     "Claude Code (Anthropic)",
  pi:         "pi Coding Agent (Earendil)",
  codex:      "Codex CLI (OpenAI)",
  augment:    "Augment Code",
  qwen:       "Qwen Code (Alibaba)",
  gemini:     "Gemini CLI (Google)",
  cline:      "Cline",
  roocode:    "Roo Code",
  amazonq:    "Amazon Q Developer",
  opencode:   "OpenCode",
  windsurf:   "Windsurf (Codeium)",
  aider:      "Aider",
};

export const CONFIG_PATH = join(BASE_DIR, "config.json");

export const paths = {
  base: BASE_DIR,
  receipt: join(BASE_DIR, "receipt.json"),
  brewfile: process.platform === "darwin" ? join(BASE_DIR, "Brewfile") : null,
  localBin: join(homedir(), ".local", "bin"),
  canonicalSkillDir: CANONICAL_SKILL_DIR,
  agentSkillLinks: AGENT_SKILL_LINKS,
  configPath: CONFIG_PATH,
};

export async function ensureDir(): Promise<void> {
  await mkdir(paths.base, { recursive: true });
}

export async function ensureSkillDir(): Promise<void> {
  await mkdir(paths.canonicalSkillDir, { recursive: true });
}
```

**要点**：
- 旧 `SKILL_TARGETS` 变成 `AGENT_SKILL_LINKS`，语义从"写入目标"变为"symlink 目标"
- 旧 `GENERIC_SKILLS` (`~/.agent-loadout/skills/`) **彻底删除**，不再写入
- `ensureSkillDirs()` 改名为 `ensureSkillDir()`，只确保 canonical 目录存在

---

### 2. `src/symlink.ts` — 新增 symlink 管理模块

```ts
import { symlink, unlink, lstat } from "node:fs/promises";
import { CANONICAL_SKILL_DIR, AGENT_SKILL_LINKS } from "./paths.js";

export type AgentId = keyof typeof AGENT_SKILL_LINKS;

/** 检查某个 Agent 的 symlink 是否存在且指向正确 */
export async function isSymlinkValid(agent: AgentId): Promise<boolean> {
  const linkPath = AGENT_SKILL_LINKS[agent];
  try {
    const stat = await lstat(linkPath);
    if (!stat.isSymbolicLink()) return false;
    // 可进一步 readlink 校验，但 lstat + isSymbolicLink 基本够用
    return true;
  } catch {
    return false;
  }
}

/** 为指定 Agent 创建 symlink（幂等 — 已存在且正确则跳过） */
export async function createSymlink(agent: AgentId): Promise<"created" | "already-exists" | "blocked"> {
  const linkPath = AGENT_SKILL_LINKS[agent];
  try {
    const stat = await lstat(linkPath);
    if (stat.isSymbolicLink()) {
      // 已存在 symlink，假设正确（不强校验目标）
      return "already-exists";
    }
    // 存在普通文件/目录，阻塞
    return "blocked";
  } catch {
    // 不存在，创建
    await symlink(CANONICAL_SKILL_DIR, linkPath, "dir");
    return "created";
  }
}

/** 删除指定 Agent 的 symlink */
export async function removeSymlink(agent: AgentId): Promise<"removed" | "not-found" | "not-a-symlink"> {
  const linkPath = AGENT_SKILL_LINKS[agent];
  try {
    const stat = await lstat(linkPath);
    if (!stat.isSymbolicLink()) return "not-a-symlink";
    await unlink(linkPath);
    return "removed";
  } catch {
    return "not-found";
  }
}

/** 批量创建 symlink，返回每个 Agent 的结果 */
export async function createSymlinks(agents: AgentId[]): Promise<Record<AgentId, string>> {
  const results: Record<string, string> = {};
  for (const agent of agents) {
    results[agent] = await createSymlink(agent);
  }
  return results;
}
```

---

### 3. `src/skills.ts` — 只写 canonical，加 `name` 字段

#### 3a. `buildTOC` — 索引 SKILL.md 加 `name`

```ts
function buildTOC(tools: Tool[]): string {
  // ... 同上，只改 frontmatter 部分：
  return [
    "---",
    `name: agent-loadout`,                         // ← 新增
    `description: "${compactDescription}"`,
    "source: agent-loadout",
    "---",
    // ... 其余不变
  ].join("\n");
}
```

#### 3b. `writeSkills` — 只写 canonical 目录

```ts
export async function writeSkills(tools: Tool[]): Promise<number> {
  await ensureSkillDir();
  const dir = paths.canonicalSkillDir;  // 唯一写入点
  let written = 0;

  for (const tool of tools) {
    const content = SKILL_CONTENT[tool.id];
    if (!content) continue;
    const filename = skillFilename(tool.id);
    const frontmatter = buildFrontmatter(tool);
    await writeFile(join(dir, filename), frontmatter + content + "\n");
    written++;
  }

  // 写入索引 SKILL.md
  const toc = buildTOC(tools.filter((t) => SKILL_CONTENT[t.id]));
  await writeFile(join(dir, "SKILL.md"), toc);

  return written;
}
```

#### 3c. `findToolsMissingSkills` — 改为检查 canonical 目录

```ts
export async function findToolsMissingSkills(toolIds: string[]): Promise<string[]> {
  const dir = paths.canonicalSkillDir;  // ← 从 paths.skillTargets.claude 改过来
  const results = await Promise.all(
    toolIds.map(async (id) => {
      try {
        await access(join(dir, skillFilename(id)));
        return null;
      } catch {
        return id;
      }
    }),
  );
  return results.filter((id): id is string => id !== null);
}
```

---

### 4. `src/config.ts` — 新增配置文件模块

```ts
import { readFile } from "node:fs/promises";
import { paths } from "./paths.js";

export interface LoadoutConfig {
  /** 上次选择的 Agent 列表 */
  selectedAgents?: string[];
  /** 额外的 skill 目标目录（直接写入，非 symlink） */
  extraSkillDirs?: string[];
}

export async function readConfig(): Promise<LoadoutConfig | null> {
  try {
    const raw = await readFile(paths.configPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
```

---

### 5. `src/ui.ts` — 新增 Agent 选择交互

```ts
import { checkbox } from "@inquirer/prompts";
import { AGENT_LABELS, AGENT_TIER } from "./paths.js";

const TIER_BADGE: Record<number, string> = {
  1: "✅",
  2: "⬜",
  3: "🔮",
};

/** 让用户选择要将 skill symlink 到哪些 Agent */
export async function selectAgents(
  defaults: string[] = ["claude", "pi", "codex", "augment", "qwen"]
): Promise<string[]> {
  const choices = Object.entries(AGENT_LABELS).map(([id, label]) => {
    const tier = AGENT_TIER[id] ?? 3;
    const badge = TIER_BADGE[tier];
    const tierLabel = tier === 1 ? "已确认" : tier === 2 ? "待验证" : "预埋";
    return {
      name: `${badge} ${label} [${tierLabel}]`,
      value: id,
      checked: defaults.includes(id),
    };
  });

  return checkbox({
    message: "Select AI agents to enable skill discovery for:",
    choices,
  });
}
```

---

### 6. `src/index.ts` — install/skills 命令加 link 阶段

#### 6a. `install` 命令 — install → write → link

```ts
// install 命令末尾，writeSkills 之后：
// Write skills to canonical directory
const skillCount = await writeSkills(resolvedTools);
if (skillCount > 0) {
  console.log(chalk.dim(`\n  ${skillCount} skill files written to ~/.agents/skills/agent-loadout/`));
}

// Create symlinks (Tier 1 默认全选)
const defaultAgents = Object.entries(AGENT_TIER)
  .filter(([, tier]) => tier === 1)
  .map(([id]) => id);
const selectedAgents = opts.agents ?? await selectAgents(defaultAgents);
const linkResults = await createSymlinks(selectedAgents as AgentId[]);
for (const [agent, result] of Object.entries(linkResults)) {
  if (result === "created") {
    console.log(chalk.dim(`  🔗 ~${AGENT_SKILL_LINKS[agent].replace(homedir(), "")}`));
  } else if (result === "already-exists") {
    console.log(chalk.dim(`  ✓  ~${AGENT_SKILL_LINKS[agent].replace(homedir(), "")} (already linked)`));
  } else if (result === "blocked") {
    console.log(chalk.yellow(`  ⚠  ~${AGENT_SKILL_LINKS[agent].replace(homedir(), "")} blocked — real directory exists`));
  }
}
```

#### 6b. `skills` 命令 — 加 `--agents` / `--link` / `--unlink`

```ts
program
  .command("skills")
  .description("Manage skill files and agent symlinks")
  .option("--force", "Rewrite skill files for all installed tools")
  .option("--agents <agents...>", "Agents to link: claude, pi, codex, augment, qwen, gemini, cline, roocode, amazonq, opencode, windsurf, aider")
  .option("--link", "Create symlinks for selected agents")
  .option("--unlink <agents...>", "Remove symlinks for specified agents")
  .action(async (opts) => {
    // ... writeSkills 逻辑同上 ...
    // link 逻辑：
    if (opts.link || opts.agents) {
      const agents = opts.agents ?? await selectAgents();
      await createSymlinks(agents);
    }
    if (opts.unlink) {
      for (const agent of opts.unlink) {
        await removeSymlink(agent);
      }
    }
  });
```

---

## CLI 命令最终形态

```bash
# 安装时交互选择 Agent
npx agent-loadout install
# 交互选 Agent（Tier 1 默认全选: claude, pi, codex, augment, qwen）

# 安装并指定 Agent
npx agent-loadout install --agents claude pi codex

# 安装并覆盖所有已知 Agent（含 Tier 2/3 预埋）
npx agent-loadout install --agents claude pi codex augment qwen gemini cline roocode amazonq opencode windsurf aider

# 单独管理 skill — 重写 + 重新 link
npx agent-loadout skills --force --link

# 单独管理 skill — 增删 symlink
npx agent-loadout skills --link --agents gemini
npx agent-loadout skills --unlink cline
```

---

## 向后兼容策略

| 场景 | 行为 |
|------|------|
| 已有 Claude Code 用户（旧 `~/.claude/skills/agent-loadout/` 是真实目录）| `createSymlink` 检测到已存在非 symlink 目录，返回 `"blocked"`，提示用户手动处理 |
| 已有 Claude Code 用户（旧路径已是 symlink）| `createSymlink` 返回 `"already-exists"`，跳过 |
| `~/.agent-loadout/skills/` 旧路径 | **不再写入**，已存在的旧文件不主动删除 |
| 纯新安装 | 写入 canonical → 交互选 Agent → 创建 symlink |
| 旧版 receipt.json | 不影响，receipt 和 skill 路径无关 |

**升级引导**：
1. 检测旧 `~/.claude/skills/agent-loadout/` 是否为真实目录
2. 若是，提示用户：`"Detected old agent-loadout skill directory. Recommend: rm -rf ~/.claude/skills/agent-loadout && agent-loadout skills --force --link"`
3. 旧 `~/.agent-loadout/skills/` 残留目录提示用户可手动删除

---

## 环境变量扩展

```bash
# 追加额外写入目录（非 symlink，直接复制文件）
AGENT_LOADOUT_EXTRA_SKILL_DIRS="~/my-skills:~/another-dir" npx agent-loadout skills --force
```

`extraSkillDirs` 也支持通过 `~/.agent-loadout/config.json` 配置（优先级低于环境变量）。

---

## 不做的事情

- **不做 Cursor Rules / Copilot Instructions**：这些 Agent 的指令机制完全不同（单文件指令 vs 目录 + SKILL.md 发现），需要另开议题
- **不做 Windows 适配**：symlink 在 Windows 上需要管理员权限或开发者模式，本次只保证 macOS/Linux
- **不改 Skill 内容本身**：60+ 个 Skill 文件的质量提升是另一个话题
- **不主动清理旧文件**：`~/.agent-loadout/skills/` 和旧 `~/.claude/skills/agent-loadout/` 真实目录只提示不删除

---

## 验证方式

1. 安装后检查 canonical 文件：
   ```bash
   ls ~/.agents/skills/agent-loadout/
   # 应有 SKILL.md + rg.md + fd.md + ...
   ```

2. 检查 symlink：
   ```bash
   ls -la ~/.pi/agent/skills/agent-loadout
   # lrwxr-xr-x ... agent-loadout -> /Users/sunzk/.agents/skills/agent-loadout
   ls -la ~/.claude/skills/agent-loadout
   # 同上（或已是 symlink）
   ```

3. pi 启动验证：
   ```bash
   # pi 会打印 loaded skills，确认 agent-loadout 在列表中
   ```

4. 旧路径不再有写入：
   ```bash
   ls ~/.agent-loadout/skills/  2>/dev/null
   # 新安装下应不存在
   ```

5. SKILL.md frontmatter 验证：
   ```bash
   head -5 ~/.agents/skills/agent-loadout/SKILL.md
   # 第一行 ---，第二行 name: agent-loadout
   ```
