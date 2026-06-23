import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

const BASE_DIR = join(homedir(), ".agent-loadout");

/** Canonical skill 目录 — 唯一写入点 */
export const CANONICAL_SKILL_DIR = join(
  homedir(), ".agents", "skills", "agent-loadout",
);

/** Agent 支持分级：1=已确认, 2=待验证, 3=预埋 */
export const AGENT_TIER: Record<string, 1 | 2 | 3> = {
  claude:     1, // Anthropic
  pi:         1, // Earendil
  codex:      1, // OpenAI
  augment:    1, // Augment
  qwen:       1, // Alibaba
  gemini:     2, // Google — skills/ 目录已存在
  cline:      3, // 预埋
  roocode:    3, // 预埋
  amazonq:    3, // 预埋
  opencode:   3, // 预埋
  windsurf:   3, // 预埋
  aider:      3, // 预埋
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
  /** null on non-darwin platforms */
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
