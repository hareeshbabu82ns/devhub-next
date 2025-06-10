/**
 * SQLite Database Implementation for Dictionary Import
 *
 * This module provides a concrete implementation of the SqliteDatabase interface
 * using the sqlite3 package for Node.js.
 */

import { SqliteDatabase } from "./dictionary-import-orchestrator";
import Database from "better-sqlite3";

/**
 * SQLite database implementation using better-sqlite3
 */
export class BetterSqliteDatabase implements SqliteDatabase {
  private db: Database.Database;

  constructor(private dbPath: string) {
    this.db = new Database(dbPath, { readonly: true });
  }

  async query(sql: string): Promise<any[]> {
    try {
      const stmt = this.db.prepare(sql);
      const results = stmt.all();
      return results;
    } catch (error) {
      console.error(`SQLite query failed: ${sql}`, error);
      throw error;
    }
  }

  async getTableInfo(
    tableName: string,
  ): Promise<{ name: string; type: string }[]> {
    try {
      const sql = `PRAGMA table_info(${tableName})`;
      const results = await this.query(sql);
      return results.map((row: any) => ({
        name: row.name,
        type: row.type,
      }));
    } catch (error) {
      console.error(`Failed to get table info for ${tableName}:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      this.db.close();
    } catch (error) {
      console.error(`Failed to close SQLite database ${this.dbPath}:`, error);
      throw error;
    }
  }

  /**
   * Check if database file exists and is accessible
   */
  static async validateDatabase(dbPath: string): Promise<boolean> {
    try {
      const db = new Database(dbPath, { readonly: true });
      // Try to execute a simple query
      db.prepare("SELECT 1").get();
      db.close();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create SQLite database instances
 */
export async function createSqliteDatabase(
  dbPath: string,
): Promise<SqliteDatabase> {
  // Validate database exists and is accessible
  const isValid = await BetterSqliteDatabase.validateDatabase(dbPath);
  if (!isValid) {
    throw new Error(`Invalid or inaccessible SQLite database: ${dbPath}`);
  }

  return new BetterSqliteDatabase(dbPath);
}
