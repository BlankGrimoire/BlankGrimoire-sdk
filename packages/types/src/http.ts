// SPDX-License-Identifier: MIT

export interface HttpRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  status: number;
  url: string;
  headers: Record<string, string>;
  body: string;
}
