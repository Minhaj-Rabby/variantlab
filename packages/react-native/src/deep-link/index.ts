export {
  base64UrlToBytes,
  bytesToBase64Url,
  decodeSharePayload,
  encodeSharePayload,
} from "./encode.js";
export {
  applyPayload,
  type LinkingLike,
  type RegisterDeepLinkOptions,
  registerDeepLinkHandler,
} from "./handler.js";
export type {
  SharePayload,
  ShareVersion,
  ValidationFailure,
  ValidationResult,
} from "./types.js";
export { validatePayload } from "./validate.js";
