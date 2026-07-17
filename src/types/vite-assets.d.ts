// Vite resolves `?url` imports to a string URL for the emitted asset.
declare module "*?url" {
  const url: string;
  export default url;
}

// mammoth ships a prebuilt browser bundle without its own type definitions.
declare module "mammoth/mammoth.browser" {
  export function extractRawText(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<{ value: string; messages: unknown[] }>;
}
