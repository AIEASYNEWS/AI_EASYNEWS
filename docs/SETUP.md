# EasyNews 실행 및 연결

Node.js 24를 사용합니다. Firebase 에뮬레이터를 실행할 때만 Java 21 이상이 필요합니다. 프론트엔드는 React/TypeScript/Tailwind, API는 Express이며 Vercel Functions 또는 Firebase Cloud Functions에서 실행할 수 있습니다.

## 로컬 실행

```powershell
npm install
npm --prefix functions install
Copy-Item .env.example .env.local # 파일이 이미 있다면 덮어쓰지 마세요.
npm run dev:local
```

`.env.local`에 발급한 `MONOROUTER_API_KEY`와 키에서 허용한 `MONOROUTER_MODEL`을 입력합니다. 모델 이름은 발급 화면의 ID와 정확히 같아야 합니다. 키는 서버에서만 읽으며 브라우저 번들에 포함하지 않습니다. 환경변수 수정 후 API 서버를 다시 시작합니다.

`dev:local`은 Firebase Auth(9099), Firestore(8080), API(8787), Vite(5173)를 함께 실행합니다. Firebase Console 계정이나 결제 없이 로컬 인증과 저장을 테스트할 수 있습니다. Java가 PATH에 없으면 `JAVA_HOME`을 설정합니다. 프로젝트와 같은 상위 폴더의 IntelliJ 설치에 Java 21이 있으면 자동으로 찾습니다.

로컬 계정/이력은 실제 Firebase 프로젝트에 저장되지 않으며 에뮬레이터 종료 시 사라집니다. 테스트용 이메일/비밀번호를 사용하세요. 운영 빌드에서는 에뮬레이터를 사용하지 않습니다.

## 실제 Firebase 프로젝트

1. 사용할 Firebase 프로젝트 ID를 정하고 웹 앱을 등록합니다.
2. Authentication에서 **이메일/비밀번호**와 **익명** 로그인을 활성화하고 사용할 도메인을 승인합니다.
3. Cloud Firestore 데이터베이스를 생성합니다. 현재 코드는 기본 `(default)` 데이터베이스의 Firebase/Native SDK를 사용합니다. 기존 프로젝트의 데이터베이스 종류와 위치를 먼저 확인하세요.
4. 웹 앱 설정의 4개 `VITE_FIREBASE_*` 값을 `.env.local`과 배포 환경변수에 설정합니다. `VITE_USE_FIREBASE_EMULATORS=false`로 변경합니다.
5. 로컬에서 운영 API를 실행하려면 프로젝트 ID와 **Application Default Credentials**를 설정하거나 배포된 API 주소를 `VITE_API_BASE_URL`에 넣습니다. 서비스 계정 비밀 키를 프론트엔드에 넣지 마세요.
6. `firestore.rules`를 검토한 뒤 배포합니다. 클라이언트 쓰기는 차단하고, API가 사용자 토큰과 입력 스키마를 검증한 뒤 개인 경로에 저장합니다. 사용량/권한은 클라이언트에서 수정할 수 없습니다.

### 로컬 API에서 실제 Firebase 사용하기

현재 연결 대상은 `ai-easynews` 프로젝트의 Standard `(default)` 데이터베이스이며 위치는 `asia-northeast3`입니다. Authentication은 이메일/비밀번호와 익명 로그인을 사용합니다.

서비스 계정 비공개 키를 발급한 경우 내려받은 원본 JSON을 다음 명령으로 가져올 수 있습니다. 키 내용은 출력하지 않고, 프로젝트 ID와 키 형식을 확인한 뒤 Git에서 제외되는 `.firebase-admin.local`에 저장합니다. 다운로드한 Firebase 기본 파일명도 Git에서 제외합니다.

```powershell
node scripts/import-firebase-key.mjs "다운로드한-키-파일.json" --activate
npm run dev
```

이 명령은 `.env.local`에 `GOOGLE_APPLICATION_CREDENTIALS` 경로를 설정하고 에뮬레이터 사용을 끕니다. 이전에 실행한 `dev:local` 서버를 종료하고 `npm run dev`로 시작해야 실제 프로젝트에 연결됩니다. 비공개 키 파일을 프론트엔드, 채팅 또는 공개 저장소에 넣지 마세요.

