/**
 * API Route for uploading SQLite dictionary files
 * Handles large file uploads that exceed server action limits
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";
import { auth } from "@/lib/auth";
import {
  LEXICON_ALL_DICT,
  DictionaryName,
} from "@/lib/dictionary/dictionary-constants";
import config from "@/config";

const SQLITE_DIR = resolve(config.dataFolder, "dict");

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 },
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const dictionary = formData.get("dictionary") as DictionaryName;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!dictionary || !LEXICON_ALL_DICT.includes(dictionary)) {
      return NextResponse.json(
        { error: "Invalid dictionary name" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!file.name.endsWith(".sqlite")) {
      return NextResponse.json(
        { error: "File must be a .sqlite file" },
        { status: 400 },
      );
    }

    // Validate file size (optional - add reasonable limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 100MB." },
        { status: 400 },
      );
    }

    // Ensure SQLITE_DIR exists
    if (!existsSync(SQLITE_DIR)) {
      await mkdir(SQLITE_DIR, { recursive: true });
    }

    // Write file to SQLITE_DIR
    const targetPath = resolve(SQLITE_DIR, `${dictionary}.sqlite`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(targetPath, buffer);

    return NextResponse.json({
      success: true,
      filePath: targetPath,
      message: `SQLite file for ${dictionary.toUpperCase()} uploaded successfully`,
    });
  } catch (error) {
    console.error("Failed to upload SQLite file:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload SQLite file",
      },
      { status: 500 },
    );
  }
}
