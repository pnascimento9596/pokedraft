import type { MetadataRoute } from "next";

// Friends only: search engines stay out, while link-preview bots that honour robots.txt
// can still read share pages and card images.
const PREVIEW_BOTS = [
  "Twitterbot",
  "facebookexternalhit",
  "Discordbot",
  "WhatsApp",
  "Slackbot-LinkExpanding",
  "TelegramBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: PREVIEW_BOTS, allow: "/" },
      { userAgent: "*", disallow: "/" },
    ],
  };
}
