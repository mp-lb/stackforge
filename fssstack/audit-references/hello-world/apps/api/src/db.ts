import { MongoClient, type Db } from "mongodb";

let client: MongoClient | undefined;

export async function getDatabase(url: string): Promise<Db> {
  client ??= new MongoClient(url);
  await client.connect();
  return client.db();
}

export async function closeDatabase() {
  await client?.close();
  client = undefined;
}
