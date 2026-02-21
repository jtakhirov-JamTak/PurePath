import { processRegistry, getProcess, getProcessByPath } from "../client/src/lib/process-registry.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}`);
    failed++;
  }
}

console.log("=== Navigation Framework Smoke Tests ===\n");

console.log("1) returnTo sanitization");

function isValidReturnTo(path: string | null): boolean {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  return true;
}

assert(isValidReturnTo("/dashboard") === true, "Internal path /dashboard accepted");
assert(isValidReturnTo("/plan") === true, "Internal path /plan accepted");
assert(isValidReturnTo("/goal-wizard?step=3") === true, "Path with query accepted");
assert(isValidReturnTo(null) === false, "null rejected");
assert(isValidReturnTo("") === false, "Empty string rejected");
assert(isValidReturnTo("https://evil.com") === false, "External URL rejected");
assert(isValidReturnTo("//evil.com") === false, "Protocol-relative URL rejected");
assert(isValidReturnTo("javascript://alert(1)") === false, "javascript: URL rejected");
assert(isValidReturnTo("data://text") === false, "data: URL rejected");
assert(isValidReturnTo("ftp://server") === false, "ftp: URL rejected");

console.log("");

console.log("2) buildProcessUrl");

function buildProcessUrl(path: string, returnTo?: string): string {
  if (!returnTo) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}returnTo=${encodeURIComponent(returnTo)}`;
}

assert(buildProcessUrl("/goal-wizard") === "/goal-wizard", "No returnTo = plain path");
assert(buildProcessUrl("/goal-wizard", "/plan") === "/goal-wizard?returnTo=%2Fplan", "returnTo appended as query param");
assert(buildProcessUrl("/goal-wizard?step=1", "/dashboard") === "/goal-wizard?step=1&returnTo=%2Fdashboard", "Existing query uses & separator");

console.log("");

console.log("3) Process registry integrity");

const entries = Object.values(processRegistry);
assert(entries.length > 0, "Registry has processes");

for (const entry of entries) {
  assert(entry.id.length > 0, `${entry.id}: has non-empty id`);
  assert(entry.path.startsWith("/"), `${entry.id}: path starts with /`);
  assert(entry.defaultReturnTo.startsWith("/"), `${entry.id}: defaultReturnTo starts with /`);
  assert(typeof entry.requiresDirtyGuard === "boolean", `${entry.id}: requiresDirtyGuard is boolean`);
}

assert(getProcess("goal-wizard")?.path === "/goal-wizard", "getProcess finds goal-wizard");
assert(getProcess("nonexistent") === undefined, "getProcess returns undefined for unknown");
assert(getProcessByPath("/goal-wizard")?.id === "goal-wizard", "getProcessByPath finds by path");
assert(getProcessByPath("/nonexistent") === undefined, "getProcessByPath returns undefined for unknown");

console.log("");

console.log("4) Deep link fallback");

function resolveReturnTo(raw: string | null, fallback: string): string {
  return isValidReturnTo(raw) ? raw! : fallback;
}

assert(resolveReturnTo(null, "/dashboard") === "/dashboard", "null returnTo falls back to default");
assert(resolveReturnTo("", "/dashboard") === "/dashboard", "Empty returnTo falls back to default");
assert(resolveReturnTo("https://evil.com", "/dashboard") === "/dashboard", "External URL falls back to default");
assert(resolveReturnTo("/plan", "/dashboard") === "/plan", "Valid returnTo is used");

console.log("");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
