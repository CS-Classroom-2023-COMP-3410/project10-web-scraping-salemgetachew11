const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");

const baseCalendarUrl = "https://www.du.edu/calendar";
const year = 2025;
const resultsPath = "./results/calendar_events.json";

/**
 * Fetches HTML content from a given URL
 */
async function fetchHtml(url) {
    console.log(`🔍 Fetching: ${url}`);
    try {
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });
        return response.data;
    } catch (error) {
        console.error(`❌ ERROR: Unable to fetch URL: ${url} - ${error.message}`);
        return null;
    }
}

/**
 * Extracts event links from the calendar page
 */
async function extractEventLinks(html) {
    const $ = cheerio.load(html);
    const eventLinks = [];

    $(".events-listing__item a[href]").each((_, element) => {
        let eventUrl = $(element).attr("href");
        if (eventUrl && eventUrl.includes("/events/")) {
            eventUrl = new URL(eventUrl, baseCalendarUrl).href;
            eventLinks.push(eventUrl);
        }
    });

    console.log(`✅ Found ${eventLinks.length} event links.`);
    return eventLinks;
}

/**
 * Normalizes a date string into an ISO YYYY-MM-DD format.
 */
function normalizeDate(rawDate) {
    if (!rawDate || rawDate.trim() === "") return "No Date Found";

    try {
        // Match formats like "March 5" or "March 5, 2025"
        const dateMatch = rawDate.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})?/);

        if (dateMatch) {
            let [, monthName, day, extractedYear] = dateMatch;
            extractedYear = extractedYear || year; // Use 2025 if the year is missing

            const dateString = `${monthName} ${day}, ${extractedYear}`;
            const parsedDate = new Date(dateString);

            if (!isNaN(parsedDate.getTime())) {
                return `${parsedDate.getFullYear()}-${(parsedDate.getMonth() + 1)
                    .toString()
                    .padStart(2, "0")}-${parsedDate.getDate().toString().padStart(2, "0")}`;
            }
        }

        return "No Date Found";
    } catch (error) {
        console.error(`❌ Error parsing date '${rawDate}': ${error}`);
        return "No Date Found";
    }
}

/**
 * Extracts event details from an individual event page
 */
async function extractEventDetails(url) {
    const html = await fetchHtml(url);
    if (!html) {
        console.log(`❌ Skipping event due to fetch failure: ${url}`);
        return null;
    }

    const $ = cheerio.load(html);

    // Extract event title
    const title = $("h1").text().trim() || "No Title Found";

    // Extract date from multiple possible locations
    let rawDate =
        $("time[datetime]").attr("datetime") ||
        $(".date-display-single").text().trim() ||
        $(".event-meta-date").first().text().trim() ||
        $(".event-date").text().trim() ||
        $(".event-info").text().trim();

    const date = normalizeDate(rawDate);

    // Extract time
    let time =
        $(".event-time, .event-meta-time, .icon-du-clock")
            .first()
            .text()
            .trim()
            .replace(/\s+/g, " ") || "No Time Found";

    // Extract description
    let description =
        $(".event-description, .event-body, .event-summary, .event-details, .description")
            .find("p, div")
            .map((_, el) => $(el).text().trim())
            .get()
            .filter((text) => text.length > 10) // Avoid short/irrelevant descriptions
            .join(" ") || "No Description Found";

    console.log(`🎉 Extracted: Title: ${title}`);
    console.log(`📅 Date: ${date}`);
    console.log(`⏰ Time: ${time}`);
    console.log(`📝 Description (First 100 chars): ${description.substring(0, 100)}...`);

    return { title, date, time, description };
}

/**
 * Scrapes all events for the entire year
 */
async function scrapeEventsForYear() {
    const allEvents = [];

    for (let month = 1; month <= 12; month++) {
        const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
        const endDate = `${year}-${month.toString().padStart(2, "0")}-31`;
        const url = `${baseCalendarUrl}?search=&start_date=${startDate}&end_date=${endDate}`;

        console.log(`🔎 Scraping events for ${startDate} - ${endDate}`);

        const html = await fetchHtml(url);
        if (!html) continue;

        const eventLinks = await extractEventLinks(html);
        const monthEvents = await Promise.all(eventLinks.map(extractEventDetails));

        allEvents.push(...monthEvents.filter((event) => event !== null));
    }

    return allEvents;
}

/**
 * Main function to run the scraper
 */
async function main() {
    console.log("🚀 Starting event scraping...");
    const allEvents = await scrapeEventsForYear();

    // Save extracted events to a JSON file
    await fs.ensureDir("./results");
    await fs.writeJson(resultsPath, { events: allEvents }, { spaces: 2 });

    console.log(`✅ All events have been successfully saved to ${resultsPath}`);
}

// Run the scraper
main().catch((error) => {
    console.error(`❌ Fatal error in main function: ${error.message}`);
});