import { pricing } from "../data/buildings";

const buildings = Object.keys(pricing).sort((a, b) => a.localeCompare(b, "en"));

/** Initial HTML for crawlers. The calculator still loads on the client. */
export default function QuoteCrawl() {
  return (
    <>
      <section className="quote-crawl" aria-label="Buildings">
        <h1>Balcony glass cleaning price by building</h1>
        <p>Pick your building and see your price in seconds. Miami balcony glass cleaning.</p>
        <ul aria-hidden="true">
          {buildings.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </section>
      <noscript>
        <p>Turn on JavaScript to see your price, or text 305-414-0305.</p>
      </noscript>
    </>
  );
}
