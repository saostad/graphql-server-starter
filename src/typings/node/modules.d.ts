declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV?: "development" | "production";
    IDENTITY_METADATA?: string;
    CLIENT_ID?: string;
    ISSUER?: string;
    AUDIENCE?: string;
  }
}
