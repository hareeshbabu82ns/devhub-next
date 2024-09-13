"use server";

import { FileAttributes } from "./utils";
import { extname, resolve } from "path";
import { mkdir, rm } from "fs/promises";
import config from "@/config";
import { readdirSync, statSync } from "fs";

export const createFolder = async (path: string) => {
  const folderPath = resolve(config.dataFolder + "/uploads/" + path);
  const res = await mkdir(folderPath, { recursive: true });
  return !!res;
};

export const deleteFolder = async (path: string) => {
  const folderPath = resolve(config.dataFolder + "/uploads/" + path);
  const res = await rm(folderPath, { recursive: true, force: true });
  return res;
};

export const deleteAsset = async (path: string) => {
  const folderPath = resolve(config.dataFolder + "/uploads/" + path);
  const res = await rm(folderPath);
  return res;
};

export const createAsset = async (path: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`/api/assets/upload?path=${path}`, {
    method: "POST",
    body: formData,
  });
  return response.json();
};

export const exploreAssets = async (path: string) => {
  const explorePath = path === "/" ? "" : path;
  const resolvedPath = resolve(config.dataFolder + "/uploads/" + explorePath);
  const files = readdirSync(resolvedPath);
  // get file attributes
  const fileAttributes: FileAttributes[] = files.map((file) => {
    const stats = statSync(resolve(resolvedPath, file));
    const attrs = {
      id: file,
      name: file,
      downloadURL: resolve(
        "/api/assets/" +
          "/uploads/" +
          explorePath +
          "/" +
          file +
          "?download=true",
      ),
      ext: stats.isFile() ? extname(file).split(".").pop() || "" : "",
      size: stats.size,
      mtime: stats.mtime,
      isDirectory: stats.isDirectory(),
    };
    return attrs;
  });
  return { total: files.length, assets: fileAttributes };
};
