import profileFieldsToUpdate from "./profileFieldsToUpdate.js";

// Prevent duplication for performing on both stored and scraped profiles arrays
const profileArrayToMap = (profile) => {
  return new Map(profile.map(p => [p.profileId, p]));
}

export default function findProfileDifferences(scrapedProfiles, storedProfiles) {
  // Convert to Maps for fast lookup when filtering further down
  const storedProfileMap = profileArrayToMap(storedProfiles);
  const scrapedProfileMap = profileArrayToMap(scrapedProfiles);

  // Sky News profiles to be deleted from the database
  const profilesToDelete = storedProfiles.filter(
    (profile) => !scrapedProfileMap.has(profile.profileId)
  );

  const profilesToInsert = [];
  const profilesToUpdate = [];

  for (const scrapedProfile of scrapedProfiles) {
    // Find corresponding stored profile by profile ID
    const storedProfile = storedProfileMap.get(scrapedProfile.profileId);

    // New profile to insert
    if (!storedProfile) {
      profilesToInsert.push(scrapedProfile);
      continue;
    }
    // Profile exists, check for updates

    const changedFields = []; // To track changed fields for each profile

    for (const f of profileFieldsToUpdate) {
      // If field value has changed
      if (storedProfile[f] !== scrapedProfile[f]) {
        // Set the changed field old and new values
        changedFields.push({
          field: f, // field: <field name>
          old: storedProfile[f], // Previous value
          new: scrapedProfile[f] // New value
        });
      }
    }

    // If any fields changed
    if (changedFields.length > 0) {
      // Add to list of 'to update' profiles
      profilesToUpdate.push({ profile: scrapedProfile, changedFields });
    }
  }
  
  return {
    deleted: profilesToDelete,
    inserted: profilesToInsert,
    updated: profilesToUpdate,
  };
}