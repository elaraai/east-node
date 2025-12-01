/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */

/**
 * SQL database platform functions.
 *
 * Provides type-safe SQL database operations for East programs, supporting
 * SQLite, PostgreSQL, and MySQL with connection pooling and parameterized queries.
 *
 * @packageDocumentation
 */

// Export individual modules
export * from "./sqlite.js";
export * from "./postgres.js";
export * from "./mysql.js";
export * from "./types.js";

// Import for grouped exports
import {
    sqlite_connect,
    sqlite_query,
    sqlite_close,
    sqlite_close_all,
    SqliteImpl
} from "./sqlite.js";
import {
    postgres_connect,
    postgres_query,
    postgres_close,
    postgres_close_all,
    PostgresImpl
} from "./postgres.js";
import {
    mysql_connect,
    mysql_query,
    mysql_close,
    mysql_close_all,
    MySqlImpl
} from "./mysql.js";
import {
    SqliteConfigType,
    PostgresConfigType,
    MySqlConfigType,
    SqlParameterType,
    SqlParametersType,
    SqlRowType,
    SqlResultType
} from "./types.js";

/**
 * SQL database platform functions.
 *
 * Provides type-safe SQL database operations for East programs, supporting
 * SQLite, PostgreSQL, and MySQL with connection pooling and parameterized queries.
 *
 * @example
 * ```ts
 * import { East, StringType, IntegerType, NullType, variant } from "@elaraai/east";
 * import { SQL } from "@elaraai/east-node-io";
 *
 * const getUserName = East.function([IntegerType], NullType, ($, userId) => {
 *     const config = $.let({
 *         host: "localhost",
 *         port: 5432n,
 *         database: "myapp",
 *         user: "postgres",
 *         password: "secret",
 *         ssl: variant('none', null),
 *         maxConnections: variant('none', null),
 *     });
 *
 *     const conn = $.let(SQL.Postgres.connect(config));
 *     $(SQL.Postgres.query(
 *         conn,
 *         "SELECT name FROM users WHERE id = $1",
 *         [variant('Integer', userId)]
 *     ));
 *     $(SQL.Postgres.close(conn));
 *     $.return(null);
 * });
 *
 * // All SQL operations are async
 * const compiled = East.compileAsync(getUserName.toIR(), SQL.Postgres.Implementation);
 * await compiled(42n);
 * ```
 */
