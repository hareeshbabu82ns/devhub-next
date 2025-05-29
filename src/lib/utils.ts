import config from "@/config";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const convertFileToUrl = (file: File) => URL.createObjectURL(file);

export function avatarAltName(name: string) {
  return name
    ?.split(" ")
    .map((word: string) => word[0].toUpperCase())
    .join("");
}

export function formatPhoneNumber(phoneNumberString: string) {
  const cleaned = `${phoneNumberString}`.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phoneNumberString;
}

const CURR_FORMATTER = new Intl.NumberFormat("en-CA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export function formatCurrency(amount: number) {
  // return amount.toFixed(2);
  // const amount = parseFloat(amount);
  return CURR_FORMATTER.format(amount);
}

export function formatDuration(duration?: number) {
  const durationHr = Math.floor((duration || 0) / 60);
  const durationMin = (duration || 0) % 60;
  const durationStr = duration
    ? durationHr > 0
      ? `${durationHr.toString().padStart(2, "0")}h ${durationMin.toString().padStart(2, "0")}m`
      : `${durationMin.toString().padStart(2, "0")}m`
    : "";
  return durationStr;
}

export function simulateDelay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// FORMAT DATE TIME
export const formatDateTime = (
  dateString: Date | string,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
) => {
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    // weekday: "short", // abbreviated weekday name (e.g., 'Mon')
    month: "short", // abbreviated month name (e.g., 'Oct')
    day: "numeric", // numeric day of the month (e.g., '25')
    year: "numeric", // numeric year (e.g., '2023')
    hour: "numeric", // numeric hour (e.g., '8')
    minute: "numeric", // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false),
    timeZone: timeZone, // use the provided timezone
  };

  const dateDayOptions: Intl.DateTimeFormatOptions = {
    weekday: "short", // abbreviated weekday name (e.g., 'Mon')
    year: "numeric", // numeric year (e.g., '2023')
    month: "2-digit", // abbreviated month name (e.g., 'Oct')
    day: "2-digit", // numeric day of the month (e.g., '25')
    timeZone: timeZone, // use the provided timezone
  };

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: "short", // abbreviated month name (e.g., 'Oct')
    year: "numeric", // numeric year (e.g., '2023')
    day: "numeric", // numeric day of the month (e.g., '25')
    timeZone: timeZone, // use the provided timezone
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric", // numeric hour (e.g., '8')
    minute: "numeric", // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
    timeZone: timeZone, // use the provided timezone
  };

  const formattedDateTime: string = new Date(dateString).toLocaleString(
    "en-US",
    dateTimeOptions,
  );

  const formattedDateDay: string = new Date(dateString).toLocaleString(
    "en-US",
    dateDayOptions,
  );

  const formattedDate: string = new Date(dateString).toLocaleString(
    "en-US",
    dateOptions,
  );

  const formattedTime: string = new Date(dateString).toLocaleString(
    "en-US",
    timeOptions,
  );

  return {
    dateTime: formattedDateTime,
    dateDay: formattedDateDay,
    dateOnly: formattedDate,
    timeOnly: formattedTime,
  };
};

export function encryptKey(passkey: string) {
  return btoa(passkey);
}

export function decryptKey(passkey: string) {
  return atob(passkey);
}

export const downloadFile = ({
  data,
  fileName,
  fileType,
}: {
  data: any;
  fileName: string;
  fileType: string;
}) => {
  // Create a blob with the data we want to download as a file
  const blob = new Blob([data], { type: fileType });
  // Create an anchor element and dispatch a click event on it
  // to trigger a download
  const a = document.createElement("a");
  a.download = fileName;
  a.href = window.URL.createObjectURL(blob);
  const clickEvt = new MouseEvent("click", {
    view: window,
    bubbles: true,
    cancelable: true,
  });
  a.dispatchEvent(clickEvt);
  a.remove();
};

export const trimNewLineChar = (line: any) => {
  if (typeof line === "string") {
    return line.replace(/\r?\n|\r/g, "");
  }
  return line;
};

export const trimQuotes = (val: any) => {
  if (typeof val === "string") {
    return val.replace(/^["']+|["']+$/g, "");
  }
  return val;
};

// Function to generate safe file name from URL
export const getSafePathFromUrl = (
  url: string,
): {
  timestamp: string;
  folderName: string;
  jsonFilePath: string;
  htmlFilePath: string;
  folderPath: string;
} => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.]/g, "")
    .slice(0, 14); // yyyyMMddHHmmss
  try {
    const urlObj = new URL(url);
    const pageName =
      urlObj.hostname + urlObj.pathname.replace(/[^a-z0-9]/gi, "_");
    const folderName = `${pageName}`;
    return {
      timestamp,
      folderName,
      jsonFilePath: `${config.dataFolder}/scrape/${folderName}/extracted_${timestamp}.json`,
      htmlFilePath: `${config.dataFolder}/scrape/${folderName}/page.html`,
      folderPath: `${config.dataFolder}/scrape/${folderName}`,
    };
  } catch (error) {
    // If URL is invalid, return default path
    return {
      timestamp,
      folderName: "output",
      folderPath: `${config.dataFolder}/scrape/output`,
      htmlFilePath: `${config.dataFolder}/scrape/output/page.html`,
      jsonFilePath: `${config.dataFolder}/scrape/output/extracted_${timestamp}.json`,
    };
  }
};
