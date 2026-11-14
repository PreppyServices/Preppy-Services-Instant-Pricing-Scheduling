/** @type {import('next').NextConfig} */
const nextConfig = {
  // Link-preview crawlers (iMessage, RCS, Android) do not run JavaScript.
  // Next.js only puts metadata in the initial <head> for user agents listed
  // here. Everyone else gets the tags streamed into the body and moved by a
  // client script, which those crawlers never see. Match every user agent.
  htmlLimitedBots: /.*/,
};

module.exports = nextConfig;
