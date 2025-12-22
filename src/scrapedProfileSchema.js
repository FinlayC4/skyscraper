import * as z from "zod";

export const ScrapedProfileSchema = z.object({
  profileId: z.int().positive(),
  name: z.string().min(1).nullable(),
  jobTitle: z.string().nullable(),
  //sectionTitle: z.string().nullable(),
  profileUrl: z.url().nullable(),
  profileImageUrl: z.url().nullable()
});