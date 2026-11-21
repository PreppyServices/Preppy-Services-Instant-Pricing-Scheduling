// Public /llms.txt. Same business facts as the JSON-LD graph.
// No prices, review counts, or promotional language.

export const llmsTxt = `# Preppy Services

Preppy Services is a Miami balcony and building glass cleaner. Glass is cleaned from inside the unit or on the balcony with water-fed poles.

Get your unit's price at https://quote.preppyservices.com

Main site: https://preppyservices.com
FAQ: https://preppyservices.com/faq

Insured. Certificate of insurance (COI) on request.

- Legal name: PREPROCK HOLDINGS LLC
- Email: info@preppyservices.com
- Phone: +1-305-414-0305
- Address: 2915 Biscayne Blvd, Ste 300, Miami, FL 33137, US
- Area served: Miami, Miami Beach, Brickell, Downtown Miami, Edgewater
- Instagram: https://instagram.com/preppyservices/
- Facebook: https://www.facebook.com/profile.php?id=61580467193527
`;

export function llmsTxtResponse(): Response {
  return new Response(llmsTxt, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
