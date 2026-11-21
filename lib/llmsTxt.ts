// Public /llms.txt. Same business facts as the JSON-LD graph.
// No prices, review counts, street address, or promotional language.

export const llmsTxt = `# Preppy Services

Preppy Services is a Miami balcony and building glass cleaner. Glass is cleaned from inside the unit or on the balcony with water-fed poles.

Get your unit's price at https://quote.preppyservices.com

Main site: https://preppyservices.com
FAQ: https://preppyservices.com/faq

Insured. Certificate of insurance (COI) on request.

- Legal name: PREPROCK HOLDINGS LLC
- Email: info@preppyservices.com
- Phone: +13054140305
- Address: Miami, FL 33137, US
- Hours: Monday to Saturday, 08:00-18:00
- Area served: Miami-Dade County, FL; Miami; Miami Beach
- Instagram: https://instagram.com/preppyservices/
- Facebook: https://www.facebook.com/profile.php?id=61580467193527
- TikTok: https://www.tiktok.com/@preppyservices
`;

export function llmsTxtResponse(): Response {
  return new Response(llmsTxt, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
