// SPDX-License-Identifier: MIT
import { API_VERSION } from './version.js';
export function defineTheme(adapter) {
    return Object.assign({}, adapter, { apiVersion: API_VERSION });
}
