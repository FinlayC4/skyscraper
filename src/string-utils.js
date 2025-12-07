export function toTitleCase(string) {
  return string
    .trim()
    .toLowerCase()
    .split(/\s+/) // splits on any whitespace
    .map(word => capitalise(word))
    .join(" ");
}

export function capitalise(word) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function getPersonIdFromProfileUrl(profileUrl) {
  // Split the URL by hyphens
  const parts = profileUrl.split("-");

  // The ID is the last part of the URL after the last hyphen
  const id = parts[parts.length - 1] ?? null; // Coalesce to null if undefined

  return id;
}