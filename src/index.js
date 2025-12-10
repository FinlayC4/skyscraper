import axios from "axios";
import * as cheerio from "cheerio";
import { sequelize } from "./db.js";

import { Profile } from "./models/Profile.js"; // Ensure the model is registered
import { User } from "./models/User.js";
import { Op } from "sequelize";

import findProfileDifferences from "./utils/findProfileDifferences.js";
import profileFieldsToUpdate from "./utils/profileFieldsToUpdate.js";

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

  console.log("Sync complete. Changes:", JSON.stringify(changes));
};

start();

async function syncProfilesToDb(scrapedProfiles) {
  // Fetch all stored profiles from the database
  const storedProfiles = await Profile.findAll();

  // Find differences between scraped and stored profiles on DB
  const { inserted, deleted, updated } = findProfileDifferences(scrapedProfiles, storedProfiles);

  // Helper variables to reduce code
  const hasInserts = inserted.length > 0;
  const hasDeletes = deleted.length > 0;
  const hasUpdates = updated.length > 0;

  // If there is some sort of change between the two data sets
  if (hasInserts || hasDeletes || hasUpdates) {
    await sequelize.transaction(async (t) => {

      // If there are profiles to insert or update
      if (hasInserts || hasUpdates) {
        const upsertData = [
          ...inserted,
          ...updated.map(u => u.profile) // Extract list of only profile data
        ];

        // Insert or update profile records
        await Profile.bulkCreate(upsertData, {
          updateOnDuplicate: profileFieldsToUpdate,
          transaction: t
        });
      }

      // Deleting profile records
      if (hasDeletes) { // If there are profiles to delete
        await Profile.destroy({
          where: { // Where profile ID is in the list of profiles to delete
            profileId: {
              [Op.in]: deleted.map(p => p.profileId)
            }
          },
          transaction: t
        });
      }
    });
  }

  return { inserted, deleted, updated };
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