// seed/bind-demo-uids.mjs
import { readFileSync } from "node:fs";

const demoIds = ["demo-owner", "demo-writer", "demo-guest"];
const uids = process.argv.slice(2);
const isAppUid = (uid) => /^[A-Za-z0-9_-]{1,128}$/.test(uid) && !uid.startsWith("demo-");
if (uids.length !== demoIds.length || new Set(uids).size !== uids.length || !uids.every(isAppUid)) {
  console.error("Usage: node seed/bind-demo-uids.mjs OWNER_UID WRITER_UID GUEST_UID");
  process.exit(1);
}

const seed = JSON.parse(readFileSync(new URL("./seed.json", import.meta.url), "utf8"));
const uidMap = new Map(demoIds.map((id, index) => [id, uids[index]]));
const bound = {};
for (const [path, value] of Object.entries(seed)) {
  const [collection, ...segments] = path.split("/");
  // 온보딩에서 만든 사용자 프로필과 코드 매핑을 그대로 사용한다.
  if (collection === "users" || collection === "friendCodes") continue;
  const newPath = [collection, ...segments.map((segment) => uidMap.get(segment) ?? segment)].join("/");
  bound[newPath] = typeof value?.senderUid === "string"
    ? { ...value, senderUid: uidMap.get(value.senderUid) ?? value.senderUid }
    : value;
}
process.stdout.write(JSON.stringify(bound, null, 2) + "\n");
