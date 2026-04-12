/**
 * Coloured terminal output using ANSI escape codes directly.
 * No chalk, kleur, or any dependency.
 */

const ESC = "\x1b[";
const RESET = `${ESC}0m`;

const codes = {
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  gray: `${ESC}90m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
} as const;

function supportsColor(): boolean {
  if (typeof process === "undefined") return false;
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR !== undefined) return true;
  if (process.stdout && "isTTY" in process.stdout) return !!process.stdout.isTTY;
  return false;
}

const useColor = supportsColor();

function wrap(code: string, text: string): string {
  return useColor ? `${code}${text}${RESET}` : text;
}

export const color = {
  red: (t: string) => wrap(codes.red, t),
  green: (t: string) => wrap(codes.green, t),
  yellow: (t: string) => wrap(codes.yellow, t),
  blue: (t: string) => wrap(codes.blue, t),
  magenta: (t: string) => wrap(codes.magenta, t),
  cyan: (t: string) => wrap(codes.cyan, t),
  gray: (t: string) => wrap(codes.gray, t),
  bold: (t: string) => wrap(codes.bold, t),
  dim: (t: string) => wrap(codes.dim, t),
} as const;

export function success(msg: string): void {
  console.log(`${color.green("✓")} ${msg}`);
}

export function info(msg: string): void {
  console.log(`${color.blue("ℹ")} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`${color.yellow("⚠")} ${msg}`);
}

export function error(msg: string): void {
  console.error(`${color.red("✗")} ${msg}`);
}

export function verbose(msg: string, isVerbose: boolean): void {
  if (isVerbose) console.log(`${color.dim(`  ${msg}`)}`);
}
