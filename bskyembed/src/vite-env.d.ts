// <reference types="vite/client" />

interface ViteTypeOptions {
  // By adding this line, you can make the type of ImportMetaEnv strict
  // to disallow unknown keys.
  // strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly VITE_CARD_URL: string
  readonly VITE_EMBED_URL: string
  readonly VITE_LINK_URL: string
  readonly VITE_PUBLIC_APPVIEW_URL: string
  readonly VITE_SOCIAL_APP_ABOUT: string
  readonly VITE_SOCIAL_APP_HOST: string
  readonly VITE_SOCIAL_APP_NAME: string
  readonly VITE_SOCIAL_APP_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
