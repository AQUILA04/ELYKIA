import { spawn } from 'node:child_process';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:8081';
const BACKEND_DIR =
  process.env['E2E_BACKEND_DIR'] ?? path.resolve(__dirname, '../../../backend');
const PROFILE = process.env['E2E_BACKEND_PROFILE'] ?? 'francis';
const PORT = Number(new URL(API_URL).port || 8081);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function isBackendUp(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/actuator/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function waitForBackend(up: boolean, timeoutMs = 180_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await isBackendUp()) === up) {
      return;
    }
    await sleep(1500);
  }
  throw new Error(`Le backend n'est pas passé ${up ? 'UP' : 'DOWN'} en ${timeoutMs} ms`);
}

async function killListenerOnPort(port: number): Promise<void> {
  const script = [
    `$c = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1;`,
    `if (-not $c) { return };`,
    `$proc = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $c.OwningProcess);`,
    `if ($proc -and $proc.ParentProcessId) { taskkill /PID $proc.ParentProcessId /T /F | Out-Null };`,
    `taskkill /PID $c.OwningProcess /T /F | Out-Null`,
  ].join(' ');
  await execFileAsync('powershell.exe', ['-NoProfile', '-Command', script], {
    windowsHide: true,
  }).catch(() => undefined);
}

export async function stopBackend(): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await killListenerOnPort(PORT);
    if (!(await isBackendUp())) {
      await waitForBackend(false, 20_000);
      return;
    }
    await sleep(2000);
  }
  await waitForBackend(false, 30_000);
}

export async function startBackend(): Promise<void> {
  if (await isBackendUp()) {
    return;
  }

  const child = spawn(
    `mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=${PROFILE}"`,
    {
      cwd: BACKEND_DIR,
      detached: true,
      stdio: 'ignore',
      shell: true,
      windowsHide: true,
    },
  );
  child.unref();
  await waitForBackend(true, 180_000);
}
