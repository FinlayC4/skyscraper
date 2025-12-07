import axios from "axios";
import * as cheerio from "cheerio";
import { sequelize } from "./db.js";

import { Profile } from "./models/Profile.js"; // Ensure the model is registered
import { Op } from "sequelize";

const url = "https://news.sky.com/sky-news-profiles";

// Prevent duplication for performing on both stored and scraped profiles arrays
const profileArrayToMap = (profile) => {
  return new Map(profile.map(p => [p.profileId, p]));
}

const profileFieldsToUpdate = [
  "name",
  "jobTitle",
  "profileUrl",
  "profileImageUrl"
];

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

  const testData = [];

  // Sync profiles to the database

  await syncProfiles(scrapedProfiles);
};

start();

async function syncProfiles(scrapedProfiles, storedProfiles = null) {
  await sequelize.transaction(async (t) => {

    if (storedProfiles === null) {
      // Fetch all stored profiles from the database
      storedProfiles = await Profile.findAll({ transaction: t });
    }

    // Convert to Maps for fast lookup when filtering further down
    const storedProfileMap = profileArrayToMap(storedProfiles);
    const scrapedProfileMap = profileArrayToMap(scrapedProfiles);

    // Sky News profiles to be deleted from the database
    const profilesToDelete = storedProfiles.filter(
      (profile) => !scrapedProfileMap.has(profile.profileId)
    );

    const profilesToInsertOrUpdate = scrapedProfiles.filter(p => {
      const storedProfile = storedProfileMap.get(p.profileId);
      if (!storedProfile) return true; // new profile
      
      return profileFieldsToUpdate.some(f => storedProfile[f] !== p[f]); // changed field
    });

    // Insert or update profile records
    await Profile.bulkCreate(profilesToInsertOrUpdate, {
      updateOnDuplicate: profileFieldsToUpdate,
      transaction: t
    });

    // Deleting profile records
    if (profilesToDelete.length > 0) { // If there are profiles to delete
      await Profile.destroy({
        where: { // Where profile ID is in the list of profiles to delete
          profileId: {
            [Op.in]: profilesToDelete.map(p => p.profileId)
          }
        },
        transaction: t
      });
    }
  });
}

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