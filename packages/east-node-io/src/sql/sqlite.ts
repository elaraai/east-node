/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */

/**
 * SQLite platform functions for East Node IO.
 *
 * Provides SQLite database operations for East programs, including
 * connection management and parameterized query execution.
 *
 * @packageDocumentation
 */

import { match, BlobType, BooleanType, DateTimeType, East, FloatType, IntegerType, isValueOf, NullType, SortedMap, variant } from "@elaraai/east";
import type { ValueTypeOf } from "@elaraai/east";
import type { PlatformFunctionDef, PlatformFunction } from "@elaraai/east/internal";
import { EastError } from "@elaraai/east/internal";
import Database from 'better-sqlite3';
import { createHandle, getConnection, closeHandle, closeAllHandles } from '../connection/index.js';
import {
    SqliteConfigType,
    ConnectionHandleType,
    SqlParametersType,
    SqlResultType,
    StringType,
    SqlParameterType
} from './types.js';

/**
 * SQLite storage classes and common type affinities.
 *
 * SQLite has 5 storage classes: NULL, INTEGER, REAL, TEXT, and BLOB.
 * Column types are case-insensitive and can be custom strings, but these
 * are the standard affinities used in practice.
 *
 * @see https://www.sqlite.org/datatype3.html
 */
type SqliteColumnType =
    // Integer affinity
    | 'INTEGER' | 'INT' | 'TINYINT' | 'SMALLINT' | 'MEDIUMINT' | 'BIGINT'
    | 'UNSIGNED BIG INT' | 'INT2' | 'INT8'
    // Real affinity
    | 'REAL' | 'DOUBLE' | 'DOUBLE PRECISION' | 'FLOAT'
    // Text affinity
    | 'TEXT' | 'CHARACTER' | 'VARCHAR' | 'VARYING CHARACTER' | 'NCHAR'
    | 'NATIVE CHARACTER' | 'NVARCHAR' | 'CLOB'
    // Blob affinity
    | 'BLOB'
    // Numeric affinity (can be INTEGER or REAL)
    | 'NUMERIC' | 'DECIMAL' | 'BOOLEAN' | 'DATE' | 'DATETIME'

/**
 * Connects to a SQLite database.
 *
 * Opens a SQLite database file and returns an opaque handle for use in queries.
 * Supports both file-based and in-memory databases.
 *
 * This is a platform function for the East language, enabling SQLite database
 * operations in East programs running on Node.js.
 *
 * @param config - SQLite connection configuration
 * @returns Connection handle (opaque string)
 *
 * @throws {EastError} When connection fails due to:
 * - Invalid file path (location: "sqlite_connect")
 * - Permission denied (location: "sqlite_connect")
 * - Database file is locked (location: "sqlite_connect")
 *
 * @example
 * ```ts
 * import { East, StringType } from "@elaraai/east";
 * import { SQL } from "@elaraai/east-node-io";
 *
 * const queryUsers = East.function([], NullType, ($) => {
 *     const config = $.let({
 *         path: "./mydb.sqlite",
 *         readOnly: variant('none', null),
 *         memory: variant('none', null),
 *     });
 *
 *     const conn = $.let(SQL.SQLite.connect(config));
 *     $(SQL.SQLite.query(
 *         conn,
 *         "SELECT name FROM users LIMIT 1",
 *         []
 *     ));
 *     $(SQL.SQLite.close(conn));
 *     $.return(null);
 * });
 *
 * const compiled = East.compileAsync(queryUsers.toIR(), SQL.SQLite.Implementation);
 * await compiled();
 * ```
 *
 * @remarks
 * - SQLite uses single connection per handle (no connection pooling)
 * - Database file is created if it doesn't exist (unless readOnly is true)
 * - Use path ":memory:" for in-memory database
 * - All queries are synchronous but wrapped in async for consistency
 */
export const sqlite_connect: PlatformFunctionDef<
    [typeof SqliteConfigType],
    typeof ConnectionHandleType
> = East.platform("sqlite_connect", [SqliteConfigType], ConnectionHandleType);

