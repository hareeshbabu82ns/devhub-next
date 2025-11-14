"use server";

export async function getAppVersion() {
  return process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";
}