이 프로젝트를 콘솔의 프로덕션 모드로 생성하면 최초 클라이언트 규칙은 모두 거부입니다. 현재 앱의 데이터 읽기/쓰기는 인증을 검증하는 서버 API에서 수행하므로, 클라이언트를 위해 데이터를 공개할 필요가 없습니다.

## Vercel 배포

운영 주소는 `https://ai-easynews.vercel.app`입니다. `vercel.json`이 프론트엔드 빌드와 `api/index.js`의 Express API를 함께 배포하며, 브라우저는 같은 도메인의 `/api/**`를 호출합니다. `VITE_API_BASE_URL`은 비워 둡니다.

Vercel 프로젝트의 환경변수를 설정한 뒤 새로 배포해야 합니다.

| 환경변수 | 설정 |
| --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Firebase 웹 앱의 공개 설정 |
| `VITE_USE_FIREBASE_EMULATORS` | `false` |
| `FIREBASE_PROJECT_ID` | `ai-easynews` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 서비스 계정 원본 JSON 전체, Production의 Secret으로만 저장 |
| `MONOROUTER_API_KEY` | Production의 Secret으로만 저장 |
| `MONOROUTER_MODEL`, `MONOROUTER_BASE_URL` | 사용할 모델 ID와 MonoRouter 주소 |
| `NAVER_API_HUB_CLIENT_ID`, `NAVER_API_HUB_CLIENT_SECRET` | Firebase 예약 수집 함수에 설정하는 서버 비밀 값 |
| `NEWS_RSS_FEEDS` | 사용할 RSS 주소 목록 |
| `NODE_OPTIONS` | 프로젝트 설정에 `--experimental-require-module` 지정 |
| `ALLOWED_ORIGINS` | 운영 프론트엔드 Origin 목록 |

`NODE_OPTIONS`는 Firebase Admin의 `jwks-rsa`가 ESM 방식의 `jose`를 불러오는 데 필요합니다. 로컬 Node.js와 달리 Vercel에서는 이 기능이 기본적으로 꺼져 있으므로 프로젝트 환경변수에도 지정합니다.

배포 서버는 서비스 계정 JSON을 환경변수에서 읽어 메모리에서 초기화합니다. 로컬 전용 `GOOGLE_APPLICATION_CREDENTIALS` 파일 경로는 Vercel에 설정하지 않습니다. 비공개 키는 소스 업로드와 브라우저 번들에서 제외하며, 인증 설정이 빠진 서버는 데이터 저장 요청을 거절합니다.

키는 명시적으로 승인된 환경에만 저장합니다. 키 설정과 재배포가 끝나면 `/api/health`, `/api/news`와 실제 로그인·프로필 저장·기사 변환을 확인합니다.

## Firebase Cloud Functions 배포 (선택)

Vercel API 대신 Firebase Cloud Functions를 사용할 경우에는 결제가 연결된 Firebase 프로젝트가 필요할 수 있습니다. 결제 활성화는 별도로 결정합니다.

```powershell
npx -y firebase-tools@latest login
npx -y firebase-tools@latest functions:secrets:set MONOROUTER_API_KEY --project YOUR_PROJECT_ID
# functions/.env.example을 functions/.env.YOUR_PROJECT_ID로 복사하고 모델/허용 Origin 설정
npm run build
npx -y firebase-tools@latest deploy --only functions,firestore:rules,hosting --project YOUR_PROJECT_ID
```

Firebase Hosting은 `/api/**`를 함수에 연결합니다. 기존 Vercel 정적 사이트를 유지하면 `VITE_API_BASE_URL`에 함수 URL(예: `https://asia-northeast3-PROJECT.cloudfunctions.net/api`)을 지정하고 다시 빌드합니다. 이 경우 API 클라이언트가 `/api/...`를 추가하므로 함수의 공개 URL 뒤 경로가 `/api/...`로 이어집니다. `ALLOWED_ORIGINS`에는 프론트엔드 Origin을 정확히 등록하세요.

## 뉴스와 AI

