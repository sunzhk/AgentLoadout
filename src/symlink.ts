import { symlink, unlink, lstat, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { CANONICAL_SKILL_DIR, AGENT_SKILL_LINKS } from "./paths.js";

export type AgentId = keyof typeof AGENT_SKILL_LINKS;

/** 检查某个 Agent 的 symlink 是否存在且指向正确 */
export async function isSymlinkValid(agent: AgentId): Promise<boolean> {
  const linkPath = AGENT_SKILL_LINKS[agent];
  try {
    const stat = await lstat(linkPath);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}

/** 为指定 Agent 创建 symlink（幂等） */
export async function createSymlink(
  agent: AgentId,
): Promise<"created" | "already-exists" | "blocked"> {
  const linkPath = AGENT_SKILL_LINKS[agent];
  try {
    const stat = await lstat(linkPath);
    if (stat.isSymbolicLink()) {
      return "already-exists";
    }
    // 存在普通文件/目录，阻塞
    return "blocked";
  } catch {
    // 不存在 — 确保父目录存在后创建 symlink
    await mkdir(dirname(linkPath), { recursive: true });
    await symlink(CANONICAL_SKILL_DIR, linkPath, "dir");
    return "created";
  }
}

/** 删除指定 Agent 的 symlink */
export async function removeSymlink(
  agent: AgentId,
): Promise<"removed" | "not-found" | "not-a-symlink"> {
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

/** 批量创建 symlink */
export async function createSymlinks(
  agents: AgentId[],
): Promise<Record<string, "created" | "already-exists" | "blocked">> {
  const results: Record<string, "created" | "already-exists" | "blocked"> = {};
  for (const agent of agents) {
    results[agent] = await createSymlink(agent);
  }
  return results;
}
