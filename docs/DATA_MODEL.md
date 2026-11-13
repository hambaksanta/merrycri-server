# 함박산타 - 프로젝트 메리크리 · Firebase 데이터 구조

- 기준: [AI 공통 프롬프트](https://github.com/hambaksanta/merrycri-client/blob/main/docs/AI_PROMPT.md)의 'Realtime Database 구조'
- 클라이언트 코드: [`data/model/Models.kt`](https://github.com/hambaksanta/merrycri-client/blob/main/app/src/main/java/com/hambaksanta/merrycri/data/model/Models.kt) (경로 상수는 `DbPath`)
- 보안 규칙: [`database.rules.json`](../database.rules.json)
- 바꾸려면 세 명 합의 → 이 문서, 규칙, `Models.kt`를 같이 고친다 (두 저장소 PR).

서버는 Firebase Realtime Database + 익명 로그인만 쓴다. **Cloud Functions 없음, 무료(Spark) 요금제.**
시간은 전부 서버 시간(ms). 쓸 때는 `ServerValue.TIMESTAMP`, 읽을 때는 `.info/serverTimeOffset`으로 보정한다.

```json
{
  "users": {
    "{uid}": {
      "nick": "수민",
      "outfit": {
        "hat": "beanie", "scarf": "stripe", "gloves": "mitten", "top": "sweater", "boots": "fur",
        "colors": { "hat": "red", "scarf": "green", "gloves": "white", "top": "red", "boots": "brown" }
      }
    }
  },
  "rooms": {
    "{spaceId}": {
      "presence": {
        "{uid}": {
          "nick": "수민", "outfit": { },
          "x": 0.42, "y": 0.71, "tx": 0.60, "ty": 0.80, "moveStartAt": 0,
          "holding": "marshmallow", "bites": 1, "roasted": true,
          "updatedAt": 0
        }
      }
    }
  },
  "events": { "snowstorm": { "by": "{uid}", "at": 0 } },
  "tree": { "ornaments": { "{id}": { "type": "ball_red", "x": 0.55, "y": 0.38, "uid": "...", "nick": "수민", "createdAt": 0 } } },
  "gifts": {
    "{giftId}": {
      "fromUid": "...", "fromNick": "수민", "to": "{uid 또는 anyone}",
      "letter": "메리 크리스마스!", "paper": "snow", "box": "red", "ribbon": "gold",
      "createdAt": 0, "openedBy": null, "openedAt": null
    }
  },
  "demo": { "gifts": { "{giftId}": { "...": "gifts 와 같은 구조" } } },
  "lounge": { "fire": { "level": 2, "lastFedAt": 0 } },
  "snowmen": { "{id}": { "uid": "...", "nick": "수민", "x": 0.2, "y": 0.8, "parts": { }, "createdAt": 0 } }
}
```

## 노드별 규칙

| 노드 | 언제 쓰나 | 지켜야 할 것 |
| --- | --- | --- |
| `users/{uid}` | 옷장에서 '마을로 가기' | nick 1~10자. 내 것만 쓰기 |
| `rooms/{spaceId}/presence/{uid}` | 공간 입장·나가기, 걷기 시작, holding 바뀔 때 | spaceId는 `wardrobe` `plaza` `tree` `post` `lounge` `snowman` `snowball` `sled`만. 입장 직후 `onDisconnect().removeValue()` 필수. 같은 공간만 구독 |
| ㄴ 위치 | 바닥 탭 = 걷기 시작 때 한 번 | 출발점 `x,y`·목적지 `tx,ty`·출발 시각 `moveStartAt`만 보낸다. 지금 위치는 각 폰이 계산 (클라이언트 `core/scene/Movement.kt`, 속도 화면 30%/초). 걷는 동안 연속 전송 금지. 좌표는 0~1 |
| ㄴ `holding` | 간식 집기·내려놓기 | `null` `cocoa` `latte` `americano` `gingerbread` `chocolate` `marshmallow`. `bites` = 먹은 입 수, `roasted` = 마시멜로 구웠는지 |
| `events/snowstorm` | 흔들기 감지(디버그 버튼) | `by` = 내 uid, `at` = 서버 시간. `at`이 10초 넘게 지난 이벤트는 무시 |
| `tree/ornaments/{id}` | 오너먼트 달 때 push | 추가만 가능, 수정·삭제 불가. `createdAt` = 서버 시간 |
| `gifts/{giftId}` | 포장하기 때 push, 열 때 `openedBy`·`openedAt` | `to` = 받는 uid 또는 `anyone`. 열기는 **KST 12/25 00:00 ~ 12/31 23:59 서버 시간**에만, 받는 사람(또는 `anyone`이면 아무나)만, 아직 안 열린 것만 (규칙이 막음). `anyone` 선물은 `runTransaction`으로 먼저 연 한 명만. 편지 500자 |
| `demo/gifts/{giftId}` | 채점·시연용 | gifts와 같은 구조. 잠금 없이 언제든 열람. 설정의 데모 모드에서 이 경로를 읽는다 |
| `lounge/fire` | 장작 넣을 때 `runTransaction` | `level` 0~3. 줄어드는 것은 DB에 쓰지 않고 계산: **현재 단계 = level − (지금 − lastFedAt) ÷ 30초, 최소 0** (`FireState.currentLevel`) |
| `snowmen/{id}` | 세우기 때 push | **1인 최대 3개** (만들기 전에 `orderByChild("uid")`로 내 개수를 세서 막는다). 내 것만 수정·삭제 |

## 아직 정하지 않은 것

- `snowmen/{id}/parts` 안의 키: A가 정해서 합의 (예시 데이터는 `hat` `scarf` `nose`로 넣어 둠)
- 눈싸움 마당의 눈덩이 데이터: 공통 프롬프트에 없음. B가 설계해서 합의한 뒤 이 문서와 규칙에 추가 (지금은 규칙상 쓰기 불가)
- 오너먼트 `type`, 선물 `paper` `box` `ribbon` 값 목록: C가 정해서 여기에 적기

## 알아둘 점

- 편지 내용은 로그인한 사람이면 기술적으로 읽을 수 있다 (12/25 전 잠금은 앱 화면에서 처리). 열기(`openedBy`)만 규칙이 기간을 막는다.
- 값은 전부 소문자 id 문자열로 저장한다 (`beanie`, `cocoa`, `plaza`). id를 바꾸면 이미 저장된 데이터가 깨진다.
