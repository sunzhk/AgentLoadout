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
