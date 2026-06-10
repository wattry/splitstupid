/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROXY: string;
  readonly VITE_TAB_SCAN_KEY: string;
  readonly VITE_POSTHOG_KEY: string;
  readonly VITE_POSTHOG_DOMAIN: string;
  readonly VITE_SPLIT_WISE_KEY: string;
  readonly VITE_SPLIT_WISE_SECRET: string;
  readonly VITE_PROD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
