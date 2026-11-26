/**
 * The built /og/preppy route must return a real 1200x630 PNG.
 * An empty image/png body is the failure mode when font bytes are HTML.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const failures: string[] = [];

function check(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

const route = readFileSync(join(process.cwd(), "app/og/preppy/route.tsx"), "utf8");
check(
  !route.includes('new URL("/fonts/'),
  "OG route still fetches fonts from the deployment URL"
);
check(route.includes("PlayfairDisplay-Regular.ttf"), "OG route must load the regular font file");
check(route.includes("PlayfairDisplay-Medium.ttf"), "OG route must load the medium font file");

const port = 3461;
const origin = `http://127.0.0.1:${port}`;

function pngSize(bytes: Buffer): { width: number; height: number } {
  const signature = bytes.subarray(0, 8).toString("hex");
  check(signature === "89504e470d0a1a0a", `PNG signature was ${signature}`);
  check(bytes.subarray(12, 16).toString("ascii") === "IHDR", "PNG is missing an IHDR chunk");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function expectPng(path: string) {
  const response = await fetch(origin + path);
  const type = response.headers.get("content-type") ?? "";
  const bytes = Buffer.from(await response.arrayBuffer());
  check(response.status === 200, `${path} status ${response.status}`);
  check(type.includes("image/png"), `${path} content-type ${type}`);
  check(bytes.length > 10000, `${path} PNG is ${bytes.length} bytes`);
  const size = pngSize(bytes);
  check(size.width === 1200 && size.height === 630, `${path} is ${size.width}x${size.height}`);
  console.log(`${path} ${bytes.length} bytes ${size.width}x${size.height}`);
}

const nextBin = join(process.cwd(), "node_modules/next/dist/bin/next");
const server: ChildProcess = spawn(process.execPath, [nextBin, "start", "--port", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});

let serverLog = "";
server.stdout?.on("data", (chunk: Buffer) => {
  serverLog += chunk.toString();
});
server.stderr?.on("data", (chunk: Buffer) => {
  serverLog += chunk.toString();
});

function stop() {
  if (server.pid == null || server.exitCode != null) return;
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}

async function waitUntilReady() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode != null) {
      throw new Error(`next start exited ${server.exitCode}\n${serverLog}`);
    }
    try {
      const response = await fetch(origin + "/og/preppy");
      if (response.status > 0) {
        await response.arrayBuffer();
        return;
      }
    } catch {
      // Server is still binding the port.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`next start did not become ready\n${serverLog}`);
}

try {
  await waitUntilReady();
  await expectPng("/og/preppy");
  await expectPng("/og/preppy?v=x");
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  stop();
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("og png guard passed");
process.exit(0);
