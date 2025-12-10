import profileFieldsToUpdate from "./profileFieldsToUpdate.js";

// Prevent duplication for performing on both stored and scraped profiles arrays
const profileArrayToMap = (profiles) => {
  return new Map(profiles.map(p => [p.profileId, p]));
}

const getChangedFields = (scraped, stored) => {
  return profileFieldsToUpdate
    .filter(f => scraped[f] !== stored[f])
    .map(f => ({
      field: f,
      old: stored[f],
      new: scraped[f],
    }));
};

export default function findProfileDifferences(scrapedProfiles, storedProfiles) {
  // Convert to Maps for fast lookup when filtering further down
  const storedProfileMap = profileArrayToMap(storedProfiles);
  const scrapedProfileMap = profileArrayToMap(scrapedProfiles);

  // Sky News profiles to be deleted from the database
  const deleted = storedProfiles.filter(
    (p) => !scrapedProfileMap.has(p.profileId)
  );

  const inserted = []; // Profiles that are new and need inserting into DB
  const updated = []; // Profiles that have different field values to on DB

  for (const scrapedProfile of scrapedProfiles) {
    // Find corresponding stored profile by profile ID
    const storedProfile = storedProfileMap.get(scrapedProfile.profileId);

    // New profile to insert
    if (!storedProfile) {
      inserted.push(scrapedProfile);
      continue; // Go immediately to next iteration
    }
    // Profile exists, check for updates

    const changedFields = getChangedFields(scrapedProfile, storedProfile);

    // If any fields changed
    if (changedFields.length > 0) {
      // Add to list of 'to update' profiles
      updated.push({ profile: scrapedProfile, changedFields });
    }
  }
  
  return { deleted, inserted, updated };
}