# 함박산타 - 프로젝트 메리크리 · v2 Firebase 데이터 구조

- 기준: 클라이언트 저장소 `docs/AI_PROMPT.md`의 v2 Realtime Database 구조
- 보안 규칙: [`database.rules.json`](../database.rules.json)
- 예시 데이터: [`seed/seed.json`](../seed/seed.json)
- 클라이언트 모델을 바꿀 때는 이 문서와 `data/model/`을 세 명이 합의한 뒤 함께 수정한다.

서버는 Firebase Authentication의 익명 로그인과 Realtime Database만 사용한다. Cloud Functions와 FCM은 사용하지 않는다.
시간 값은 밀리초이며 쓰기는 `ServerValue.TIMESTAMP`, 읽기는 `.info/serverTimeOffset`으로 보정한다.

## 전체 구조

```json
{
  "users": {
    "{uid}": {
      "nickname": "눈송이",
      "friendCode": "MERRY1",
      "createdAt": 0
    }
  },
  "friendCodes": {
    "MERRY1": "{uid}"
  },
  "friends": {
    "{uid}": {
      "{friendUid}": 0
    }
  },
  "ornaments": {
    "{ownerUid}": {
      "{writerUid}": {
        "type": "bauble",
        "slot": 0,
        "createdAt": 0
      }
    }
  },
  "letters": {
    "{ownerUid}": {
      "{writerUid}": {
        "nickname": "눈송이",
        "text": "메리 크리스마스!",
        "createdAt": 0
      }
    }
  },
  "scores": {
    "{ownerUid}": {
      "{writerUid}": {
        "nickname": "눈송이",
        "best": 120,
        "updatedAt": 0
      }
    }
  },
  "config": {
    "openAt": 1798124400000
  }
}
```

`config/openAt`의 예시 값 `1798124400000`은 2026-12-25 00:00 KST다.

## 경로별 규칙

| 경로 | 용도 | 읽기 | 쓰기 |
| --- | --- | --- | --- |
| `users/{uid}` | 닉네임·친구 코드 | 로그인 사용자 | 본인만. `friendCode`, `createdAt`은 생성 후 변경 불가 |
| `friendCodes/{code}` | 6자리 코드로 uid 찾기 | 로그인 사용자 | 코드 주인만 최초 1회 |
| `friends/{uid}/{friendUid}` | 친구가 된 서버 시각 | 본인의 친구 목록만 | 두 사용자 중 한 명이 최초 1회 |
| `ornaments/{ownerUid}/{writerUid}` | 트리에 달린 장식 | 로그인 사용자 | 친구인 작성자 본인이 1회 |
| `letters/{ownerUid}/{writerUid}` | 비공개 편지 | 주인이며 `now >= config/openAt`일 때만 | 친구인 작성자 본인이 1회, 1~300자 |
| `scores/{ownerUid}/{writerUid}` | 해당 트리의 벽돌깨기 최고점 | 로그인 사용자 | 그 트리에 편지를 쓴 작성자만, 기존 최고점보다 높을 때 |
| `config/openAt` | 편지 공개 시각 | 로그인 사용자 | 앱에서는 쓰기 불가. 발표 시 Firebase 콘솔에서 변경 |

## 클라이언트 구현 약속

### 회원 생성과 친구 코드

1. 익명 로그인으로 `uid`를 얻는다.
2. 중복되지 않은 6자리 코드를 만든다.
3. `users/{uid}`를 먼저 저장한다.
4. `friendCodes/{code}`를 최초 1회 저장한다. 이미 존재하면 다른 코드를 생성한다.

### 친구 추가

코드로 `friendUid`를 찾은 뒤 다음 두 경로를 `updateChildren()`으로 한 번에 저장한다.

```text
friends/{uid}/{friendUid}: ServerValue.TIMESTAMP
friends/{friendUid}/{uid}: ServerValue.TIMESTAMP
```

### 장식과 편지

- 장식 타입: `bauble`, `star`, `cane`, `snow`, `gift`, `bell`
- 장식 슬롯: `0..14`
- 작성자 uid가 키이므로 같은 트리에 두 번째 장식이나 편지를 만들 수 없다.
- 받은 편지 수는 `ornaments/{ownerUid}`의 자식 개수다.
- 트리 단계 기준은 클라이언트 상수 한 곳에서 관리한다: `0`, `1~2`, `3~5`, `6~9`, `10+`.

### 편지 열람

- 주인 외 사용자는 날짜와 관계없이 편지 내용을 읽을 수 없다.
- 주인도 서버 시간 `now`가 `config/openAt`보다 빠르면 읽을 수 없다.
- 앱의 디버그 시연은 `config/openAt`을 Firebase 콘솔에서 현재보다 과거로 바꿔 확인한다.

### 점수

- `letters/{ownerUid}/{writerUid}`가 있는 작성자만 해당 트리 점수를 저장할 수 있다.
- `best`가 기존 값보다 클 때만 갱신된다.
- 리더보드는 `scores/{ownerUid}`를 `orderByChild("best")`로 조회한다.

## 공개 함수 변경 시 주의

클라이언트 `MerryRepository`의 공개 함수와 `data/model/` 타입은 A·C가 함께 사용한다. 이름이나 반환형을 바꾸기 전에 팀에 변경점을 공유한다.
