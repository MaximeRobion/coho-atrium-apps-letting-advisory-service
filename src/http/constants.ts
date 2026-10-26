export const MAX_BODY_BYTES = 1024 * 1024;
export const QUICK_VIEW_PATH = '/ui';

export const DEFAULT_SECURITY_HEADERS: Record<string, string> = {
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

export const EMPTY_CONFIG_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  title: 'Lettings Advice Service settings',
  additionalProperties: false,
  properties: {},
};

export interface ServerOptions {
  setupBootstrapSecret: string;
}
