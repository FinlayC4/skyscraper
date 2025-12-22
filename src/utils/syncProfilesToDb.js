import { Op } from "sequelize";
import { sequelize } from "../db.js";
import { Profile } from "../models/Profile.js";
import { findProfileDifferences } from "./findProfileDifferences.js";
import { profileUpdatableFields } from "../models/Profile.js";

export async function syncProfilesToDb(scrapedProfiles) {
  // Fetch all stored profiles from the database
  const storedProfiles = await Profile.findAll();

  // Find differences between scraped and stored profiles on DB
  const { inserted, deleted, updated } = findProfileDifferences(
    scrapedProfiles,
    storedProfiles,
    profileUpdatableFields
  );

  // If there are rows to update or insert
  const hasUpserts = inserted.length > 0 || updated.length > 0;

  // If there are rows to delete
  const hasDeletes = deleted.length > 0;

  // If there is some sort of change between the two data sets
  if (hasDeletes || hasUpserts) {
    await sequelize.transaction(async (t) => {

      // If there are profiles to insert or update
      if (hasUpserts) {
        const upsertData = [
          ...inserted,
          ...updated.map(u => u.profile) // Extract list of only profile data
        ];

        // Insert or update profile records
        await Profile.bulkCreate(upsertData, {
          updateOnDuplicate: profileUpdatableFields,
          transaction: t,
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