- 매시 정각과 30분(한국 시간)에 `notifyInterestNews`가 NAVER API HUB에서 7개 주제별 최신순 기사 최대 35건씩 조회하고 Firestore에 저장합니다. 수집 함수의 Firebase Secret Manager에 `NAVER_API_HUB_CLIENT_ID`, `NAVER_API_HUB_CLIENT_SECRET`을 설정합니다.
- 홈과 탐색은 저장된 기사 중 발행일 기준 최신 480건을 읽습니다. 검색은 제목·발췌문·언론사에 적용하며, 주제 필터와 24건 단위 페이지를 지원합니다. 같은 서버에서는 DB 조회 결과를 최대 5분간 재사용합니다. 홈은 이 목록에서 선택한 관심 주제의 기사를 표시합니다. 첫 수집 전에는 목록이 비어 있습니다.
- `npm run dev:local`은 에뮬레이터용 API 시작 시 한 번 수집하고 이후 30분마다 수집합니다. 에뮬레이터가 아닌 로컬 API에서 수집기도 실행하려면 `.env.local`에 `LOCAL_NEWS_COLLECTOR=true`를 지정합니다. 운영 예약 함수가 같은 DB를 갱신한다면 로컬 API는 기본 설정으로 실행합니다. 기기 푸시는 배포된 예약 함수에서 발송합니다.
- 기사 비교에 사용하는 추가 RSS 공급원은 `NEWS_RSS_FEEDS`에 설정합니다.
- 로컬 개발 환경에 HTTPS 프록시가 설정되어 있으면 검증한 주요 언론사의 정확한 HTTPS 주소에만 프록시를 사용합니다. 모든 리다이렉트에서 공개 주소를 다시 확인하며, 다른 주소는 DNS를 고정한 연결을 유지합니다.
- 공개 URL의 HTML을 Readability로 추출합니다. 로그인/유료/스크립트 전용 기사는 읽지 못할 수 있으며 실패로 안내합니다. 원문 출처 링크를 유지합니다. 내부 IP, 잘못된 URL, 내부 주소로의 리다이렉트, 과도한 응답 크기를 차단합니다.
- 쉬운말 본문/요약은 실제 AI 응답을 검증한 뒤 저장합니다. 비교는 실제로 본문을 읽은 관련 기사만 대상으로 하며, 없거나 실패하면 이를 표시합니다. 예시 기사나 미리 정한 답변으로 대체하지 않습니다.
- 선택 문장 질문은 원문/쉬운말 모두 지원합니다. 서버가 기사에 있는 문장인지 확인하고 계정당 일 30회로 제한합니다.
- 변환은 계정당 일 3회(한국 시간), 동시 요청을 포함해 서버 트랜잭션으로 제한합니다. 실패/취소 시 예약을 반환합니다. 익명 계정을 새로 만드는 방식의 우회까지 방지하려면 운영 전 App Check와 분산 요청 제한을 추가해야 합니다.
- 마이페이지에서 알림을 켜고 끌 수 있습니다. 회원의 관심 주제, 알림 설정, 기사별 읽음 상태는 Firebase UID별로 저장합니다. 새 아이디는 Firebase 이메일 로그인에 전용 내부 주소로 연결하며 기존 이메일 계정도 그대로 로그인할 수 있습니다. 이메일 재설정은 실제 이메일로 가입한 계정에만 제공합니다.

## 휴대폰 알림

Firebase 웹 앱의 발신자 ID와 Cloud Messaging의 웹 푸시 인증서 공개 키를 각각 `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_VAPID_KEY`에 설정하고 다시 빌드합니다. 알림 설정에서 **이 기기에서도 알림 받기**를 눌러 브라우저 권한을 허용하면 FCM 토큰이 서버에 등록됩니다. HTTPS 또는 localhost와 웹 푸시를 지원하는 브라우저가 필요합니다.

기사 수집과 DB 저장이 끝나면 같은 예약 함수가 알림을 켠 기기에 저장된 관심 주제와 기사 주제를 비교합니다. 웹/API를 Vercel에서 운영해도 Firebase 예약 함수 배포가 필요합니다.

