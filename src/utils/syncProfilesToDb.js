import { sequelize } from "../db";
import { Profile } from "../models/Profile";
import findProfileDifferences from "./findProfileDifferences";

export async function syncProfilesToDb(scrapedProfiles) {
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