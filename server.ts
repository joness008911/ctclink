import fs from "fs";
import path from "path";

// If production build exists in dist, load it directly
const distIndexPath = path.resolve(process.cwd(), "dist", "index.js");

if (fs.existsSync(distIndexPath)) {
  await import("./dist/index.js");
} else {
  // Fallback to loading typescript entrypoint
  try {
    const { register } = await import("tsx/esm/api");
    register();
  } catch {
    // tsx already registered or not required
  }
  await import("./server/index.ts");
}
