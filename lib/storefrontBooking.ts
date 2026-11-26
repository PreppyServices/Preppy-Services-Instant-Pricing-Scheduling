// Re-export the storefront booking payload. The implementation lives with the
// tier copy so the page and the request cannot drift. This module is loaded by
// Next, which resolves the extensionless path. Node tests import storefrontCopy.

export {
  STOREFRONT_INFO_EMAIL,
  buildStorefrontBookQuery,
  isStorefrontEmail,
  isStorefrontPhone,
  storefrontCalendarTitle,
  storefrontMailto,
  storefrontPlanLine,
  storefrontServiceTitle,
  storefrontSizeNote,
  storefrontSummary,
} from "./storefrontCopy";

export type { StorefrontBookInput } from "./storefrontCopy";
