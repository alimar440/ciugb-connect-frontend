import postgres from "postgres";
import { readFile } from "node:fs/promises";
if (!process.env.DATABASE_URL)
  throw new Error(
    "Définir DATABASE_URL dans votre environnement local avant de lancer la migration.",
  );
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  await sql.unsafe(
    await readFile(new URL("../database/schema.sql", import.meta.url), "utf8"),
  );
  console.log("Schéma CIUGB créé.");
} finally {
  await sql.end();
}
