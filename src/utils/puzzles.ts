import { appDataDir, resolve } from "@tauri-apps/api/path";
import type { FileMetadata, Directory, FileInfoMetadata } from "@/features/files/components/file";
import { BaseDirectory, readDir, exists, readTextFile, type DirEntry } from "@tauri-apps/plugin-fs";
import { commands, type PuzzleDatabaseInfo } from "@/bindings";
import { unwrap } from "./unwrap";

export type Completion = "correct" | "incorrect" | "incomplete";

export interface Puzzle {
  fen: string;
  moves: string[];
  rating: number;
  rating_deviation: number;
  popularity: number;
  nb_plays: number;
  completion: Completion;
}

async function getPuzzleDatabase(name: string): Promise<PuzzleDatabaseInfo> {
  const appDataDirPath = await appDataDir();
  const path = await resolve(appDataDirPath, "puzzles", name);
  return unwrap(await commands.getPuzzleDbInfo(path));
}

export async function getPuzzleDatabases(localFiles: (FileMetadata | Directory)[]): Promise<PuzzleDatabaseInfo[]> {
  let dbPuzzles: PuzzleDatabaseInfo[] = [];

  // Get .db3 puzzle databases from AppData/puzzles folder
  try {
    const files = await readDir("puzzles", { baseDir: BaseDirectory.AppData });
    const dbs = files.filter((file) => file.name?.endsWith(".db3"));
    dbPuzzles = (await Promise.allSettled(dbs.map((db) => getPuzzleDatabase(db.name))))
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<PuzzleDatabaseInfo>).value);
    console.log("Loaded puzzle databases:", dbPuzzles);
  } catch (err) {
    console.error("Error loading .db3 puzzles:", err);
  }

  // Get local .pgn puzzle files from document directory
  let localPuzzles: PuzzleDatabaseInfo[] = [];
  try {
    const puzzleFiles = localFiles.filter((file): file is FileMetadata => {
      if (file.type !== "file" || !file.path.endsWith(".pgn")) return false;
      const fileInfo = file.metadata as FileInfoMetadata;
      return fileInfo?.type === "puzzle";
    });

    // Convert puzzle files to database format
    localPuzzles = await Promise.all(
      puzzleFiles.map(async (file) => {
        const stats = unwrap(await commands.getFileMetadata(file.path));
        return {
          title: file.name.replace(".pgn", ""),
          description: "Custom puzzle collection",
          puzzleCount: unwrap(await commands.countPgnGames(file.path)),
          storageSize: stats.last_modified,
          path: file.path
        };
      })
    );
    console.log("Loaded local puzzle files:", localPuzzles);
  } catch (err) {
    console.error("Error loading local puzzles:", err);
  }

  // Combine both types of puzzle sources
  return [...dbPuzzles, ...localPuzzles];
}
