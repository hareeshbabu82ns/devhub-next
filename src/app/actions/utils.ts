"use server";

export async function getAppVersion() {
  return process.env.npm_package_version || "";
}
