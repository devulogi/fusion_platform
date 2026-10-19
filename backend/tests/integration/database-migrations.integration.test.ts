import { randomUUID } from 'node:crypto';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, describe, it } from 'vitest';
import { DEFAULT_TRADE_PAGE_SIZE } from '../../src/constants.ts';

const postgresImage = 'postgres:16-alpine';
const databaseUser = 'postgres';
const databasePassword = 'integration-only-password';
const cleanDatabase = 'fusion_clean';
const upgradeDatabase = 'fusion_upgrade';
const previousMigration = '20261014000000_init_trade';
const databaseStartupAttempts = 60;
const backendStartupAttempts = 80;
const startupIntervalMs = 250;
const integrationTestTimeoutMs = 120_000;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const backendDirectory = resolve(scriptDirectory, '../..');
const workspaceDirectory = resolve(backendDirectory, '..');
const suffix = `${process.pid}-${randomUUID().slice(0, 8)}`;
const containerName = `fusion-platform-db-integration-${suffix}`;
const volumeName = `fusion-platform-db-integration-${suffix}`;

function docker(args: string[], input?: string): string {
  return execFileSync('docker', args, {
    encoding: 'utf8',
    ...(input === undefined ? {} : { input }),
  });
}

function dockerQuietly(args: string[]): void {
  try {
    execFileSync('docker', args, { stdio: 'ignore' });
  } catch {
    // Cleanup is best-effort when Docker setup failed before creating a resource.
  }
}

