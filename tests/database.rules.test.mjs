// tests/database.rules.test.mjs
import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { get, ref, serverTimestamp, set, update } from "firebase/database";

const PROJECT_ID = "hambaksanta-merrycri";
const OWNER_UID = "owner";
const WRITER_UID = "writer";
const STRANGER_UID = "stranger";

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: {
      rules: readFileSync("database.rules.json", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearDatabase();
  await seedBaseData(Date.now() + 60_000);
});

after(async () => {
  await testEnv.cleanup();
});

test("주인은 openAt 전 편지를 읽을 수 없다", async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();
  await assertFails(get(ref(ownerDb, `letters/${OWNER_UID}`)));
});

test("주인은 openAt 이후 편지를 읽을 수 있다", async () => {
  await setOpenAt(Date.now() - 1_000);
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();
  const snapshot = await assertSucceeds(get(ref(ownerDb, `letters/${OWNER_UID}`)));
  assert.equal(snapshot.child("letter-01").child("content").val(), "메리 크리스마스!");
});

test("작성자는 openAt 이후에도 주인의 편지를 읽을 수 없다", async () => {
  await setOpenAt(Date.now() - 1_000);
  const writerDb = testEnv.authenticatedContext(WRITER_UID).database();
  await assertFails(get(ref(writerDb, `letters/${OWNER_UID}`)));
});

test("6자리 친구 코드는 본인만 선점하고 중복 사용할 수 없다", async () => {
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();
  const writerDb = testEnv.authenticatedContext(WRITER_UID).database();
  const codePath = "friendCodes/ABC123";

  await assertSucceeds(set(ref(ownerDb, codePath), OWNER_UID));
  await assertFails(set(ref(writerDb, codePath), WRITER_UID));
  await assertFails(set(ref(writerDb, "friendCodes/WRONG1"), OWNER_UID));
  await assertSucceeds(set(ref(ownerDb, codePath), null));
});

test("장식과 편지는 한 번에 저장되고 같은 발신자는 두 번 쓸 수 없다", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.database();
    await set(ref(adminDb, `ornaments/${OWNER_UID}/${WRITER_UID}`), null);
    await set(ref(adminDb, `letters/${OWNER_UID}`), null);
  });

  const writerDb = testEnv.authenticatedContext(WRITER_UID).database();
  await assertSucceeds(update(ref(writerDb), {
    [`ornaments/${OWNER_UID}/${WRITER_UID}`]: {
      type: "bauble",
      slot: 0,
      createdAt: serverTimestamp(),
    },
    [`letters/${OWNER_UID}/letter-new-01`]: {
      senderUid: WRITER_UID,
      senderNickname: "눈송이",
      content: "첫 편지",
      ornamentType: "bauble",
      createdAt: serverTimestamp(),
      opened: false,
    },
  }));

  await assertFails(set(ref(writerDb, `letters/${OWNER_UID}/letter-new-02`), {
    senderUid: WRITER_UID,
    senderNickname: "눈송이",
    content: "두 번째 편지",
    ornamentType: "star",
    createdAt: serverTimestamp(),
    opened: false,
  }));
});

test("공개일 이후 수신자만 opened를 false에서 true로 바꿀 수 있다", async () => {
  await setOpenAt(Date.now() - 1_000);
  const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();
  const writerDb = testEnv.authenticatedContext(WRITER_UID).database();
  const openedPath = `letters/${OWNER_UID}/letter-01/opened`;

  await assertFails(set(ref(writerDb, openedPath), true));
  await assertSucceeds(set(ref(ownerDb, openedPath), true));
  await assertFails(set(ref(ownerDb, openedPath), false));
});

test("편지 작성자만 더 높은 최고점을 저장할 수 있다", async () => {
  const writerDb = testEnv.authenticatedContext(WRITER_UID).database();
  const strangerDb = testEnv.authenticatedContext(STRANGER_UID).database();
  const scorePath = `scores/${OWNER_UID}/${WRITER_UID}`;

  await assertSucceeds(set(ref(writerDb, scorePath), {
    nickname: "눈송이",
    best: 100,
    updatedAt: serverTimestamp(),
  }));
  await assertFails(set(ref(writerDb, scorePath), {
    nickname: "눈송이",
    best: 90,
    updatedAt: serverTimestamp(),
  }));
  await assertFails(set(ref(strangerDb, `scores/${OWNER_UID}/${STRANGER_UID}`), {
    nickname: "모르는 사람",
    best: 200,
    updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(set(ref(writerDb, scorePath), {
    nickname: "눈송이",
    best: 150,
    updatedAt: serverTimestamp(),
  }));
});

async function seedBaseData(openAt) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await set(ref(context.database()), {
      users: {
        [OWNER_UID]: {
          nickname: "트리 주인",
          friendCode: "OWNER1",
          createdAt: Date.now(),
        },
        [WRITER_UID]: {
          nickname: "눈송이",
          friendCode: "WRITE1",
          createdAt: Date.now(),
        },
        [STRANGER_UID]: {
          nickname: "모르는 사람",
          friendCode: "STRAN1",
          createdAt: Date.now(),
        },
      },
      friends: {
        [OWNER_UID]: { [WRITER_UID]: Date.now() },
        [WRITER_UID]: { [OWNER_UID]: Date.now() },
      },
      ornaments: {
        [OWNER_UID]: {
          [WRITER_UID]: {
            type: "bauble",
            slot: 0,
            createdAt: Date.now(),
          },
        },
      },
      letters: {
        [OWNER_UID]: {
          "letter-01": {
            senderUid: WRITER_UID,
            senderNickname: "눈송이",
            content: "메리 크리스마스!",
            ornamentType: "bauble",
            createdAt: Date.now(),
            opened: false,
          },
        },
      },
      config: { openAt },
    });
  });
}

async function setOpenAt(openAt) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await set(ref(context.database(), "config/openAt"), openAt);
  });
}
