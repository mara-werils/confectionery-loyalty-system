import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { logger } from '../utils/logger';

interface ClaudeResponse {
  result: string;
  session_id?: string;
  usage?: { input_tokens: number; output_tokens: number };
  total_cost_usd?: number;
}

// Resolve Claude CLI binary path
const CLAUDE_PATHS = [
  '/home/intern/.nvm/versions/node/v22.22.3/bin/claude',
  '/usr/local/bin/claude',
  '/usr/bin/claude',
  'claude', // fallback to PATH
];

function getClaudeBin(): string {
  for (const p of CLAUDE_PATHS) {
    if (p === 'claude' || existsSync(p)) return p;
  }
  return 'claude';
}

const NODE_BIN_DIR = '/home/intern/.nvm/versions/node/v22.22.3/bin';

/**
 * Call Claude Code CLI in non-interactive pipe mode.
 * Falls back to a plaintext response if JSON parsing fails.
 */
export async function askClaude(prompt: string, options?: {
  timeout?: number;
  systemPrompt?: string;
}): Promise<string> {
  const timeout = options?.timeout ?? 60_000;
  const claudeBin = getClaudeBin();

  const args = ['-p', prompt, '--output-format', 'json'];
  if (options?.systemPrompt) {
    args.push('--system-prompt', options.systemPrompt);
  }

  return new Promise((resolve, reject) => {
    const child = execFile(claudeBin, args, {
      timeout,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024, // 1MB
      env: { ...process.env, PATH: `${NODE_BIN_DIR}:${process.env.PATH ?? ''}` },
    }, (error, stdout, stderr) => {
      if (error) {
        logger.error('[Claude] CLI error:', error.message);
        if (stderr) logger.error('[Claude] stderr:', stderr);
        return reject(new Error(`Claude CLI failed: ${error.message}`));
      }

      try {
        const parsed: ClaudeResponse = JSON.parse(stdout);
        if (parsed.usage) {
          logger.info(`[Claude] tokens: in=${parsed.usage.input_tokens} out=${parsed.usage.output_tokens} cost=$${parsed.total_cost_usd ?? '?'}`);
        }
        resolve(parsed.result);
      } catch {
        // If not JSON, return raw text
        resolve(stdout.trim());
      }
    });

    child.stdin?.end();
  });
}

/**
 * Ask Claude and parse the result as JSON.
 */
export async function askClaudeJSON<T = unknown>(prompt: string, options?: {
  timeout?: number;
  systemPrompt?: string;
}): Promise<T> {
  const raw = await askClaude(prompt, options);

  // Extract JSON from markdown code blocks if present
  const jsonMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : raw;

  try {
    return JSON.parse(jsonStr!.trim());
  } catch {
    logger.error('[Claude] Failed to parse JSON response:', raw.slice(0, 500));
    throw new Error('Claude returned invalid JSON');
  }
}