function dockerCommandSucceeds(args: string[]): boolean {
  try {
    execFileSync('docker', args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function databasePsql(database: string, query: string): string {
  return docker([
    'exec',
    containerName,
    'psql',
    '--tuples-only',
    '--no-align',
    '--set',
    'ON_ERROR_STOP=1',
    '--username',
    databaseUser,
    '--dbname',
    database,
    '--command',
    query,
  ]).trim();
}

function runMigrations(database: string): void {
  try {
    docker([
      'exec',
      '--env',
      `POSTGRES_USER=${databaseUser}`,
      '--env',
      `POSTGRES_DB=${database}`,
      containerName,
      'sh',
      '/database-scripts/migrate.sh',
    ]);
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Migration history failed for disposable database ${database}: ${reason}`, {
      cause: error,
    });
  }
}

function assertCurrentSchema(database: string): void {
  const schemaIsCurrent = databasePsql(
    database,
    `SELECT
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Trade'
          AND column_name = 'tradeTimestamp'
          AND data_type = 'timestamp with time zone'
      )
          AND to_regclass('public."Trade_tradeTimestamp_idx"') IS NULL
      AND to_regclass('public."Trade_tradeTimestamp_id_idx"') IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Trade'
          AND column_name = 'tradeDate'
      );`,
  );

  if (schemaIsCurrent !== 't') {
    throw new Error(
      `Database ${database} does not match the current Prisma schema: expected Trade.tradeTimestamp without a timestamp index.`,
    );
  }
}

async function reserveBackendPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Could not reserve a local backend port for the integration check.');
  }
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error?: Error) => {
      if (error !== undefined) rejectClose(error);
      else resolveClose();
    });
  });
  return address.port;
}

async function waitForDatabase(): Promise<void> {
  for (let attempt = 0; attempt < databaseStartupAttempts; attempt += 1) {
    const canConnect = dockerCommandSucceeds([
      'exec',
      containerName,
      'psql',
      '--tuples-only',
      '--no-align',
      '--username',
      databaseUser,
      '--dbname',
      cleanDatabase,
      '--command',
      'SELECT 1',
    ]);
    if (canConnect) return;
    await delay(startupIntervalMs);
  }

  throw new Error('Disposable PostgreSQL did not become ready within the startup check window.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

async function stopBackend(backendProcess: ChildProcess): Promise<void> {
  if (backendProcess.exitCode !== null || backendProcess.signalCode !== null) return;

  const exited = new Promise<void>((resolveExit) => {
    backendProcess.once('exit', () => resolveExit());
  });
  backendProcess.kill('SIGTERM');
  await exited;
}

async function verifyBackend(port: number): Promise<ChildProcess> {
  const backendProcess = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
    cwd: backendDirectory,
    env: {
      ...process.env,
      DATABASE_URL: `postgresql://${databaseUser}:${databasePassword}@${postgresHost}:${postgresPort}/${upgradeDatabase}?schema=public`,
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let backendOutput = '';
  backendProcess.stdout?.on('data', (chunk: Buffer | string) => {
    backendOutput = `${backendOutput}${chunk.toString()}`.slice(-4000);
  });
  backendProcess.stderr?.on('data', (chunk: Buffer | string) => {
    backendOutput = `${backendOutput}${chunk.toString()}`.slice(-4000);
  });

  try {
    let ready = false;
    for (let attempt = 0; attempt < backendStartupAttempts; attempt += 1) {
      if (backendProcess.exitCode !== null || backendProcess.signalCode !== null) {
        throw new Error(`Backend exited before readiness. Output: ${backendOutput}`);
      }

      try {
        const response = await fetch(`http://127.0.0.1:${port}/ready`);
        if (response.status === 200) {
          ready = true;
          break;
        }
      } catch {
        await delay(startupIntervalMs);
      }
    }

    if (!ready) {
      throw new Error(`Backend did not report readiness. Output: ${backendOutput}`);
    }

    const tradesResponse = await fetch(`http://127.0.0.1:${port}/api/v1/trades`);
    if (tradesResponse.status !== 200) {
      throw new Error(`Trade collection returned HTTP ${tradesResponse.status}.`);
    }

    const payload: unknown = await tradesResponse.json();
    if (!isRecord(payload) || !isUnknownArray(payload.items) || !isRecord(payload.pagination)) {
      throw new Error(
        'Trade collection did not return the expected { items, pagination } response.',
      );
    }

    const existingTrade = payload.items.find(
      (item: unknown): item is Record<string, unknown> =>
        isRecord(item) && item.id === 'migration-preserved-trade',
    );
    if (
      payload.pagination.pageSize !== DEFAULT_TRADE_PAGE_SIZE ||
      payload.pagination.page !== 1 ||
      payload.pagination.totalItems !== 1 ||
      payload.pagination.pageCount !== 1 ||
      !isRecord(existingTrade) ||
      existingTrade.tradeTimestamp !== '2026-10-18T12:00:00.000Z' ||
      'tradeDate' in existingTrade
    ) {
      throw new Error(
        'Backend hydration/API did not return the preserved trade with tradeTimestamp.',
      );
    }

    await stopBackend(backendProcess);
    return backendProcess;
  } catch (error: unknown) {
    await stopBackend(backendProcess);
    throw error;
  }
}

let postgresPort = 0;
let postgresHost = '';

async function runIntegrationCheck(): Promise<void> {
  docker(['volume', 'create', volumeName]);
  docker([
    'run',
    '--detach',
    '--name',
    containerName,
    '--publish',
    '0.0.0.0::5432',
    '--volume',
    `${volumeName}:/var/lib/postgresql/data`,
    '--env',
    `POSTGRES_USER=${databaseUser}`,
    '--env',
    `POSTGRES_PASSWORD=${databasePassword}`,
    '--env',
    `POSTGRES_DB=${cleanDatabase}`,
    postgresImage,
  ]);
  docker(['exec', containerName, 'mkdir', '-p', '/database-migrations', '/database-scripts']);
  docker([
    'cp',
    `${resolve(workspaceDirectory, 'database/migrations')}/.`,
    `${containerName}:/database-migrations/`,
  ]);
  docker([
    'cp',
    `${resolve(workspaceDirectory, 'database/scripts')}/.`,
    `${containerName}:/database-scripts/`,
  ]);
  const publishedPort = docker(['port', containerName, '5432/tcp']).trim();
  const portText = publishedPort.slice(publishedPort.lastIndexOf(':') + 1);
  postgresPort = Number(portText);
  postgresHost = docker([
    'network',
    'inspect',
    'bridge',
    '--format',
    '{{(index .IPAM.Config 0).Gateway}}',
  ]).trim();
  if (!Number.isInteger(postgresPort) || postgresPort < 1) {
    throw new Error(`Could not determine disposable PostgreSQL port from: ${publishedPort}`);
  }
  if (postgresHost.length === 0) {
    throw new Error('Could not determine the Docker bridge host for the disposable database.');
  }

  await waitForDatabase();
  runMigrations(cleanDatabase);
  assertCurrentSchema(cleanDatabase);

  databasePsql(cleanDatabase, `CREATE DATABASE "${upgradeDatabase}";`);
  const initialMigrationPath = resolve(
    workspaceDirectory,
    'database/migrations',
    previousMigration,
    'migration.sql',
  );
  const initialMigration = await readFile(initialMigrationPath, 'utf8');
  const priorStateSql = `${initialMigration}
CREATE TABLE "_fusion_platform_migrations" (
  "name" TEXT PRIMARY KEY,
  "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO "_fusion_platform_migrations" ("name") VALUES ('${previousMigration}');
INSERT INTO "Trade" (
  "id", "symbol", "quantity", "price", "side", "trader", "tradeDate", "status"
) VALUES (
  'migration-preserved-trade', 'AAPL', 100, 185.2500, 'BUY', 'Integration Trader',
  '2026-10-18T12:00:00Z', 'ACTIVE'
);
`;
  docker(
    [
      'exec',
      '--interactive',
      containerName,
      'psql',
      '--set',
      'ON_ERROR_STOP=1',
      '--username',
      databaseUser,
      '--dbname',
      upgradeDatabase,
    ],
    priorStateSql,
  );
  runMigrations(upgradeDatabase);
  assertCurrentSchema(upgradeDatabase);

  if (
    databasePsql(
      upgradeDatabase,
      `SELECT EXISTS (
        SELECT 1
        FROM "Trade"
        WHERE "id" = 'migration-preserved-trade'
          AND "tradeTimestamp" = '2026-10-18T12:00:00Z'::timestamptz
      );`,
    ) !== 't'
  ) {
    throw new Error('The prior-migration upgrade did not preserve its existing trade row.');
  }

  const backendPort = await reserveBackendPort();
  await verifyBackend(backendPort);
  process.stdout.write(
    'Database integration check passed: clean install, prior-migration upgrade, preserved row, current schema/index, backend readiness, hydration, and API response.\n',
  );
}

afterAll(() => {
  dockerQuietly(['rm', '--force', containerName]);
  dockerQuietly(['volume', 'rm', '--force', volumeName]);
});

describe('database migration integration', () => {
  it(
    'migrates clean and existing databases before backend hydration',
    async () => runIntegrationCheck(),
    integrationTestTimeoutMs,
  );
});
