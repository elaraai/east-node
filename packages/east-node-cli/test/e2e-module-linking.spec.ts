/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Dual-licensed under AGPL-3.0 and commercial license. See LICENSE for details.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import {
    East,
    IntegerType,
    FunctionType,
    EastModuleType,
    IRType,
    encodeBeast2For,
    decodeBeast2,
    toEastTypeValue,
    variant,
} from '@elaraai/east';
import type { IR } from '@elaraai/east/internal';

const encodeModule = encodeBeast2For(EastModuleType);
const encodeIR = encodeBeast2For(IRType);
const encodeInteger = encodeBeast2For(IntegerType);

/** Create a temp directory that is cleaned up after the test. */
function makeTempDir(): string {
    return mkdtempSync(join(tmpdir(), 'east-cli-e2e-'));
}

/** Create a Value IR node for an integer literal */
function makeValueIR(value: bigint): IR {
    return variant("Value", {
        type: toEastTypeValue(IntegerType),
        location: [],
        value: variant("Integer", value),
    });
}

/** Write a module .beast2 file with a given symbol table */
function writeModuleFile(dir: string, fileName: string, symbols: Map<string, any>): string {
    const moduleValue = {
        symbols,
        imports: new Map<string, any>(),
    };
    const filePath = join(dir, fileName);
    writeFileSync(filePath, encodeModule(moduleValue));
    return filePath;
}

/** Run the east-node CLI and return { stdout, stderr } */
function runCLI(args: string, cwd: string): { stdout: string; stderr: string } {
    // import.meta.dirname at runtime is dist/test/, so go up two levels to package root
    const cliPath = join(import.meta.dirname, '..', 'src', 'index.js');
    const cmd = `node ${cliPath} ${args}`;
    try {
        const stdout = execSync(cmd, { encoding: 'utf-8', cwd, stdio: ['pipe', 'pipe', 'pipe'] });
        return { stdout, stderr: '' };
    } catch (err: any) {
        return { stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
    }
}

describe('e2e: module linking', () => {
    it('links a module and executes a program that references its symbols', () => {
        const dir = makeTempDir();
        try {
            // Create a module with an "add" function and a "pi" constant
            const addFn = East.function([IntegerType, IntegerType], IntegerType, ($, a, b) => a.add(b));
            const addIR = addFn.toIR(new Map()).ir;

            const symbols = new Map<string, any>([
                ["math.add", addIR],
                ["math.pi", makeValueIR(42n)],
            ]);
            const moduleFile = writeModuleFile(dir, 'math.beast2', symbols);

            // Create a program that uses East.extern() to reference the module symbols
            const program = East.function([IntegerType], IntegerType, ($, x) => {
                const externAdd = East.extern("math", "add", FunctionType([IntegerType, IntegerType], IntegerType));
                const externPi = East.extern("math", "pi", IntegerType);
                return externAdd(x, externPi);
            });
            const programFile = join(dir, 'program.beast2');
            writeFileSync(programFile, encodeIR(program.toIR(new Map()).ir));

            // Create input: integer 5
            const inputFile = join(dir, 'input.beast2');
            writeFileSync(inputFile, encodeInteger(5n));

            // Create output path
            const outputFile = join(dir, 'output.beast2');

            // Run: east-node run program.beast2 -p @elaraai/east-node-std -l math.beast2 -i input.beast2 -o output.beast2
            const { stdout, stderr } = runCLI(
                `run ${programFile} -p @elaraai/east-node-std -l ${moduleFile} -i ${inputFile} -o ${outputFile}`,
                dir
            );

            assert.equal(stderr, '', `CLI should not error: ${stderr}`);

            // Decode and verify: add(5, 42) = 47
            const outputData = readFileSync(outputFile);
            const decoded = decodeBeast2(outputData);
            assert.equal(decoded.value, 47n);
        } finally {
            rmSync(dir, { recursive: true });
        }
    });

    it('links multiple modules and resolves cross-module symbol references', () => {
        const dir = makeTempDir();
        try {
            // Module 1: math with a constant
            const mod1Symbols = new Map<string, any>([
                ["constants.answer", makeValueIR(42n)],
            ]);
            const mod1File = writeModuleFile(dir, 'constants.beast2', mod1Symbols);

            // Module 2: utils with a multiply function
            const mulFn = East.function([IntegerType, IntegerType], IntegerType, ($, a, b) => a.multiply(b));
            const mod2Symbols = new Map<string, any>([
                ["utils.multiply", mulFn.toIR(new Map()).ir],
            ]);
            const mod2File = writeModuleFile(dir, 'utils.beast2', mod2Symbols);

            // Program: multiply(answer, 2) = 84
            const program = East.function([], IntegerType, ($) => {
                const answer = East.extern("constants", "answer", IntegerType);
                const multiply = East.extern("utils", "multiply", FunctionType([IntegerType, IntegerType], IntegerType));
                return multiply(answer, 2n);
            });
            const programFile = join(dir, 'program.beast2');
            writeFileSync(programFile, encodeIR(program.toIR(new Map()).ir));

            const outputFile = join(dir, 'output.beast2');

            const { stderr } = runCLI(
                `run ${programFile} -p @elaraai/east-node-std -l ${mod1File} -l ${mod2File} -o ${outputFile}`,
                dir
            );

            assert.equal(stderr, '', `CLI should not error: ${stderr}`);

            const outputData = readFileSync(outputFile);
            const decoded = decodeBeast2(outputData);
            assert.equal(decoded.value, 84n);
        } finally {
            rmSync(dir, { recursive: true });
        }
    });

    it('errors when a required symbol is not provided by any linked module', () => {
        const dir = makeTempDir();
        try {
            // Program references "missing.symbol" but no module provides it
            const program = East.function([], IntegerType, ($) => {
                return East.extern("missing", "symbol", IntegerType);
            });
            const programFile = join(dir, 'program.beast2');
            writeFileSync(programFile, encodeIR(program.toIR(new Map()).ir));

            const { stderr } = runCLI(
                `run ${programFile} -p @elaraai/east-node-std`,
                dir
            );

            assert.ok(stderr.includes('Symbol'), `Expected symbol error, got: ${stderr}`);
        } finally {
            rmSync(dir, { recursive: true });
        }
    });
});
