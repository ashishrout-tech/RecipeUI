import fs from "fs";
import path from "path";
import { produce } from "immer";
import { Recipe } from "types/database";

export function restrictRecipes(recipes: NonNullable<Recipe["templates"]>) {
  return produce(recipes, (draft) => {
    for (const recipe of draft) {
      if (recipe.replay) {
        recipe.replay = restrictObjectsAndArrays(
          recipe.replay
        ) as typeof recipe.replay;
      }
    }
  });
}

export function restrictObjectsAndArrays(obj: Record<string, unknown>) {
  const ARRAY_REDUCE_FACTOR = 3;
  const OBJECT_REDUCE_FACTOR = 10;

  function recursivelyReduce(_obj: Record<string, unknown>) {
    let count = 0;
    let additionalProperties: string[] = [];

    const entries = Object.entries(_obj);
    for (const [key, value] of entries) {
      count += 1;

      if (count >= OBJECT_REDUCE_FACTOR) {
        additionalProperties.push(key);
        delete _obj[key];
        continue;
      }

      if (Array.isArray(value)) {
        const restrictedArray = value.slice(0, ARRAY_REDUCE_FACTOR);
        _obj[key] = restrictedArray;

        for (const item of restrictedArray) {
          if (typeof item === "object" && item !== null) {
            recursivelyReduce(item as Record<string, unknown>);
          }
        }

        if (value.length >= 3) {
          restrictedArray.push("...");
        }
      } else if (typeof value === "object" && value !== null) {
        recursivelyReduce(value as Record<string, unknown>);
      }
    }

    if (additionalProperties.length > 0) {
      _obj["_recipeui_additionalProperties"] = additionalProperties;
    }
  }

  return produce(obj, (draft) => {
    recursivelyReduce(draft);
  });
}

export const toSnakeCase = (str: string): string => {
  return (
    str
      // Convert spaces, underscores, or dashes to a space
      .replace(/[\s_-]+/g, " ")
      // Trim whitespaces and convert to lowercase
      .trim()
      // Replace spaces between words with an underscore
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      // Convert all characters to lowercase
      .toLowerCase()
      // Replace spaces with underscores
      .replace(/\s+/g, "_")
  );
};

export function findFilesInDir(
  startPath: string,
  filter: string,
  callback: (filePath: string) => void,
  postCompletion?: () => void
) {
  if (!fs.existsSync(startPath)) {
    console.log("No directory found:", startPath);
    return;
  }

  const files = fs.readdirSync(startPath);
  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i]);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      findFilesInDir(filename, filter, callback); // Recursive call
    } else if (filename.indexOf(filter) >= 0) {
      callback(filename);
    }
  }

  postCompletion?.();
}
