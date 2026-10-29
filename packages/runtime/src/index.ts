import {
  __apiVersion,
  __invoke,
  __http,
  setTimeout,
  clearTimeout,
  __timerFire,
  console,
  type HttpRequest,
  type HttpResponse,
} from './prelude.js';
import { extract, type ExtractionResult, type ExtractOptions } from './engine.js';
import { extractCss, type CssResult } from './css.js';
import {
  extractScriptJSON,
  type ScriptJSONStrategy,
  extractHydration,
  type HydrationStrategy,
  extractAjax,
  type AjaxStrategy,
  type AjaxResult,
} from './strategies.js';

export {
  __apiVersion,
  __invoke,
  __http,
  setTimeout,
  clearTimeout,
  __timerFire,
  console,
  extract,
  extractCss,
  extractScriptJSON,
  extractHydration,
  extractAjax,
};
export type {
  HttpRequest,
  HttpResponse,
  ExtractionResult,
  ExtractOptions,
  CssResult,
  ScriptJSONStrategy,
  HydrationStrategy,
  AjaxStrategy,
  AjaxResult,
};
