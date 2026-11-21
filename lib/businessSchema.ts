// Site-wide business graph for quote.preppyservices.com.
// Facts only: no prices, discounts, review counts, or ratings.
// No FAQPage: those questions are not visible on the quote site.
// Preppy is a service-area business, so the address has no street.
// The telephone is the number already shown on the quote page: 305-414-0305.

const QUOTE_URL = "https://quote.preppyservices.com";
const BUSINESS_ID = "https://preppyservices.com/#business";

const business = {
  "@type": "LocalBusiness",
  "@id": BUSINESS_ID,
  name: "Preppy Services",
  legalName: "PREPROCK HOLDINGS LLC",
  url: QUOTE_URL,
  email: "info@preppyservices.com",
  telephone: "+13054140305",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Miami",
    addressRegion: "FL",
    postalCode: "33137",
    addressCountry: "US",
  },
  areaServed: [
    { "@type": "AdministrativeArea", name: "Miami-Dade County, FL" },
    { "@type": "City", name: "Miami" },
    { "@type": "City", name: "Miami Beach" },
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "08:00",
      closes: "18:00",
    },
  ],
  sameAs: [
    "https://instagram.com/preppyservices/",
    "https://www.facebook.com/profile.php?id=61580467193527",
    "https://www.tiktok.com/@preppyservices",
  ],
  makesOffer: {
    "@type": "Offer",
    name: "Balcony glass cleaning",
    url: QUOTE_URL,
    areaServed: { "@type": "City", name: "Miami" },
    itemOffered: {
      "@type": "Service",
      name: "Balcony glass cleaning",
      url: QUOTE_URL,
      areaServed: { "@type": "City", name: "Miami" },
    },
  },
};

export const businessGraph = {
  "@context": "https://schema.org",
  "@graph": [business],
};

/** JSON inserted into the site-wide application/ld+json script. */
export function businessJsonLdJson(): string {
  return JSON.stringify(businessGraph).replace(/</g, "\\u003c");
}

/** Script tag emitted on every page, including / and /?intro=1. */
export function businessJsonLdHtml(): string {
  return `<script type="application/ld+json">${businessJsonLdJson()}</script>`;
}
