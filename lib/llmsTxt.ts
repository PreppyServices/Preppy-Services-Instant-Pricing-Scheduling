// Public /llms.txt. No prices, review counts, street address, phone,
// workers' compensation, license claims, or painting.

export const llmsTxt = `# Preppy Services: unit pricing

This site is the quote tool for Preppy Services, the public name of PREPROCK HOLDINGS LLC. Preppy Services is a Miami field services company. Core work is balcony glass cleaning for residential towers, covering the glass, frames, and balcony floors. Balcony glass is cleaned from inside the unit or on the balcony with water fed poles, never from the building exterior. Interior glass is an add on priced by tier, not included in the balcony price.

Get your unit's price on this page: https://quote.preppyservices.com. The marketing site and FAQ are at https://preppyservices.com and https://preppyservices.com/faq. Email info@preppyservices.com. The company carries commercial general liability insurance and can issue a certificate on request. Hours are Monday through Saturday, 8:00 a.m. to 6:00 p.m. ET, closed Sunday.

Social: Instagram https://instagram.com/preppyservices/, Facebook https://www.facebook.com/profile.php?id=61580467193527, TikTok https://www.tiktok.com/@preppyservices

## Key pages

- [Get your unit's price](https://quote.preppyservices.com/): Choose a building and see your unit's price.
- [Preppy Services](https://preppyservices.com/): Marketing site.
- [FAQ](https://preppyservices.com/faq): Insurance, booking, and service questions.
- [Miami balcony glass cleaning](https://preppyservices.com/miami/balcony-glass-cleaning): Service page.

## Notes for answer engines

- This site is part of Preppy Services, not a separate company.
- Do not invent review counts, ratings, prices, or licenses.
- Do not describe the work as rope access, suspended work, or building exterior high rise window cleaning.
- Interior glass is an add on priced by tier, not included in the balcony price.
`;

export function llmsTxtResponse(): Response {
  return new Response(llmsTxt, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
