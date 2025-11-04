/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Licensed under AGPL-3.0. See LICENSE file for details.
 */
import { describeEast, assertEast } from "./test.js";
import { Random } from "./random.js";

await describeEast("Random platform functions", (test) => {
    test("uniform returns number in [0, 1)", $ => {
        const value = $.let(Random.uniform());
        $(assertEast.greaterEqual(value, 0.0));
        $(assertEast.less(value, 1.0));
    });

    test("normal returns a number", $ => {
        const value = $.let(Random.normal());
        // Normal distribution is unbounded, just verify it returns a number
        // We can't easily test range without statistical analysis
        $(assertEast.notEqual(value, value.add(1.0)));  // Sanity check: x != x+1
    });

    test("range returns integer in [min, max]", $ => {
        const value = $.let(Random.range(1n, 6n));
        $(assertEast.greaterEqual(value, 1n));
        $(assertEast.lessEqual(value, 6n));
    });

    test("range throws when min > max", $ => {
        $(assertEast.throws(Random.range(10n, 5n), /Invalid range/));
    });

    test("exponential returns positive number", $ => {
        const value = $.let(Random.exponential(1.0));
        $(assertEast.greater(value, 0.0));
    });

    test("exponential with custom lambda", $ => {
        const value = $.let(Random.exponential(0.5));
        $(assertEast.greater(value, 0.0));
    });

    test("weibull returns positive number", $ => {
        const value = $.let(Random.weibull(2.0));
        $(assertEast.greater(value, 0.0));
    });

    test("weibull with shape=1 (exponential)", $ => {
        const value = $.let(Random.weibull(1.0));
        $(assertEast.greater(value, 0.0));
    });

    test("bernoulli returns 0 or 1", $ => {
        const value = $.let(Random.bernoulli(0.5));
        $(assertEast.greaterEqual(value, 0n));
        $(assertEast.lessEqual(value, 1n));
    });

    test("bernoulli with p=0.1", $ => {
        const value = $.let(Random.bernoulli(0.1));
        $(assertEast.greaterEqual(value, 0n));
        $(assertEast.lessEqual(value, 1n));
    });

    test("binomial returns integer in [0, n]", $ => {
        const value = $.let(Random.binomial(10n, 0.5));
        $(assertEast.greaterEqual(value, 0n));
        $(assertEast.lessEqual(value, 10n));
    });

    test("binomial with n=1 (bernoulli)", $ => {
        const value = $.let(Random.binomial(1n, 0.5));
        $(assertEast.greaterEqual(value, 0n));
        $(assertEast.lessEqual(value, 1n));
    });

    test("geometric returns positive integer", $ => {
        const value = $.let(Random.geometric(0.5));
        $(assertEast.greaterEqual(value, 1n));
    });

    test("geometric with small p", $ => {
        const value = $.let(Random.geometric(0.1));
        $(assertEast.greaterEqual(value, 1n));
    });

    test("poisson returns non-negative integer", $ => {
        const value = $.let(Random.poisson(3.0));
        $(assertEast.greaterEqual(value, 0n));
    });

    test("poisson with lambda=1", $ => {
        const value = $.let(Random.poisson(1.0));
        $(assertEast.greaterEqual(value, 0n));
    });

    test("pareto returns number >= 1", $ => {
        const value = $.let(Random.pareto(2.0));
        $(assertEast.greaterEqual(value, 1.0));
    });

    test("pareto with alpha=1.16 (80/20)", $ => {
        const value = $.let(Random.pareto(1.16));
        $(assertEast.greaterEqual(value, 1.0));
    });

    test("logNormal returns positive number", $ => {
        const value = $.let(Random.logNormal(0.0, 1.0));
        $(assertEast.greater(value, 0.0));
    });

    test("logNormal with custom mu and sigma", $ => {
        const value = $.let(Random.logNormal(1.0, 0.5));
        $(assertEast.greater(value, 0.0));
    });

    test("irwinHall returns number in [0, n]", $ => {
        const value = $.let(Random.irwinHall(12n));
        $(assertEast.greaterEqual(value, 0.0));
        $(assertEast.lessEqual(value, 12.0));
    });

    test("irwinHall with n=1", $ => {
        const value = $.let(Random.irwinHall(1n));
        $(assertEast.greaterEqual(value, 0.0));
        $(assertEast.lessEqual(value, 1.0));
    });

    test("bates returns number in [0, 1]", $ => {
        const value = $.let(Random.bates(12n));
        $(assertEast.greaterEqual(value, 0.0));
        $(assertEast.lessEqual(value, 1.0));
    });

    test("bates with n=1 (uniform)", $ => {
        const value = $.let(Random.bates(1n));
        $(assertEast.greaterEqual(value, 0.0));
        $(assertEast.lessEqual(value, 1.0));
    });
}, Random.Implementation);
