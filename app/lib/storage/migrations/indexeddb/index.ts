import type { IDBPDatabase, IDBPTransaction } from "idb";
import { applyIndexedDbV1Migration } from "./v1";
import { createLogger } from "@/lib/logger";

const logger = createLogger("IndexedDB Migration");

export async function runIndexedDbMigrations(
  db: IDBPDatabase<unknown>,
  oldVersion: number,
  newVersion: number | null,
  tx: IDBPTransaction<unknown, string[], "versionchange">,
) {
  if (oldVersion < 1) {
    applyIndexedDbV1Migration(db, tx);
  }

  logger.info("Applied migrations", { targetVersion: newVersion ?? "unknown" });
}
