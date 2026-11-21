// Site-wide business graph for quote.preppyservices.com.
// Facts only: no prices, discounts, review counts, or ratings.
// The telephone is the number already shown on the quote page
// (noscript text and the call link): 305-414-0305.

const QUOTE_URL = "https://quote.preppyservices.com";
const BUSINESS_ID = "https://preppyservices.com/#business";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const business = {
  "@type": "LocalBusiness",
  "@id": BUSINESS_ID,
  name: "Preppy Services",
  legalName: "PREPROCK HOLDINGS LLC",
  url: QUOTE_URL,
  email: "info@preppyservices.com",
  telephone: "+1-305-414-0305",
  address: {
    "@type": "PostalAddress",
    streetAddress: "2915 Biscayne Blvd, Ste 300",
    addressLocality: "Miami",
    addressRegion: "FL",
    postalCode: "33137",
    addressCountry: "US",
  },
  areaServed: [
    { "@type": "City", name: "Miami" },
    { "@type": "City", name: "Miami Beach" },
    { "@type": "Place", name: "Brickell" },
    { "@type": "Place", name: "Downtown Miami" },
    { "@type": "Place", name: "Edgewater" },
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: WEEKDAYS.map((day) => `https://schema.org/${day}`),
      opens: "08:00",
      closes: "18:00",
    },
  ],
  sameAs: [
    "https://instagram.com/preppyservices/",
    "https://www.facebook.com/profile.php?id=61580467193527",
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

const faq = {
  "@type": "FAQPage",
  "@id": `${QUOTE_URL}/#faq`,
  url: QUOTE_URL,
  about: { "@id": BUSINESS_ID },
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I get a price for my unit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pick your building and enter your unit at https://quote.preppyservices.com. The page shows that unit's balcony glass cleaning price.",
      },
    },
    {
      "@type": "Question",
      name: "Are prices per unit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Balcony glass cleaning is priced per unit. Enter your unit to view that unit's price.",
      },
    },
    {
      "@type": "Question",
      name: "How do interior glass add-ons work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Interior glass (sliders and windows) is an add-on. After you select your unit, the add-on follows the tier shown on the quote page for that unit.",
      },
    },
    {
      "@type": "Question",
      name: "Are you insured?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Preppy Services is fully insured. A certificate of insurance (COI) is available on request.",
      },
    },
  ],
};

export const businessGraph = {
  "@context": "https://schema.org",
  "@graph": [business, faq],
};

/** JSON inserted into the site-wide application/ld+json script. */
export function businessJsonLdJson(): string {
  return JSON.stringify(businessGraph).replace(/</g, "\\u003c");
}

/** Script tag emitted on every page, including / and /?intro=1. */
export function businessJsonLdHtml(): string {
  return `<script type="application/ld+json">${businessJsonLdJson()}</script>`;
}
