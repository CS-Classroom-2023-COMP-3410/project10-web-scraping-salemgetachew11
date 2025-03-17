const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");

const url = "https://bulletin.du.edu/undergraduate/majorsminorscoursedescriptions/traditionalbachelorsprogrammajorandminors/computerscience/#coursedescriptionstext";
const resultsPath = "./results/bulletin.json";

/**
 * Fetches HTML content from a given URL.
 */
async function fetchHtml(url) {
    console.log(`🔍 Fetching: ${url}`);
    try {
        const { data } = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });
        return data;
    } catch (error) {
        console.error(`❌ ERROR: Unable to fetch URL: ${url} - ${error.message}`);
        return null;
    }
}

/**
 * Extracts course details from the bulletin page.
 */
async function extractCourses(html) {
    const $ = cheerio.load(html);
    let courses = [];

    $(".courseblock").each((i, elem) => {
        const titleText = $(elem).find(".courseblocktitle").text().trim();
        const description = $(elem).find(".courseblockdesc").text().trim();

        if (!titleText) return;

        // Extract course code and title correctly
        const match = titleText.match(/(COMP\s*\d+)\s*(.*?)(?:\(\d+ Credits\))?$/);
        if (!match) return;

        const courseCode = match[1].replace(/\s+/g, "-").trim(); // Convert COMP 3000 → COMP-3000
        const courseTitle = match[2].trim() || "No Title Provided";

        // Extract course level (e.g., COMP-3000 -> 3000)
        const courseLevel = parseInt(courseCode.match(/\d+/)?.[0], 10);

        // Only include courses at 3000+ level that DO NOT mention "Prerequisite"
        if (courseLevel >= 3000 && !description.toLowerCase().includes("prerequisite")) {
            courses.push({
                course: courseCode,
                title: courseTitle,
            });
        }
    });

    console.log(`✅ Extracted ${courses.length} courses.`);
    return courses;
}

/**
 * Main function to scrape and save course data.
 */
async function scrapeCourses() {
    console.log("🚀 Starting DU Bulletin scraping...");

    const html = await fetchHtml(url);
    if (!html) return;

    const courses = await extractCourses(html);

    // Ensure results directory exists
    await fs.ensureDir("./results");
    await fs.writeJson(resultsPath, { courses }, { spaces: 2 });

    console.log(`✅ Courses successfully saved to ${resultsPath}`);
}

// Run the scraper
scrapeCourses();
