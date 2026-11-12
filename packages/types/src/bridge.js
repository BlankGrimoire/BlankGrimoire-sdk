// SPDX-License-Identifier: MIT
/**
 * Global exposed by the runtime IIFE bundle (`dist/runtime.js`) and looked up
 * by the iOS host in its JavaScriptCore context.
 */
export const RUNTIME_GLOBAL_NAME = 'BlankGrimoireRuntime';
/**
 * Functions the host may expose on `globalThis.__native`. `request` and
 * `parseHTML` are required in practice; the remaining functions are optional.
 */
export const NATIVE_BRIDGE_METHODS = [
    'request',
    'parseHTML',
    'log',
    'error',
    'warn',
    'setTimeout',
    'clearTimeout',
];