수집한 기사 메타데이터는 `newsArticles/{newsKey}`에 저장합니다. 문서 ID는 추적 파라미터와 프래그먼트를 제거한 URL의 SHA-256 해시 앞 32자리입니다. 원문 주소와 기사 식별용 쿼리는 보존합니다. 같은 기사에 변경이 있으면 기존 문서를 갱신합니다.

알림은 등록 기기별로 30분에 최대 한 건입니다. 최근 24시간 안에 발행된 기사 중 기기 등록과 알림 설정 변경 이후의 관심 주제 기사를 고릅니다. `users/{uid}/pushDeliveries`에 기기와 기사 키를 트랜잭션으로 먼저 기록합니다. 같은 언론사에서 제목과 20자 이상의 발췌문이 모두 같은 경우에는 다른 URL도 중복으로 처리합니다. FCM 접수 성공은 `accepted`, 접수 결과가 불확실하면 `unconfirmed`를 기록합니다. 응답이 불확실한 건은 중복 방지를 위해 자동 재발송하지 않습니다. FCM이 호출량 초과로 명시적으로 거절하면 예약을 풀고 다음 주기에 재시도할 수 있습니다.

## 구독 상품

`.env.local`에서 `ENABLE_DEMO_SUBSCRIPTIONS=true`로 설정하고 서버를 다시 시작하면 로그인한 회원은 구독 버튼으로 테스트용 무제한 변환을 활성화할 수 있습니다. 결제 연동 시 테스트 설정을 끄면 RevenueCat으로 구독 권한을 확인합니다.

상품 미등록 상태에서는 구독 안내에 요금 미정을 표시합니다. 웹 결제는 RevenueCat의 **identified user**용 Web Purchase Link를 사용하도록 구현했습니다. 상품 등록 후 서버에 `REVENUECAT_API_KEY`(v1 고객 조회용), `REVENUECAT_ENTITLEMENT_ID`, `REVENUECAT_PURCHASE_URL`, `SUBSCRIPTION_MONTHLY_KRW`를 설정합니다. 가격 표시는 등록한 원화 월간 상품과 같게 설정하세요. 결제 완료 후 돌아올 주소는 웹 앱의 `/#/home`입니다.

서버는 Firebase UID로 RevenueCat 권한을 조회해 활성 기간과 유예 기간을 확인합니다. 활성 구독자에게만 변환 한도를 해제하고, 구독 관리는 결제 서비스가 돌려준 관리 URL로 연결합니다. 구독 상품과 결제사가 준비되면 테스트 상품으로 결제·갱신·만료를 확인하세요.

## 검증

```powershell
npm run build
npm run lint
npm test
# npm run emulators를 실행한 상태에서:
npm run test:rules
npm run test:integration
```

AI 단위 테스트는 응답 형식·출처 제한·오류 처리를 검증하는 테스트 대역을 사용합니다. 실제 MonoRouter 연결 확인에는 키와 모델을 설정한 뒤 기사 변환과 문장 질문을 실행해야 합니다. 실제 Firebase 프로젝트의 로그인, 권한, 배포는 프로젝트 설정 후 별도로 확인해야 합니다.

## v2 맞춤 뉴스·소식이 동작 방식

- 뉴스 수집(`collectNews`) 직후 같은 MonoRouter 모델로 새 기사에 매칭 태그(분야·대상 연령·직종·쉬운말 필요 여부·한 줄 이유)를 붙여 `newsArticles`에 저장합니다. 키가 없으면 태그 없이 규칙 점수만 계산합니다. 태그가 없는 최근 기사는 홈(`/api/feed`)을 열 때 일부씩 추가로 태깅합니다.
- 운영 수집은 GitHub Actions(`.github/workflows/collect-news.yml`)가 30분마다 Vercel의 `POST /api/cron/collect`를 호출해 실행합니다. Firebase 예약 함수는 Blaze 요금제가 필요하므로 쓰지 않습니다.
  1. Vercel 환경변수에 `CRON_SECRET`(충분히 긴 임의 문자열)을 추가하고 다시 배포합니다. `NAVER_API_HUB_CLIENT_ID`, `NAVER_API_HUB_CLIENT_SECRET`, `MONOROUTER_API_KEY`도 Vercel에 있어야 합니다.
  2. GitHub 저장소 Settings → Secrets and variables → Actions에 같은 값의 `CRON_SECRET` 시크릿을 추가합니다. 운영 주소가 다르면 `APP_URL` 변수(예: `https://ai-easynews.vercel.app`)도 추가합니다.
  3. 예약 실행은 기본 브랜치(main)에 워크플로 파일이 있어야 동작합니다. 병합 후 Actions 탭에서 `Collect news`를 수동 실행(Run workflow)해 응답 `{"stored":…,"tagged":…}`를 확인합니다.
  4. 한 번 호출은 Vercel 시간 제한(300초) 안에서 최대 90건까지 태깅하고, 남은 기사는 다음 실행에서 이어서 태깅합니다. 푸시 알림 발송은 이 작업에 포함되지 않습니다.
