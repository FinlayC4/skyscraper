import axios from "axios";
import * as cheerio from "cheerio";
import { sequelize } from "./db.js";

import { Profile } from "./models/Profile.js"; // Ensure the model is registered
import { User } from "./models/User.js";
import { Op } from "sequelize";

import { syncProfilesToDb } from "./utils/syncProfilesToDb.js";


const url = "https://news.sky.com/sky-news-profiles";

const start = async () => {
  await sequelize.sync();
  console.log("Tables synced!");

  // Fetch the HTML content of the page
  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
  });
  
  // Extract profiles from the HTML
  const scrapedProfiles = extractProfiles(html);

  // Sync profiles to the database
  const changes = await syncProfilesToDb(scrapedProfiles);
  console.log("Sync complete.");

  console.log("Changes:", JSON.stringify(changes));
};

start();


/**
 * Extract people data from HTML
 * @param {string} html - Raw HTML of the page
 * @returns {Array} Flattened array of people
 */
export function extractProfiles(html) {
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
    const personData = getProfileData(person);

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
function getProfileData(person) {
  // Person name
  const name = person.find(".ui-story-tag")
    .first().text().trim();

  // Job title
  const headline = person.find(".ui-story-headline").first();
  const jobTitle = headline.text().trim();

  // Profile URL and person ID
  const profileUrl = headline.attr("href") ?? null;
  const profileId = getProfileIdFromProfileUrl(profileUrl ?? "");

  // Profile image URL
  const profileImageUrl = person.find("img.ui-story-media")
    .first().attr("src") ?? null;

  // Return all person data
  return {
    profileId: profileId === null ? null : Number(profileId),
    name,
    jobTitle,
    profileUrl,
    profileImageUrl
  };
}

function getProfileIdFromProfileUrl(profileUrl) {
  // Split the URL by hyphens
  const parts = profileUrl.split("-");

  // The ID is the last part of the URL after the last hyphen
  const id = parts[parts.length - 1] ?? null; // Coalesce to null if undefined

  return id;
}