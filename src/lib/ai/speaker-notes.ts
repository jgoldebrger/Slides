export function speakerNotesRepeatBullets(
  bullets: string[],
  notes: string
): boolean {
  const bulletWords = new Set(
    bullets
      .join(" ")
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3)
  );

  if (bulletWords.size === 0) return false;

  const noteWords = notes
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3);

  let overlap = 0;
  for (const word of bulletWords) {
    if (noteWords.includes(word)) overlap += 1;
  }

  return overlap / bulletWords.size > 0.6;
}
