/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
    IntegerType,
    EastModuleType,
    encodeBeast2For,
    toEastTypeValue,
    variant,
} from '@elaraai/east';
import type { IR } from '@elaraai/east/internal';
import { loadModule, loadModules } from './loader.js';

const encodeModule = encodeBeast2For(EastModuleType);

/** Create a temp directory that is cleaned up after the test. */
function makeTempDir(): string {
    return mkdtempSync(join(tmpdir(), 'east-cli-test-'));
}

/** Create a simple Value IR node */
function makeValueIR(value: bigint): IR {
    return variant("Value", {
        type: toEastTypeValue(IntegerType),
        location: [],
        value: variant("Integer", value),
    });
}

/** Write a module .beast2 file with two integer symbols */
function writeModuleFile(dir: string, fileName: string, moduleName: string): string {
    const moduleValue = {
        symbols: new Map<string, any>([
            [`${moduleName}.a`, makeValueIR(42n)],
            [`${moduleName}.b`, makeValueIR(99n)],
        ]),
        imports: new Map<string, any>(),
    };

    const encoded = encodeModule(moduleValue);
    const filePath = join(dir, fileName);
    writeFileSync(filePath, encoded);
    return filePath;
}

describe('loadModule', () => {
    it('loads symbols from a .beast2 module file', () => {
        const dir = makeTempDir();
        try {
            const filePath = writeModuleFile(dir, 'math.beast2', 'math');
            const symbols = loadModule(filePath);

            assert.ok(symbols instanceof Map);
            assert.equal(symbols.size, 2);
            assert.ok(symbols.has('math.a'));
            assert.ok(symbols.has('math.b'));
        } finally {
            rmSync(dir, { recursive: true });
        }
    });

    it('rejects non-beast2 files', () => {
        assert.throws(
            () => loadModule('/tmp/test.json'),
            /Module files must be in .beast2 format/
        );
    });
});

describe('loadModules', () => {
    it('returns empty map for no files', () => {
        const result = loadModules([]);
        assert.ok(result instanceof Map);
        assert.equal(result.size, 0);
    });

    it('merges symbols from multiple module files', () => {
        const dir = makeTempDir();
        try {
            const file1 = writeModuleFile(dir, 'mod1.beast2', 'alpha');
            const file2 = writeModuleFile(dir, 'mod2.beast2', 'beta');

            const merged = loadModules([file1, file2]);

            assert.ok(merged.has('alpha.a'));
            assert.ok(merged.has('alpha.b'));
            assert.ok(merged.has('beta.a'));
            assert.ok(merged.has('beta.b'));
            assert.equal(merged.size, 4);
        } finally {
            rmSync(dir, { recursive: true });
        }
    });

    it('errors on duplicate symbol names', () => {
        const dir = makeTempDir();
        try {
            const file1 = writeModuleFile(dir, 'mod1.beast2', 'same');
            const file2 = writeModuleFile(dir, 'mod2.beast2', 'same');

            assert.throws(
                () => loadModules([file1, file2]),
                /Duplicate symbol/
            );
        } finally {
            rmSync(dir, { recursive: true });
        }
    });
});