export const SQL = {
    /**
     * SQLite database operations.
     *
     * Provides platform functions for SQLite, a serverless embedded SQL database.
     */
    SQLite: {
        /**
         * Opens a SQLite database connection.
         *
         * Creates a connection to a SQLite database file or in-memory database
         * and returns an opaque handle for use in queries.
         *
         * @example
         * ```ts
         * const getUser = East.function([IntegerType], NullType, ($, userId) => {
         *     const config = $.let({
         *         path: "./mydb.sqlite",
         *         readOnly: variant('none', null),
         *         memory: variant('none', null),
         *     });
         *
         *     const conn = $.let(SQL.SQLite.connect(config));
         *     $(SQL.SQLite.query(
         *         conn,
         *         "SELECT name FROM users WHERE id = ?",
         *         [variant('Integer', userId)]
         *     ));
         *     $(SQL.SQLite.close(conn));
         *     $.return(null);
         * });
         *
         * const compiled = East.compileAsync(getUser.toIR(), SQL.SQLite.Implementation);
         * await compiled(42n);
         * ```
         */
        connect: sqlite_connect,

        /**
         * Executes a SQL query with parameters.
         *
         * Runs a SQL query with parameter binding using ? placeholders.
         *
         * @example
         * ```ts
         * const getUser = East.function([IntegerType], NullType, ($, userId) => {
         *     const config = $.let({
         *         path: "./mydb.sqlite",
         *         readOnly: variant('none', null),
         *         memory: variant('none', null),
         *     });
         *     const conn = $.let(SQL.SQLite.connect(config));
         *     $(SQL.SQLite.query(
         *         conn,
         *         "SELECT name FROM users WHERE id = ?",
         *         [variant('Integer', userId)]
         *     ));
         *     $(SQL.SQLite.close(conn));
         *     $.return(null);
         * });
         *
         * const compiled = East.compileAsync(getUser.toIR(), SQL.SQLite.Implementation);
         * await compiled(42n);
         * ```
         */
        query: sqlite_query,

        /**
         * Closes the SQLite database connection.
         *
         * Releases all resources associated with the connection.
         *
         * @example
         * ```ts
         * const cleanup = East.function([], NullType, $ => {
         *     const config = $.let({
         *         path: "./mydb.sqlite",
         *         readOnly: variant('none', null),
         *         memory: variant('none', null),
         *     });
         *     const conn = $.let(SQL.SQLite.connect(config));
         *     // ... do work ...
         *     $(SQL.SQLite.close(conn));
         *     $.return(null);
         * });
         *
         * const compiled = East.compileAsync(cleanup.toIR(), SQL.SQLite.Implementation);
         * await compiled();
         * ```
         */
        close: sqlite_close,

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
        closeAll: sqlite_close_all,

        /**
         * Node.js implementation of SQLite platform functions.
         *
         * Pass this to East.compileAsync() to enable SQLite operations.
         */
        Implementation: SqliteImpl,

        /**
         * Type definitions for SQLite operations.
         */
        Types: {
            /**
             * SQLite connection configuration type.
             */
            Config: SqliteConfigType,

            /**
             * SQL query parameter value type.
             */
            Parameter: SqlParameterType,

            /**
             * Array of SQL query parameters.
             */
            Parameters: SqlParametersType,

            /**
             * SQL query result row type.
             */
            Row: SqlRowType,

            /**
             * SQL query execution result type.
             */
            Result: SqlResultType,
        },
    },

    /**
     * PostgreSQL database operations.
     *
     * Provides platform functions for PostgreSQL with connection pooling.
     */
    Postgres: {
        /**
         * Connects to a PostgreSQL database.
         *
         * Creates a connection pool to a PostgreSQL database and returns an
         * opaque handle for use in queries.
         *
         * @example
         * ```ts
         * const getUser = East.function([IntegerType], NullType, ($, userId) => {
         *     const config = $.let({
         *         host: "localhost",
         *         port: 5432n,
         *         database: "myapp",
         *         user: "postgres",
         *         password: "secret",
         *         ssl: variant('none', null),
         *         maxConnections: variant('none', null),
         *     });
         *
         *     const conn = $.let(SQL.Postgres.connect(config));
         *     $(SQL.Postgres.query(
         *         conn,
         *         "SELECT name FROM users WHERE id = $1",
         *         [variant('Integer', userId)]
         *     ));
         *     $(SQL.Postgres.close(conn));
         *     $.return(null);
         * });
         *
         * const compiled = East.compileAsync(getUser.toIR(), SQL.Postgres.Implementation);
         * await compiled(42n);
         * ```
         */
        connect: postgres_connect,

        /**
         * Executes a SQL query with parameters.
         *
         * Runs a SQL query with parameter binding using $1, $2, etc. placeholders.
         *
         * @example
         * ```ts
         * const getUser = East.function([IntegerType], NullType, ($, userId) => {
         *     const config = $.let({
         *         host: "localhost",
         *         port: 5432n,
         *         database: "myapp",
         *         user: "postgres",
         *         password: "secret",
         *         ssl: variant('none', null),
         *         maxConnections: variant('none', null),
         *     });
         *     const conn = $.let(SQL.Postgres.connect(config));
         *     $(SQL.Postgres.query(
         *         conn,
         *         "SELECT name FROM users WHERE id = $1",
         *         [variant('Integer', userId)]
         *     ));
         *     $(SQL.Postgres.close(conn));
         *     $.return(null);
         * });
         *
         * const compiled = East.compileAsync(getUser.toIR(), SQL.Postgres.Implementation);
         * await compiled(42n);
         * ```
         */
        query: postgres_query,

        /**
         * Closes the PostgreSQL connection pool.
         *
         * Terminates all connections and releases all resources.
         *
         * @example
         * ```ts
         * const cleanup = East.function([], NullType, $ => {
         *     const config = $.let({
         *         host: "localhost",
         *         port: 5432n,
         *         database: "myapp",
         *         user: "postgres",
         *         password: "secret",
         *         ssl: variant('none', null),
         *         maxConnections: variant('none', null),
         *     });
         *     const conn = $.let(SQL.Postgres.connect(config));
         *     // ... do work ...
         *     $(SQL.Postgres.close(conn));
         *     $.return(null);
         * });
         *
         * const compiled = East.compileAsync(cleanup.toIR(), SQL.Postgres.Implementation);
         * await compiled();
         * ```
         */
        close: postgres_close,

        /**
         * Closes all PostgreSQL connections.
         *
         * Closes all active PostgreSQL connection pools and releases all resources.
         * Useful for test cleanup to ensure all connections are closed.
         *
         * @returns Null on success
         *
         * @example
         * ```ts
         * const cleanupAll = East.function([], NullType, $ => {
         *     // ... test code that may have left connections open ...
         *     $(SQL.Postgres.closeAll());
         *     return $.return(null);
         * });
         *
         * const compiled = East.compileAsync(cleanupAll.toIR(), SQL.Postgres.Implementation);
         * await compiled();
         * ```
         *
         * @internal
         */
        closeAll: postgres_close_all,

        /**
         * Node.js implementation of PostgreSQL platform functions.
         *
         * Pass this to East.compileAsync() to enable PostgreSQL operations.
         */
        Implementation: PostgresImpl,

        /**
         * Type definitions for PostgreSQL operations.
         */
        Types: {
            /**
             * PostgreSQL connection configuration type.
             */
            Config: PostgresConfigType,

            /**
             * SQL query parameter value type.
             */
            Parameter: SqlParameterType,

            /**
             * Array of SQL query parameters.
             */
            Parameters: SqlParametersType,

            /**
             * SQL query result row type.
             */
            Row: SqlRowType,

            /**
             * SQL query execution result type.
             */
            Result: SqlResultType,
        },
    },

    /**
     * MySQL database operations.
     *
     * Provides platform functions for MySQL with connection pooling.
     */
    MySQL: {
        /**
         * Connects to a MySQL database.
         *
         * Creates a connection pool to a MySQL database and returns an
         * opaque handle for use in queries.
         *
         * @example
         * ```ts
         * const getUser = East.function([IntegerType], NullType, ($, userId) => {
         *     const config = $.let({
         *         host: "localhost",
         *         port: 3306n,
         *         database: "myapp",
         *         user: "root",
         *         password: "secret",
         *         ssl: variant('none', null),
         *         maxConnections: variant('none', null),
         *     });
         *
         *     const conn = $.let(SQL.MySQL.connect(config));
         *     $(SQL.MySQL.query(
         *         conn,
         *         "SELECT name FROM users WHERE id = ?",
         *         [variant('Integer', userId)]
         *     ));
         *     $(SQL.MySQL.close(conn));
         *     $.return(null);
         * });
         *
         * const compiled = East.compileAsync(getUser.toIR(), SQL.MySQL.Implementation);
         * await compiled(42n);
         * ```
         */
        connect: mysql_connect,

        /**
         * Executes a SQL query with parameters.
         *
         * Runs a SQL query with parameter binding using ? placeholders.
         *
         * @example
         * ```ts
         * const getUser = East.function([IntegerType], NullType, ($, userId) => {
         *     const config = $.let({
         *         host: "localhost",
         *         port: 3306n,
         *         database: "myapp",
         *         user: "root",
         *         password: "secret",
         *         ssl: variant('none', null),
         *         maxConnections: variant('none', null),
         *     });
         *     const conn = $.let(SQL.MySQL.connect(config));
         *     $(SQL.MySQL.query(
         *         conn,
         *         "SELECT name FROM users WHERE id = ?",
         *         [variant('Integer', userId)]
         *     ));
         *     $(SQL.MySQL.close(conn));
         *     $.return(null);
         * });
         *
         * const compiled = East.compileAsync(getUser.toIR(), SQL.MySQL.Implementation);
         * await compiled(42n);
         * ```
         */
        query: mysql_query,

        /**
         * Closes the MySQL connection pool.
         *
         * Terminates all connections and releases all resources.
         *
         * @example
         * ```ts
         * const cleanup = East.function([], NullType, $ => {
         *     const config = $.let({
         *         host: "localhost",
         *         port: 3306n,
         *         database: "myapp",
         *         user: "root",
         *         password: "secret",
         *         ssl: variant('none', null),
         *         maxConnections: variant('none', null),
         *     });
         *     const conn = $.let(SQL.MySQL.connect(config));
         *     // ... do work ...
         *     $(SQL.MySQL.close(conn));
         *     $.return(null);
         * });
         *
         * const compiled = East.compileAsync(cleanup.toIR(), SQL.MySQL.Implementation);
         * await compiled();
         * ```
         */
        close: mysql_close,

        /**
         * Closes all MySQL connections.
         *
         * Closes all active MySQL connection pools and releases all resources.
         * Useful for test cleanup to ensure all connections are closed.
         *
         * @returns Null on success
         *
         * @example
         * ```ts
         * const cleanupAll = East.function([], NullType, $ => {
         *     // ... test code that may have left connections open ...
         *     $(SQL.MySQL.closeAll());
         *     return $.return(null);
         * });
         *
         * const compiled = East.compileAsync(cleanupAll.toIR(), SQL.MySQL.Implementation);
         * await compiled();
         * ```
         *
         * @internal
         */
        closeAll: mysql_close_all,

        /**
         * Node.js implementation of MySQL platform functions.
         *
         * Pass this to East.compileAsync() to enable MySQL operations.
         */
        Implementation: MySqlImpl,

        /**
         * Type definitions for MySQL operations.
         */
        Types: {
            /**
             * MySQL connection configuration type.
             */
            Config: MySqlConfigType,

            /**
             * SQL query parameter value type.
             */
            Parameter: SqlParameterType,

            /**
             * Array of SQL query parameters.
             */
            Parameters: SqlParametersType,

            /**
             * SQL query result row type.
             */
            Row: SqlRowType,

            /**
             * SQL query execution result type.
             */
            Result: SqlResultType,
        },
    },
} as const;