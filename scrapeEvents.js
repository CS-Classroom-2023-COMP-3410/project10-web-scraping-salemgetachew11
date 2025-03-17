const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");

const URL = "https://denverpioneers.com/";  // Change this to the actual URL you want to scrape

/**
 * Fetches the HTML content from the specified URL.
 */
async function fetchHtml(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${url}: ${error.message}`);
        return null;
    }
}

/**
 * Parses the HTML to extract event details.
 * Replace '.event-container', '.event-title', '.event-date' with actual selectors.
 */
async function extractEvents(html) {
    if (!html) {
        console.log("Failed to fetch HTML content.");
        return [];
    }

    const $ = cheerio.load(html);
    const events = [];

    $('.event-container').each((index, element) => {
        const title = $(element).find('.event-title').text().trim();
        const date = $(element).find('.event-date').text().trim();

        if (title && date) {
            events.push({
                title: title,
                date: date
            });
        }
    });

    return events;
}

/**
 * Main function to scrape events and save them to a JSON file.
 */
async function scrapeEvents() {
    console.log("Starting to scrape events...");
    const html = await fetchHtml(URL);
    const events = await extractEvents(html);

    if (events.length > 0) {
        const filePath = path.join(__dirname, 'results', 'events.json');
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeJson(filePath, { events }, { spaces: 4 });
        console.log(`Events have been saved to ${filePath}`);
    } else {
        console.log("No events found on the page.");
    }
}

// Run the scraper
scrapeEvents().catch(error => {
    console.error(`Error during scraping: ${error.message}`);
});
