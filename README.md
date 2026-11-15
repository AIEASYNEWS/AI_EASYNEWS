# AI_EASYNEWS

React + TypeScript + Vite + Tailwind CSS로 구현한 쉬운말 뉴스의 온보딩 UI입니다.

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
| `/#/onboarding` 또는 `/` | 로그인·회원가입 안내 (S06) |
| `/#/onboarding/topics` | 관심 주제 선택 (S07) |
| `/#/onboarding/interests` | 관심 주제 설정 및 저장하지 않고 나가기 팝업 (S08) |

- 피그마 와이어프레임의 390×844 기준 레이아웃, Noto Sans KR, 회색 색상과 원본 SVG 아이콘을 사용합니다.
- 스타일은 Tailwind 유틸리티로 작성합니다. `src/index.css`에는 기존 Tailwind import만 유지합니다.
- 로그인 방식이 정해지기 전이므로 시작 화면의 CTA는 관심 주제 선택 UI로 이동합니다. 실제 인증은 수행하지 않습니다.
- 주제 선택·추가·삭제, 선택 개수, 저장 및 변경사항 폐기 동작을 제공합니다.
- 저장한 주제는 현재 브라우저의 `localStorage`에 보관됩니다. 처음에는 아무 주제도 선택되지 않습니다.
- 홈 화면은 구현하지 않았습니다. 선택 완료 후에는 저장 안내를 표시합니다. 실제 다음 화면은 `InterestTopicsPage`의 `onComplete`로 연결할 수 있습니다.
- API 요청은 아직 없습니다. `apis/onboarding.ts`에 향후 서버 연동에 필요한 타입 계약만 정의했습니다.

## 폴더 구성

| 폴더 | 역할 |
| --- | --- |
| `src/components/ui` | 버튼, 원본 아이콘, 상태 안내 |
| `src/components/onboarding` | 공통 레이아웃, 기능 소개, 주제 칩, 저장 안내 팝업 |
| `src/pages` | 시작 안내, 관심 주제 선택, 관심 주제 설정 |
| `src/hooks` | 관심 주제 상태와 화면 이동 |
| `src/apis` | 향후 API 연동 계약 |
| `src/constants` | 관심 주제 목록 |
| `src/types` | 온보딩 및 관심 주제 타입 |
| `src/utils` | 로컬 저장소 읽기·쓰기와 저장값 검증 |
| `public/images/onboarding` | 피그마에서 내보낸 원본 SVG 아이콘 7개 |


