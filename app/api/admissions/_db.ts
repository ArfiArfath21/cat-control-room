import postgres from "postgres";

let database: ReturnType<typeof postgres> | null = null;

export function admissionsDb() {
  if (database) return database;
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("POSTGRES_URL is not configured.");
  database = postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return database;
}

export const ADMISSIONS_OWNER = "personal";