- 직접 입력한 관심 키워드는 저장할 때 LLM이 뜻을 풀어 관련 표현(동의어·하위 개념·관련 직무·제도 이름)을 만들어 `keywordExpansions`에 키워드별로 한 번만 저장하고, 같은 키워드를 쓰는 모든 사용자가 함께 씁니다. 기사에 키워드가 그대로 있으면 가장 높게, 관련 표현만 있으면 조금 낮게 점수를 줍니다. 뜻을 알 수 없는 키워드는 관련 표현을 만들지 않습니다.
- 매칭률은 관심 분야 50 + 내 정보(나이·직종) 30 + 시의성 20점이며, 서버가 규칙으로 계산합니다(성별은 점수에 쓰지 않음). 홈에는 최근 24시간 기사 중 60% 이상만 보여 줍니다. '잘 맞아요/관련 없어요' 피드백은 해당 기사의 분야·키워드 가중치(±3단계, 점수 최대 ±8점)로 반영됩니다.
- 기사 상세의 '필요한 이유'는 처음 열 때 LLM이 만들고 프로필이 바뀌기 전까지 캐시합니다.
- 쉬운말 변환(`/api/convert`)은 배경·낱말 풀이와 쉬운말 본문을 두 번의 병렬 호출로 만들고 진행 단계(읽기 → 배경 → 쉬운말)를 스트리밍합니다.
- 소식이 대화방은 기사별로 하나이며(`/api/chats/:newsKey`), 첫 메시지를 보낼 때 만들어지고 방마다 최근 100개 메시지를 보관합니다. 대화 기록 화면에서 방을 삭제할 수 있습니다. 질문은 하루 30회로 제한됩니다.

### 사는 지역 · 대표 이미지 · 비슷한 기사 (v2 UI)

- 가입 1/3단계에서 사는 지역(시·군·구)을 필수로 고릅니다. 목록은 `functions/src/regions.json`(웹과 서버가 함께 사용)이며, 매칭 점수의 '내 정보 30점'은 나이 10 + 직종 10 + 지역 10입니다. 같은 시·군·구 기사 10점, 같은 시·도 8점, 전국 기사 5점, 다른 지역 기사 1점입니다.
- 사용자가 고른 지역은 `regionsInUse`에 기록되고, 30분 수집 때 최근 사용된 지역 30곳을 네이버 뉴스에서 지역당 20건씩 추가로 검색합니다. LLM 태깅이 기사마다 관련 지역을 붙입니다. '현재 위치로 찾기'는 주소 변환 API가 필요해 이번 버전에서는 제외했습니다.
- 네이버 뉴스 검색 결과에는 이미지가 없어서, 수집할 때 새 기사 최대 60건의 원문 페이지에서 대표 이미지(og:image)를 읽어 저장합니다. 기사 상세를 처음 열 때도 이미지가 없으면 채워 둡니다.
- '비슷한 기사도 있어요'는 상세를 처음 열 때 그 기사의 LLM 키워드로 네이버 뉴스를 관련도순 검색해, 다른 언론사의 7일 이내 같은 주제 기사 최대 3건을 고릅니다. 결과는 기사 문서에 6시간 저장해 모든 사용자가 함께 씁니다.
