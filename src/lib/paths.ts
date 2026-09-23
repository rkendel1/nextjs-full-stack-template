import { resolve } from "node:path";

export function appPortConfigPath() {
  return resolve(process.cwd(), "appport.toml");
}

export function flowPath() {
  return resolve(process.cwd(), "feltdb.flow");
}

export function durableStatePath() {
  return resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.FELTDB_PATH ?? ".data/appport");
}
