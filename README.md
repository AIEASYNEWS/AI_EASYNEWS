# AI_EASYNEWS

React + TypeScript + Vite + Tailwind CSS로 구현한 쉬운말 뉴스의 온보딩·홈 UI입니다.

## 실행

```sh
npm install
npm run dev
```

```sh
npm run build
npm run lint
```

## 화면

| 주소 | 화면 |
| --- | --- |
| `/` 또는 `/#/home` | 비회원 홈 (S01) |
| `/#/home?viewer=member` | 회원 홈 미리보기 (S01) |
| `/#/home?viewer=subscriber` | 구독 회원 홈 미리보기 (S01) |
| `/#/onboarding` | 로그인·회원가입 안내 (S06) |
| `/#/onboarding/topics` | 관심 주제 선택 (S07) |
| `/#/onboarding/interests` | 관심 주제 설정 및 저장하지 않고 나가기 팝업 (S08) |
| `/#/articles/preview?id=interest-rate&viewer=member` | 기사 미리보기 (S04) |
| `/#/articles/read?id=interest-rate&viewer=member` | 쉬운말 기사·원문·요약·언론사 비교·문장 질문 (S03) |

- 피그마 와이어프레임의 390×844 기준 레이아웃, Noto Sans KR, 회색 색상과 원본 SVG 아이콘을 사용합니다.
- 스타일은 Tailwind 유틸리티로 작성합니다. `src/index.css`에는 기존 Tailwind import만 유지합니다.
- 로그인 방식이 정해지기 전이므로 로그인·회원가입 CTA는 회원 UI 미리보기와 관심 주제 선택으로 이어집니다. 실제 인증은 수행하지 않습니다. `viewer` 쿼리와 세션 저장값은 UI 상태 확인 용도이며 인증·구독 권한이 아닙니다.
- 주제 선택·추가·삭제, 선택 개수, 저장 및 변경사항 폐기 동작을 제공합니다.
- 저장한 주제는 현재 브라우저의 `localStorage`에 보관됩니다. 처음에는 아무 주제도 선택되지 않습니다.
- 온보딩의 선택 완료·나중에 하기·비회원 계속하기는 홈으로 이동합니다. 회원 홈의 하단 `마이`에서 관심 주제 설정으로 이동할 수 있습니다.
- API 요청은 아직 없습니다. `apis/onboarding.ts`, `apis/news.ts`에는 향후 서버 연동용 타입 계약만 정의했습니다.
- `mocks`의 기사·비교 보도·질문 답변은 피그마 흐름을 확인하기 위한 예시이며 실제 보도나 AI 처리 결과가 아닙니다. 임의의 외부 URL은 가져오지 않습니다.
- 아래 예시 URL을 입력하면 3단계 변환 로딩 후 결과를 확인할 수 있습니다. 다른 URL은 실패 안내를 표시합니다. 로딩의 취소·뒤로 가기는 예약된 작업을 중단합니다.

```text
https://news.example.com/article/2026111301
https://news.example.com/article/2026111302
```

- UI 미리보기에서는 비회원·회원에게 3회, 구독 회원에게 무제한 상태를 표시합니다. 성공한 예시 변환만 횟수에 반영하며 실패·취소는 차감하지 않습니다. 새로고침하면 미리보기 횟수가 초기화됩니다. 실제 한도·실패 차감 정책·구독 검증은 서버 명세 확정 후 연동해야 합니다. 한도 팝업 문구는 피그마를 따릅니다.
- 쉬운말 보기와 원문 보기 모두 문장을 드래그하거나 길게 눌러 선택하면 `AI에게 물어보기` 도구가 표시됩니다. 키보드에서는 본문 문단에 포커스를 둔 뒤 Enter로 질문 시트를 열 수 있습니다.
- 기사 읽기는 초기 디자인처럼 상단 회색 이미지 자리 안에 뒤로가기를 배치하고, 그 아래에 제목과 본문을 표시합니다. 이미지 영역을 접거나 펼치는 스크롤 애니메이션은 없습니다. 문서 전체가 스크롤되므로 본문 바깥 여백에서도 터치패드·마우스 휠로 스크롤할 수 있습니다.
- 하단 탐색, 알림 목록, 결제 화면은 이번 범위에 포함하지 않았으며 준비 중 안내를 제공합니다. 구독 버튼은 결제를 실행하지 않습니다.

## 폴더 구성

| 폴더 | 역할 |
| --- | --- |
| `src/components/ui` | 버튼, 원본 아이콘, 상태 안내 |
| `src/components/onboarding` | 공통 레이아웃, 기능 소개, 주제 칩, 저장 안내 팝업 |
| `src/components/layout` | 모바일 공통 화면, 하단 메뉴 |
| `src/components/home` | URL 입력, 뉴스 카드, 이용 한도 팝업 |
| `src/components/article` | 문장 질문 시트 |
| `src/pages` | 온보딩, 홈, 로딩, 기사 미리보기·읽기 |
| `src/hooks` | 화면 이동, 관심 주제, 변환 진행·한도 상태 |
| `src/apis` | 향후 API 연동 계약 |
| `src/constants` | 관심 주제 목록 |
| `src/types` | 온보딩·뉴스·화면 이동 타입 |
| `src/mocks` | 서버 연동 전 화면 검토용 기사와 변환 어댑터 |
| `src/utils` | 로컬 저장소 읽기·쓰기와 저장값 검증 |
| `public/images/onboarding` | 피그마에서 내보낸 원본 SVG 아이콘 7개 |
| `public/images/home` | 피그마에서 내보낸 홈·기사 원본 SVG 아이콘 11개 |

디자인: https://www.figma.com/design/0vabanvYv9G3zPhPlhcrye?node-id=25-12