/**
 * Executes a SQL query with parameterized values.
 *
 * Runs a SQL query against a SQLite database with parameter binding for
 * safe, injection-free queries. Returns rows as dictionaries mapping column
 * names to typed values, along with metadata about affected rows.
 *
 * This is a platform function for the East language, enabling SQL database
 * operations in East programs running on Node.js.
 *
 * @param handle - Connection handle from sqlite_connect()
 * @param sql - SQL query string with ? placeholders
 * @param params - Query parameters as SqlParameterType array
 * @returns Query results with rows and metadata
 *
 * @throws {EastError} When query fails due to:
 * - Invalid connection handle (location: "sqlite_query")
 * - SQL syntax errors (location: "sqlite_query")
 * - Constraint violations (location: "sqlite_query")
 * - Parameter count mismatch (location: "sqlite_query")
 *
 * @example
 * ```ts
 * import { East, IntegerType, NullType, variant } from "@elaraai/east";
 * import { SQL } from "@elaraai/east-node-io";
 *
 * const insertUser = East.function([IntegerType], NullType, ($, userId) => {
 *     const config = $.let({
 *         path: "./mydb.sqlite",
 *         readOnly: variant('none', null),
 *         memory: variant('none', null),
 *     });
 *     const conn = $.let(SQL.SQLite.connect(config));
 *     const result = $.let(SQL.SQLite.query(
 *         conn,
 *         "INSERT INTO users (name, email) VALUES (?, ?)",
 *         [variant('String', "Alice"), variant('String', "alice@example.com")]
 *     ));
 *     $(SQL.SQLite.close(conn));
 *     return $.return(null);
 * });
 *
 * const compiled = East.compileAsync(insertUser.toIR(), SQL.SQLite.Implementation);
 * await compiled(42n);
 * ```
 *
 * @remarks
 * - Uses `?` placeholders for parameters (not $1, $2 like PostgreSQL)
 * - NULL values map to {tag: "null", value: {}}
 * - All queries are synchronous but wrapped in async for consistency
 */
export const sqlite_query: PlatformFunctionDef<
    [typeof ConnectionHandleType, typeof StringType, typeof SqlParametersType],
    typeof SqlResultType
> = East.platform("sqlite_query", [ConnectionHandleType, StringType, SqlParametersType], SqlResultType);

/**
 * Closes a SQLite database connection.
 *
 * Closes the database connection and releases all resources.
 * The handle becomes invalid after this operation.
 *
 * @param handle - Connection handle from sqlite_connect()
 *
 * @throws {EastError} When handle is invalid (location: "sqlite_close")
 *
 * @example
 * ```ts
 * import { East, NullType, variant } from "@elaraai/east";
 * import { SQL } from "@elaraai/east-node-io";
 *
 * const cleanup = East.function([], NullType, $ => {
 *     const config = $.let({
 *         path: "./mydb.sqlite",
 *         readOnly: variant('none', null),
 *         memory: variant('none', null),
 *     });
 *     const conn = $.let(SQL.SQLite.connect(config));
 *     // ... do work ...
 *     $(SQL.SQLite.close(conn));
 *     return $.return(null);
 * });
 *
 * const compiled = East.compileAsync(cleanup.toIR(), SQL.SQLite.Implementation);
 * await compiled();
 * ```
 */
export const sqlite_close: PlatformFunctionDef<
    [typeof ConnectionHandleType],
    typeof NullType
> = East.platform("sqlite_close", [ConnectionHandleType], NullType);

/**
 * Closes all SQLite connections.
 *
 * Closes all active SQLite connections and releases all resources.
 * Useful for test cleanup to ensure all connections are closed.
 *
 * @returns Null on success
 *
 * @example
 * ```ts
 * import { East, NullType } from "@elaraai/east";
 * import { SQL } from "@elaraai/east-node-io";
 *
 * const cleanupAll = East.function([], NullType, $ => {
 *     // ... test code that may have left connections open ...
 *     $(SQL.SQLite.closeAll());
 *     return $.return(null);
 * });
 *
 * const compiled = East.compileAsync(cleanupAll.toIR(), SQL.SQLite.Implementation);
 * await compiled();
 * ```
 *
 * @internal
 */
export const sqlite_close_all: PlatformFunctionDef<[], typeof NullType> = East.platform("sqlite_close_all", [], NullType);

