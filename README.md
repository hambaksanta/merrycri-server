# 함박산타 - 프로젝트 메리크리 | 서버

**팀 함박산타** · 모바일 프로그래밍 3인 팀 프로젝트 · 담당 B

메리크리의 서버 쪽 전부를 모아두는 저장소다. 메리크리는 직접 만든 서버 대신 **Firebase**(익명 로그인 + Realtime Database)를 서버로 쓴다.

| 저장소 | 내용 |
| --- | --- |
| [merrycri-client](https://github.com/hambaksanta/merrycri-client) | 안드로이드 앱 (Kotlin + Jetpack Compose) |
| **merrycri-server** (여기) | DB 보안 규칙, 데이터 구조 문서, 서버 함수, 예시 데이터 |

## 폴더

```
merrycri-server/
├── database.rules.json   // Realtime Database 보안 규칙
├── firebase.json         // Firebase CLI 설정 (규칙, 함수, 에뮬레이터)
├── .firebaserc           // 연결할 Firebase 프로젝트 ID (처음 한 번 바꾸기)
├── docs/DATA_MODEL.md    // 데이터 구조 (세 명 합의 필수)
├── seed/seed.json        // 채점·시연용 예시 데이터 (오너먼트, 눈사람, 선물, 불)
└── functions/            // 서버 함수 (TypeScript, 선택)
    └── src/index.ts      // 10명 제한 + 오늘 방문자 기록, 눈덩이 정리
```

## 1. Firebase 프로젝트 만들기 (처음 한 번)

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 만들기 (애널리틱스는 꺼도 됨)
2. **Build → Authentication → 시작하기 → 로그인 방법 → 익명** 사용 설정
3. **Build → Realtime Database → 데이터베이스 만들기** ('잠금 모드'로 시작). 고른 위치를 `functions/src/index.ts`의 `REGION`에 똑같이 적는다.
4. 프로젝트 설정 → **Android 앱 추가** → 패키지 이름 **`com.hambaksanta.merrycri`** → `google-services.json`을 받아 클라이언트 저장소 `app/` 에 커밋
5. `.firebaserc`의 `여기에-파이어베이스-프로젝트-ID`를 실제 프로젝트 ID로 바꿔서 커밋

## 2. 규칙 배포와 예시 데이터

컴퓨터에 Node.js 20 이상을 설치한 뒤:

```bash
npm install -g firebase-tools   # 처음 한 번
firebase login                  # 처음 한 번

firebase deploy --only database                    # 보안 규칙 배포
firebase database:update / seed/seed.json          # 예시 데이터 넣기 (기존 데이터는 지우지 않고 합침)
```

CLI가 어려우면 콘솔에서 해도 된다. 규칙은 **Realtime Database → 규칙** 탭에 `database.rules.json` 내용을 붙여넣고 게시한다.
콘솔의 'JSON 가져오기'는 **선택한 위치의 데이터를 통째로 바꾸므로** 루트에서 쓰지 않는다.

'테스트 모드'로 DB를 만들면 규칙에 만료일(약 30일)이 들어가니, 반드시 이 저장소의 규칙으로 바꿔 둔다.

## 3. 서버 함수 (선택)

| 함수 | 하는 일 |
| --- | --- |
| `onPresenceCreated` | 마을에 처음 들어오면 오늘 방문자 기록(`stats/visitors/날짜`), 11번째부터는 입장을 막고 `full/{uid}` 표시 |
| `cleanSnowballs` | 10분마다 1분 넘은 눈싸움 기록 정리 |

- **배포는 Blaze(종량제) 요금제에서만 된다.** 무료 요금제로 진행할 거면 배포하지 않는다. 앱은 함수 없이도 동작해야 한다.
- 로컬 시험은 요금제와 상관없이 된다:

```bash
cd functions
npm install
npm run serve        # 에뮬레이터: 인증·DB·함수, 브라우저에서 http://localhost:4000
```

- 배포: `cd functions && npm run deploy`

## 4. 데이터 구조를 바꿀 때

1. 단톡에서 세 명 합의
2. 이 저장소의 `docs/DATA_MODEL.md`와 `database.rules.json` 수정 → PR
3. 클라이언트 저장소의 `data/model/Models.kt` 수정 → PR
4. 두 PR을 같이 Merge하고 규칙 다시 배포

## Git 규칙

클라이언트와 같다. 기본 브랜치는 `main`, 직접 push 금지, 작업은 `feat/b-server` 브랜치에서 하고 PR로 합친다.
