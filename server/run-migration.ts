import { renameLegacyLogos } from "./migrations/rename_logos";

async function main() {
  console.log('Starting logo rename migration...');
  await renameLegacyLogos();
  process.exit(0);
}

main().catch(console.error);
