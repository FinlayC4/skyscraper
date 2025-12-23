import axios from "axios";
import * as cheerio from "cheerio";

import { sequelize } from "./db.js";
import { syncProfilesToDb } from "./utils/syncProfilesToDb.js";
import { ScrapedProfileSchema } from "./scrapedProfileSchema.js";
import * as z from "zod";
import transporter from "./mailer.js";

const url = "https://news.sky.com/sky-news-profiles";

const start = async () => {
  await sequelize.sync();

  // Fetch the HTML content of the page
  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
  });

  transporter.sendMail({
    from: {
      name: "Sky News People Monitor",
      address: "ducklifee7@gmail.com"
    },
    to: "finlay.carter@hotmail.co.uk",
    subject: "Dogfood",
    text: "Hello, dog food"
  });
  
  // Extract profiles from the HTML
  const scrapedProfiles = extractProfiles(html);

  console.log(scrapedProfiles);

  // Sync profiles to the database
  const changes = await syncProfilesToDb(scrapedProfiles);
  console.log("Sync complete.");

  console.log("Changes:", JSON.stringify(changes));
};

start();


export function extractProfiles(html) {
  // Load HTML into Cheerio
  const $ = cheerio.load(html);

  // Get all person elements and map to data objects
  const people = $(".ui-story").toArray().map((element) => {
    const person = $(element); // Cheerio-wrapped person element

    // Closest section element
    //const section = person.closest("section");

    // Section title (formatted)
    //const sectionTitle = section.find(".ui-section-header-title")
      //.first().text().trim()

    // Get person data from the person article element
    const personData = getProfileData(person);

    // Return combined data
    return {
      //sectionTitle,
      ...personData,
    }
  });

  return people;
}

/**
 * Get the data for a single person element.
 * @param {cheerio.Cheerio} person 
 */
function getProfileData(person) {
  // Returns string or null
  const getTextOrNull = (el) => (
    // Null if element doesn't exist, otherwise, returns text
    el.length > 0 ? el.text().trim() : null
  );
  
  // Returns string or null
  const getAttrOrNull = (el, attrName) => (
    // Null if element doesn't exist, otherwise, returns attribute value
    el.length > 0 ? el.attr(attrName) ?? null : null
  );

  // Person name
  const name = getTextOrNull(person.find(".ui-story-tag"));

  // Job title
  const headline = person.find(".ui-story-headline").first();
  const jobTitle = getTextOrNull(headline);

  // Profile URL and person ID
  const profileUrl = getAttrOrNull(headline, "href");
  const profileId = getProfileIdFromProfileUrl(profileUrl ?? "");

  // Profile image URL
  const profileImageUrl = getAttrOrNull(
    person.find("img.ui-story-media").first(),
    "src"
  );

  // Return all person data
  return {
    profileId,
    name,
    jobTitle,
    profileUrl,
    profileImageUrl
  };
}

function validateProfile(profile, isInsert) {
  const profileIdSchema = z.int().positive();
  const nameSchema = z.string().min(1);
  const jobTitleSchema = z.string().min(1);
  const profileUrlSchema = z.url();
  const profileImageUrlSchema = z.url();
  // None above should be nullable as we expect
  // them all on the Sky News profile

  let validated = {};

  const profileIdResult = profileIdSchema.safeParse(profile.profileId);

  if (!profileIdResult.success) {
    return { success: false };
  }

  const nameResult = nameSchema.safeParse(profile.name);

  if (nameResult.success) {
    validated.name = nameResult.data;
  } else if (isInsert) {
    return { success: false };
  }

  const optionalFields = {
    jobTitle: jobTitleSchema,
    profileUrl: profileUrlSchema,
    profileImageUrl: profileImageUrlSchema
  }; 

  for (const key in optionalFields) {
    const result = optionalFields[key].safeParse(profile[key]);
    if (result.success) {
      validated[key] = result.data;
    }
  }

  return { success: true, validated };
}

function getProfileIdFromProfileUrl(profileUrl) {
  // Split the URL by hyphens
  const parts = profileUrl.split("-");
  const lastPart = parts[parts.length - 1];

  // If not positive integer (leading zeros fails it too)
  if (!/^[1-9]\d*$/.test(lastPart)) {
    return null;
  }

  return Number(lastPart);
}

