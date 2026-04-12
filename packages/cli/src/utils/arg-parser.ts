/**
 * Minimal argument parser. Supports:
 *   --flag           → { flag: true }
 *   --flag=value     → { flag: "value" }
 *   --flag value     → { flag: "value" }
 *   --no-flag        → { flag: false }
 *   positional       → positionals[]
 *
 * Zero dependencies.
 */

export interface ParsedArgs {
  readonly flags: Readonly<Record<string, string | boolean>>;
  readonly positionals: readonly string[];
  readonly command: string | undefined;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  let command: string | undefined;

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i] as string;

    if (arg === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        const key = camelCase(arg.slice(2, eqIdx));
        flags[key] = arg.slice(eqIdx + 1);
      } else {
        const raw = arg.slice(2);
        if (raw.startsWith("no-")) {
          flags[camelCase(raw.slice(3))] = false;
        } else {
          const key = camelCase(raw);
          const next = argv[i + 1];
          if (next !== undefined && !next.startsWith("-")) {
            flags[key] = next;
            i++;
          } else {
            flags[key] = true;
          }
        }
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      const key = arg[1] as string;
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (command === undefined && !arg.startsWith("-")) {
      command = arg;
    } else {
      positionals.push(arg);
    }

    i++;
  }

  return { flags, positionals, command };
}

function camelCase(s: string): string {
  return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