/**
 * Converts East SQL parameter to native JavaScript value.
 *
 * @param param - East SQL parameter variant
 * @returns JavaScript value for SQLite binding
 * @internal
 */
function convertParamToNative(param: ValueTypeOf<typeof SqlParameterType>): any {
    return match(param, {
        String: (value) => value,
        Integer: (value) => Number(value),  // Convert BigInt to Number for SQLite
        Float: (value) => value,
        Boolean: (value) => value ? 1 : 0,  // SQLite uses 0/1 for booleans
        Null: (value) => value,
        Blob: (value) => Buffer.from(value),  // Convert Uint8Array to Buffer
        DateTime: (value) => value.toISOString(),  // Store as ISO string
    })
}

/**
 * Converts native JavaScript value to East SQL parameter variant.
 *
 * @param value - Native JavaScript value from SQLite
 * @param columnType - SQLite column type from statement metadata
 * @returns East SQL parameter variant
 * @internal
 */
function convertNativeToParam(value: any, columnType: SqliteColumnType | null): ValueTypeOf<typeof SqlParameterType> {
    if (isValueOf(value, NullType)) {
        return variant('Null', null);
    } else if (
        (
            (columnType === null) &&
            isValueOf(value, BooleanType)
        ) || (
            (columnType === 'BOOLEAN') &&
            (isValueOf(value, BooleanType) || isValueOf(value, FloatType))
        )

    ) {
        return variant('Boolean', value ? true : false);
    } else if (
        (
            (columnType === null) &&
            isValueOf(value, IntegerType)
        ) || (
            (columnType === 'INTEGER' || columnType === 'INT' || columnType === 'TINYINT' || columnType === 'SMALLINT' || columnType === 'MEDIUMINT' || columnType === 'BIGINT' || columnType === 'UNSIGNED BIG INT' || columnType === 'INT2' || columnType === 'INT8') &&
            (isValueOf(value, IntegerType) || isValueOf(value, FloatType))
        )
    ) {
        return variant('Integer', BigInt(value));
    } else if (
        (columnType === 'REAL' || columnType === 'DOUBLE' || columnType === 'DOUBLE PRECISION' || columnType === 'FLOAT' || columnType === 'NUMERIC' || columnType === 'DECIMAL' || columnType === null) &&
        isValueOf(value, FloatType)
    ) {
        return variant('Float', value);
    } else if (
        (columnType === 'TEXT' || columnType === 'CHARACTER' || columnType === 'VARCHAR' || columnType === 'VARYING CHARACTER' || columnType === 'NCHAR' || columnType === 'NATIVE CHARACTER' || columnType === 'NVARCHAR' || columnType === 'CLOB' || columnType === 'DATE' || columnType === null) &&
        isValueOf(value, StringType)
    ) {
        return variant('String', value);
    } else if (
        (
            (columnType === null) &&
            isValueOf(value, DateTimeType)
        ) || (
            (columnType === 'DATETIME') &&
            (isValueOf(value, DateTimeType) || isValueOf(value, StringType))
        )
    ) {
        return variant('DateTime', new Date(value));
    } else if (
        (columnType === 'BLOB' || columnType === null) &&
        isValueOf(value, BlobType)
    ) {
        return variant('Blob', value);
    } else {
        return variant('Null', null);
    }
}

/**
 * Node.js implementation of SQLite platform functions.
 *
 * Provides the runtime implementations for SQLite operations.
 * Pass this to East.compileAsync() to enable SQLite functionality.
 */
