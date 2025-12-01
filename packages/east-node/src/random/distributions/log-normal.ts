/**
 * Copyright (c) 2025 Elara AI Pty Ltd
 * Licensed under AGPL-3.0. See LICENSE file for details.
 */

/**
 * Vendored from npm package 'random' (https://github.com/transitive-bullshit/random)
 * Originally by Travis Fischer, distributed under MIT license
 */

import type RNG from "../rng.js";
import normalDist from "./normal.js";

export default (random: RNG, mu = 0, sigma = 1) => {
    const normal = normalDist(random, mu, sigma);
    return () => {
        return Math.exp(normal());
    };
};
