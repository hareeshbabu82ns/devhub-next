/**
 * Devotional Constants for DevHub
 *
 * Constants related to daily and weekly devotional content organization
 */

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const DAYS_OF_WEEK_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export const DEVOTIONAL_CATEGORIES = {
  EVERYDAY: "EVERYDAY",
  SUNDAY: "SUNDAY",
  MONDAY: "MONDAY",
  TUESDAY: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  FRIDAY: "FRIDAY",
  SATURDAY: "SATURDAY",
} as const;

export type DevotionalCategory =
  (typeof DEVOTIONAL_CATEGORIES)[keyof typeof DEVOTIONAL_CATEGORIES];

// Map day index to devotional category
export const DAY_INDEX_TO_CATEGORY: Record<number, DevotionalCategory> = {
  0: DEVOTIONAL_CATEGORIES.SUNDAY,
  1: DEVOTIONAL_CATEGORIES.MONDAY,
  2: DEVOTIONAL_CATEGORIES.TUESDAY,
  3: DEVOTIONAL_CATEGORIES.WEDNESDAY,
  4: DEVOTIONAL_CATEGORIES.THURSDAY,
  5: DEVOTIONAL_CATEGORIES.FRIDAY,
  6: DEVOTIONAL_CATEGORIES.SATURDAY,
};

// Traditional Hindu deity associations for each day
export const DAY_DEITY_ASSOCIATIONS = {
  SUNDAY: { deity: "Surya", color: "var(--chart-1)", description: "Sun God" },
  MONDAY: {
    deity: "Shiva",
    color: "var(--chart-2)",
    description: "Lord Shiva",
  },
  TUESDAY: {
    deity: "Hanuman",
    color: "var(--chart-3)",
    description: "Lord Hanuman",
  },
  WEDNESDAY: {
    deity: "Ganesha",
    color: "var(--chart-4)",
    description: "Lord Ganesha",
  },
  THURSDAY: {
    deity: "Vishnu",
    color: "var(--chart-5)",
    description: "Lord Vishnu",
  },
  FRIDAY: {
    deity: "Devi",
    color: "var(--chart-6)",
    description: "Divine Mother",
  },
  SATURDAY: { deity: "Shani", color: "var(--chart-7)", description: "Saturn" },
} as const;

// Type for day-specific categories (excluding EVERYDAY)
export type DaySpecificCategory = Exclude<DevotionalCategory, "EVERYDAY">;

// Helper function to check if a category is day-specific
export const isDaySpecificCategory = (
  category: DevotionalCategory,
): category is DaySpecificCategory => {
  return category !== "EVERYDAY";
};
