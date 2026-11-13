# 함박산타 - 프로젝트 메리크리 | 서버

**팀 함박산타** · 모바일 프로그래밍 3인 팀 프로젝트 · 담당 B

메리크리의 서버 쪽 설정을 모아두는 저장소다. 메리크리는 직접 만든 서버 대신 **Firebase Realtime Database + 익명 로그인**을 서버로 쓴다.
**Cloud Functions 없음, 무료(Spark) 요금제.**

| 저장소 | 내용 |
| --- | --- |
| [merrycri-client](https://github.com/hambaksanta/merrycri-client) | 안드로이드 앱 (Kotlin + Jetpack Compose) |
| **merrycri-server** (여기) | DB 보안 규칙, 데이터 구조 문서, 예시 데이터 |

- 데이터 구조 (세 명 합의 필수): [docs/DATA_MODEL.md](docs/DATA_MODEL.md)
- 협업 규칙 (브랜치·커밋·PR): 클라이언트 저장소의 [CONTRIBUTING.md](https://github.com/hambaksanta/merrycri-client/blob/main/CONTRIBUTING.md)를 똑같이 따른다

## 폴더

```
merrycri-server/
├── database.rules.json   // Realtime Database 보안 규칙
├── firebase.json         // Firebase CLI 설정 (규칙, 에뮬레이터)
├── .firebaserc           // 연결할 Firebase 프로젝트 ID (처음 한 번 바꾸기)
├── docs/DATA_MODEL.md    // 데이터 구조
└── seed/seed.json        // 채점·시연용 예시 데이터 (오너먼트, 눈사람, 선물, 데모 선물, 불)
```

## 1. Firebase 프로젝트 만들기 (처음 한 번)

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 만들기 (애널리틱스는 꺼도 됨). 요금제는 기본 **Spark(무료)** 그대로 둔다.
2. **Build → Authentication → 시작하기 → 로그인 방법 → 익명** 사용 설정
3. **Build → Realtime Database → 데이터베이스 만들기** ('잠금 모드'로 시작)
4. 프로젝트 설정 → **Android 앱 추가** → 패키지 이름 **`com.hambaksanta.merrycri`** → `google-services.json`을 받아 클라이언트 저장소 `app/`에 PR로 올린다
5. `.firebaserc`의 `여기에-파이어베이스-프로젝트-ID`를 실제 프로젝트 ID로 바꿔서 PR

## 2. 규칙 배포와 예시 데이터

컴퓨터에 Node.js 20 이상을 설치한 뒤:

```bash
npm install -g firebase-tools   # 처음 한 번
firebase login                  # 처음 한 번

firebase deploy --only database                # 보안 규칙 배포
firebase database:update / seed/seed.json      # 예시 데이터 넣기
```

- `seed.json`은 `tree/ornaments/seed-orn-01`처럼 **경로를 키로** 적어 두어서, 넣어도 사람들이 만든 데이터는 지워지지 않는다 (같은 키만 덮어씀).
- CLI가 어려우면 콘솔에서 해도 된다. 규칙은 **Realtime Database → 규칙** 탭에 `database.rules.json` 내용을 붙여넣고 게시한다.
- 콘솔의 'JSON 가져오기'는 **선택한 위치의 데이터를 통째로 바꾸므로** 쓰지 않는다.
- '테스트 모드'로 DB를 만들면 규칙에 만료일(약 30일)이 들어가니, 반드시 이 저장소의 규칙으로 바꿔 둔다.
- 규칙이 바뀌는 PR이 Merge되면 B가 바로 `firebase deploy --only database`를 한다.

## 3. 로컬 에뮬레이터 (선택)

실제 DB를 건드리지 않고 규칙을 시험할 때:

```bash
firebase emulators:start      # 인증·DB 에뮬레이터, 브라우저에서 http://localhost:4000
```

## 4. 데이터 구조를 바꿀 때

1. 이슈로 제안하고 세 명 합의 (타입 `FEAT` 또는 `CHORE`)
2. 이 저장소: `docs/DATA_MODEL.md` + `database.rules.json` 수정 → PR
3. 클라이언트 저장소: `data/model/Models.kt` 수정 → PR (서로 PR 링크 걸기)
4. 두 PR을 같이 Merge하고 규칙 다시 배포

## 5. Git 규칙

클라이언트와 같다. `main`에 직접 push 금지, 모든 변경은 PR + 1명 승인 → Squash and merge.
브랜치 예: `chore/4-rules-snowball`, 커밋·PR 제목 예: `CHORE: [B] 눈덩이 경로 규칙 추가`
