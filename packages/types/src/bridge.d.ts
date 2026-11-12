import type { HttpRequest, HttpResponse } from './http.js';
/**
 * Global exposed by the runtime IIFE bundle (`dist/runtime.js`) and looked up
 * by the iOS host in its JavaScriptCore context.
 */
export declare const RUNTIME_GLOBAL_NAME: "BlankGrimoireRuntime";
/**
 * Functions the host may expose on `globalThis.__native`. `request` and
 * `parseHTML` are required in practice; the remaining functions are optional.
 */
export declare const NATIVE_BRIDGE_METHODS: readonly ["request", "parseHTML", "log", "error", "warn", "setTimeout", "clearTimeout"];
export type NativeBridgeMethod = (typeof NATIVE_BRIDGE_METHODS)[number];
/**
 * Bridge surface documented for host implementers. `TDocument` is the host's
 * parsed-document type and `TTimerHandle` is the value returned by its timer
 * implementation.
 */
export interface NativeBridgeHost<TDocument = unknown, TTimerHandle = unknown> {
    request?: (request: HttpRequest) => HttpResponse | Promise<HttpResponse>;
    parseHTML?: (html: string) => TDocument;
    log?: (...args: unknown[]) => void;
    error?: (...args: unknown[]) => void;
    warn?: (...args: unknown[]) => void;
    setTimeout?: (callback: () => void, ms: number) => TTimerHandle;
    clearTimeout?: (handle: TTimerHandle) => void;
}
//# sourceMappingURL=bridge.d.ts.map