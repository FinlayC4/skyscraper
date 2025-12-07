import axios from "axios";
import * as cheerio from "cheerio";
import { capitalise } from "./string-utils.js";
import { sequelize } from "./db.js";

import "./models/Person.js"; // Ensure the model is registered

const url = "https://news.sky.com/sky-news-profiles";

const start = async () => {
  await sequelize.sync({ force: true });
  console.log("Tables synced!");

  // Fetch the HTML content of the page
  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
  });

  const people = extractPeople(html);
  console.log(people);
};

start();

/**
 * Extract people data from HTML
 * @param {string} html - Raw HTML of the page
 * @returns {Array} Flattened array of people
 */
export function extractPeople(html) {
  // Load HTML into Cheerio
  const $ = cheerio.load(html);

  // Get all person elements and map to data objects
  const people = $(".ui-story").toArray().map((element) => {
    const person = $(element); // Cheerio-wrapped person element

    // Closest section element
    const section = person.closest("section");

    // Section title (formatted)
    const sectionTitle = section.find(".ui-section-header-title")
      .first().text().trim()

    // Get person data from the person article element
    const personData = getPersonData(person);

    // Return combined data
    return {
      sectionTitle,
      ...personData,
    }
  });

  return people;
}

/**
 * Get the data for a single person element.
 * @param {cheerio.Cheerio<Element>} person 
 */
function getPersonData(person) {
  // Person name
  const personName = person.find(".ui-story-tag")
    .first().text().trim();

  // Job title
  const headline = person.find(".ui-story-headline").first();
  const jobTitle = capitalise(headline.text().trim());

  // Profile URL and person ID
  const profileUrl = headline.attr("href") ?? null;
  const personId = getPersonIdFromProfileUrl(profileUrl);

  // Profile image URL
  const profileImageUrl = person.find("img.ui-story-media")
    .first().attr("src") ?? null;

  return {
    personId,
    personName,
    jobTitle,
    profileUrl,
    profileImageUrl
  };
}

function getPersonIdFromProfileUrl(profileUrl) {
  // Split the URL by hyphens
  const parts = profileUrl.split("-");

  // The ID is the last part of the URL after the last hyphen
  const id = parts[parts.length - 1] ?? null; // Coalesce to null if undefined

  return id;
}