export const SqliteImpl: PlatformFunction[] = [
    sqlite_connect.implementAsync(async (config: ValueTypeOf<typeof SqliteConfigType>): Promise<string> => {
        try {
            const path = config.path || ':memory:';
            const readOnly = config.readOnly?.type === 'some' ? config.readOnly.value : false;
            const memory = config.memory?.type === 'some' ? config.memory.value : false;

            const actualPath = memory ? ':memory:' : path;
            const db = new Database(actualPath, {
                readonly: readOnly,
                fileMustExist: readOnly,
            });

            // Enable foreign keys by default
            db.pragma('foreign_keys = ON');

            return await Promise.resolve(createHandle(db, async () => {
                await Promise.resolve(db.close());
            }));
        } catch (err: any) {
            throw new EastError(`SQLite connection failed: ${err.message}`, {
                location: { filename: "sqlite_connect", line: 0n, column: 0n },
                cause: err
            });
        }
    }),

    sqlite_query.implementAsync(async (
        handle: ValueTypeOf<typeof ConnectionHandleType>,
        sql: ValueTypeOf<typeof StringType>,
        params: ValueTypeOf<typeof SqlParametersType>
    ): Promise<ValueTypeOf<typeof SqlResultType>> => {
        try {
            const db = await Promise.resolve(getConnection<Database.Database>(handle));

            // Convert East parameters to native values
            const nativeParams = params.map(convertParamToNative);

            // Prepare the statement
            const stmt = db.prepare(sql);

            // Use the statement's reader property to determine if it returns rows
            // This is provided by better-sqlite3 and indicates SELECT-type queries

            if (stmt.reader) {
                // For SELECT queries, use all() which returns rows
                const rows: unknown = stmt.all(...nativeParams);

                if (!Array.isArray(rows)) {
                    throw new EastError('SQLite all() did not return an array', {
                        location: { filename: "sqlite_query", line: 0n, column: 0n }
                    });
                }

                // Get column metadata for type information
                const columns = stmt.columns();
                const columnTypeMap = new Map<string, SqliteColumnType | null>();
                for (const col of columns) {
                    columnTypeMap.set(col.name, col.type as SqliteColumnType | null);
                }

                // Convert rows to East format (SortedMap objects)
                const eastRows = rows.map((row: any) => {
                    const eastRow = new SortedMap<string, any>();
                    for (const [key, value] of Object.entries(row)) {
                        const columnType = columnTypeMap.get(key) || null;
                        eastRow.set(key, convertNativeToParam(value, columnType));
                    }
                    return eastRow;
                });

                return variant('select', { rows: eastRows }) as any;
            } else {
                // For INSERT/UPDATE/DELETE, use run() which returns RunResult
                const info: Database.RunResult = stmt.run(...nativeParams);
                // Validate RunResult structure
                if (typeof info !== 'object' || info === null || !('changes' in info)) {
                    throw new EastError('SQLite run() did not return valid RunResult', {
                        location: { filename: "sqlite_query", line: 0n, column: 0n }
                    });
                }

                // Determine query type from SQL to return the appropriate variant
                const trimmedSql = sql.trim().toUpperCase();

                if (trimmedSql.startsWith('INSERT')) {
                    return variant('insert', {
                        rowsAffected: BigInt(info.changes),
                        lastInsertId: info.lastInsertRowid !== undefined && info.lastInsertRowid !== 0
                            ? variant('some', BigInt(info.lastInsertRowid))
                            : variant('none', null)
                    }) as any;
                } else if (trimmedSql.startsWith('UPDATE')) {
                    return variant('update', {
                        rowsAffected: BigInt(info.changes)
                    }) as any;
                } else if (trimmedSql.startsWith('DELETE')) {
                    return variant('delete', {
                        rowsAffected: BigInt(info.changes)
                    }) as any;
                } else {
                    // Other mutating queries (CREATE, DROP, ALTER, etc.) - treat as update
                    return variant('update', {
                        rowsAffected: BigInt(info.changes)
                    }) as any;
                }
            }
        } catch (err: any) {
            throw new EastError(`SQLite query failed: ${err.message}`, {
                location: { filename: "sqlite_query", line: 0n, column: 0n },
                cause: err
            });
        }
    }),

    sqlite_close.implementAsync(async (handle: ValueTypeOf<typeof ConnectionHandleType>) => {
        try {
            const db = await Promise.resolve(getConnection<Database.Database>(handle));
            db.close();
            closeHandle(handle);
            return null;
        } catch (err: any) {
            throw new EastError(`SQLite close failed: ${err.message}`, {
                location: { filename: "sqlite_close", line: 0n, column: 0n },
                cause: err
            });
        }
    }),

    sqlite_close_all.implementAsync(async () => {
        await closeAllHandles();
        return null;
    }),
];
