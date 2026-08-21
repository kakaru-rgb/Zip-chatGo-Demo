# 집찾GO 프론트엔드–Spring Boot 통합 분석 및 작업 계획

작성일: 2026-08-21  
분석 대상:

- 백엔드: `C:\ajb\git\springboot_test`
- 프론트엔드: `C:\ajb\git\Zip-chatGo`

> 이 문서는 현재 구현 상태를 분석해 통합 범위와 팀원별 작업을 합의하기 위한 문서다. 아직 프론트엔드 파일을 백엔드 저장소로 복사하거나 실제 API를 구현한 상태는 아니다.

## 1. 결론

`Zip-chatGo`는 React 프로젝트가 아니다. HTML 26개, CSS 18개, 순수 JavaScript 23개로 구성된 정적 멀티 페이지 웹사이트다. `server/` 아래 Node.js/Express 프로그램은 프론트엔드 빌드 서버가 아니라 다음 기능을 임시로 담당한다.

1. 정적 HTML/CSS/JS 파일 제공
2. 국토교통부 매매·전월세 OpenAPI 프록시
3. `properties.json`을 SQLite로 적재한 뒤 추천 매물 3건 조회

최종 백엔드를 Spring Boot 하나만 사용하려면 Express의 위 기능을 Spring MVC, Spring REST Controller, Java HTTP Client, TiDB/MySQL 저장소로 대체하면 된다. React 빌드, npm 번들링, Node 런타임은 필요하지 않다.

권장 통합 형태는 **Spring Boot 단일 서버 + Thymeleaf 화면 + 동일 출처 REST API**다.

```text
브라우저
  ├─ GET /...                  → Spring MVC + Thymeleaf
  ├─ GET /css, /js, /images    → Spring 정적 리소스
  └─ /api/...                  → Spring REST Controller
                                  ├─ Service
                                  ├─ TiDB/MySQL
                                  ├─ 파일 저장소
                                  └─ 국토교통부 OpenAPI
```

이 방식이면 프론트엔드와 API의 도메인이 같아 별도 CORS 설정이 거의 필요 없고, 기존 Spring Security 세션 로그인도 그대로 사용할 수 있다.

## 2. 현재 프론트엔드 구성

### 2.1 화면 목록

| 영역 | 화면 | 현재 상태 | 통합 후 권장 URL |
|---|---|---|---|
| 메인 | `index.html` | 구현 | `/` |
| AI 추천 | `templates/ai/chat.html` | 규칙 기반 데모 | `/ai/chat` |
| 회원 | `member/login.html` | UI/가짜 로그인 | `/login` |
| 회원 | `member/signup.html` | UI/가짜 가입 | `/join` |
| 지도 | `property/map.html` | 지도·필터·POI·학군 구현 | `/properties/map` |
| 검색 | `property/search.html` | 빈 파일 | `/properties/search` |
| 등록 | `property/register.html` | 4단계 UI/미리보기만 구현 | `/properties/register` |
| 관심목록 | `favorite/favorite.html` | localStorage 기반 | `/favorites` |
| 시장동향 | `market/trend.html` | API 또는 데모 데이터 | `/market` |
| 시장동향 상세 | `sale`, `jeonse`, `volume`, `region`, `region-flow`, `rate`, `school`, `traffic`, `ai-report` | 화면·차트 구현 | `/market/{page}` |
| 고객지원 | `support/guide.html` | 정적 가이드·FAQ | `/support/guide` |
| 고객지원 | `support/contact.html` | 문의를 localStorage에 저장 | `/support/contact` |
| 서비스 소개 | `support/Servise.html` | 구현 | `/about/service` |
| 팀 소개 | `support/team.html` | 구현 | `/about/team` |
| 콘텐츠 | `support/live.html`, `live2.html`, `modelhouse.html` | 구현/일부 API 연결 | `/content/...` |
| 공지 | `support/notice.html` | 빈 파일 | `/support/notices` |

`templates/support/map.html`은 지도 화면의 별도 또는 과거 버전으로 보이므로 `templates/property/map.html`과 비교 후 하나만 유지해야 한다.

### 2.2 데이터와 정적 자원

- `properties.json`: 약 4,970건의 지도용 샘플 매물
- `poi_database.json`: 생활 편의시설 데이터
- 초·중·고 학군 경계 JSON
- 교통 지점 JSON
- 정적 이미지 약 180개
- `static/data` 전체 크기 약 65MB
- Naver Maps JavaScript API와 Supercluster CDN 사용

초기 통합에서는 JSON을 `/static/data`에서 제공할 수 있다. 그러나 매물 등록과 관심목록을 실제 서비스로 연결하려면 최종적으로 매물 데이터는 `/api/properties`와 TiDB를 기준으로 통일해야 한다. 정적 JSON과 DB를 동시에 진실의 원천으로 유지하면 신규 등록 매물이 지도에 표시되지 않는 문제가 생긴다.

### 2.3 브라우저 임시 저장 기능

| 기능 | 현재 저장 위치 | 통합 후 저장 위치 |
|---|---|---|
| 로그인 상태 | `localStorage:jipchatgoLoginUser` | Spring Security 세션 |
| 데모 회원 | `localStorage:jipchatgoUsers` | `member` 테이블 |
| 관심매물 ID | `localStorage:zipchatgo.favoritePropertyIds` | `favorite` 테이블 |
| 1:1 문의 | `localStorage:jipchatgoInquiries` | `inquiry` 테이블 |
| AI 첫 질문 | `sessionStorage:jipchatgoFirstMessage` | 그대로 사용 가능하거나 서버 대화 세션으로 확장 |

## 3. Node.js 서버에서 Spring Boot로 옮길 기능

### 3.1 현재 Express API

| Node API | 역할 | Spring Boot 대체 파일 |
|---|---|---|
| `GET /api/market/health` | 시장 API 상태 확인 | `MarketApiController`, `MarketService` |
| `GET /api/market/summary` | 국토교통부 매매·전월세 조회 및 요약 | `MarketApiController`, `MolitClient`, `MarketService` |
| `GET /api/live/recommendations` | SQLite에서 추천 매물 3개 조회 | `RecommendationController`, `PropertyRepository` |

### 3.2 국토교통부 API 이전

Spring Boot에 다음 요소가 필요하다.

- 환경변수: `MOLIT_SERVICE_KEY`, 매매 URL, 전월세 URL, 기본 지역코드
- 외부 HTTP 호출용 `RestClient` 또는 `WebClient`
- XML 응답 DTO 또는 XML 파서
- 법정동코드와 `YYYYMM` 입력 검증
- 현재 월/이전 월 병렬 또는 순차 조회
- 평균 매매가, 평균 전세보증금, 거래량, 증감률 계산
- 기존 JavaScript가 기대하는 JSON 응답 형식 유지
- 외부 API 장애·타임아웃·호출 한도 대응
- 인증키가 없을 때 데모 데이터를 반환할지 명확한 정책 결정

권장 응답 계약:

```json
{
  "ok": true,
  "source": "molit-openapi",
  "regionCode": "41117",
  "regionName": "수원 영통구 · 광교",
  "dealYmd": "202607",
  "saleAvg": 87200,
  "saleChangeRate": 1.4,
  "jeonseAvgDeposit": 51200,
  "jeonseChangeRate": 0.8,
  "tradeCount": 120,
  "volumeChangeRate": -3.2,
  "sampleTradeList": [],
  "sampleRentList": []
}
```

프론트엔드 `market-api.js`, `sale.js`, `jeonse.js`, `volume.js`, `region.js`가 이 계약을 사용하므로 필드명을 바꾸려면 해당 파일도 동시에 수정해야 한다.

### 3.3 SQLite 제거

Node 서버는 시작할 때 `properties.json`을 SQLite에 넣는다. 최종 구성에서는 SQLite를 사용하지 않고 다음 중 하나를 선택한다.

- 권장: JSON 4,970건을 TiDB `property` 테이블에 한 번 적재하고 모든 매물 API가 TiDB를 조회
- 임시: 지도는 JSON을 유지하고 추천 API만 애플리케이션 시작 시 JSON을 읽음

실제 매물 등록까지 연결하는 최종 목표를 고려하면 첫 번째 방식이 적합하다.

## 4. Spring Boot에 필요한 공통 구조

### 4.1 권장 패키지 구조

```text
src/main/java/com/onrender/springboot_test/
├─ config/
│  ├─ SecurityConfig.java
│  ├─ WebConfig.java
│  └─ StorageProperties.java
├─ controller/
│  ├─ PageController.java
│  ├─ MemberController.java
│  ├─ PropertyPageController.java
│  ├─ MarketPageController.java
│  ├─ SupportPageController.java
│  ├─ PropertyApiController.java
│  ├─ FavoriteApiController.java
│  ├─ MarketApiController.java
│  └─ InquiryApiController.java
├─ service/
│  ├─ MemberService.java
│  ├─ PropertyService.java
│  ├─ FavoriteService.java
│  ├─ MarketService.java
│  ├─ MolitClient.java
│  ├─ InquiryService.java
│  └─ FileStorageService.java
├─ repository/
│  ├─ MemberRepository.java
│  ├─ PropertyRepository.java
│  ├─ PropertyImageRepository.java
│  ├─ FavoriteRepository.java
│  └─ InquiryRepository.java
├─ dto/
│  ├─ member/...
│  ├─ property/...
│  ├─ market/...
│  └─ inquiry/...
└─ exception/
   ├─ GlobalExceptionHandler.java
   └─ ErrorResponse.java
```

현재 프로젝트가 `JdbcTemplate` 방식이므로 통합 단계에서는 동일 방식을 유지하면 학습 비용과 충돌이 적다. 테이블이 많아진 뒤 필요할 때 Spring Data JDBC 또는 JPA 전환을 별도 논의할 수 있다.

### 4.2 템플릿과 정적 파일 배치

```text
src/main/resources/
├─ templates/
│  ├─ common/header.html
│  ├─ common/footer.html
│  ├─ index.html
│  ├─ ai/chat.html
│  ├─ member/login.html
│  ├─ member/join.html
│  ├─ property/map.html
│  ├─ property/register.html
│  ├─ favorite/list.html
│  ├─ market/...
│  └─ support/...
└─ static/
   ├─ css/...
   ├─ js/...
   ├─ images/...
   └─ data/...
```

HTML을 단순 복사하는 것만으로는 부족하다. 모든 상대 경로를 Thymeleaf URL로 바꿔야 한다.

```html
<!-- 변경 전 -->
<link rel="stylesheet" href="../../static/css/common.css">
<a href="../../templates/property/map.html">지도</a>

<!-- 변경 후 -->
<link rel="stylesheet" th:href="@{/css/common.css}">
<a th:href="@{/properties/map}">지도</a>
```

페이지마다 중복된 헤더와 푸터는 `th:replace` fragment로 합친다. 로그인 메뉴는 `sec:authorize="isAuthenticated()"`와 `sec:authentication="name"`을 사용하면 `localStorage` 기반 메뉴 전환을 제거할 수 있다.

## 5. 필요한 DB 테이블

### 5.1 회원

현재 `member` 테이블에는 `username`, `password`, `name`, `email`, `role`만 있다. 새 회원 UI는 이메일 로그인, 전화번호, 일반회원/공인중개사 구분, 중개사 정보를 요구한다.

추가 또는 결정할 컬럼:

- 로그인 식별자: `username` 유지 또는 `email`로 변경
- `phone`
- `member_type`: `GENERAL`, `BROKER`
- `broker_shop_name`
- `broker_business_no`
- `broker_license_no`
- `marketing_agreed`
- `status`, `updated_at`

로그인 식별자 선택은 통합 전에 반드시 합의해야 한다. 프론트 UI는 이메일 로그인이고 기존 백엔드는 username 로그인이다.

### 5.2 매물

`property` 테이블의 최소 컬럼:

- 식별자와 소유자: `id`, `member_id`, `status`
- 기본 정보: `building_name`, `property_type`, `deal_type`
- 가격: `sale_price`, `deposit`, `monthly_rent`, `maintenance_fee`
- 면적/구조: `exclusive_area`, `floor`, `total_floor`, `rooms`, `bathrooms`, `built_year`
- 위치: `address`, `address_detail`, `district`, `latitude`, `longitude`
- 설명과 옵션: `description`, `available_from`
- 연락처: 원칙적으로 회원 정보 참조, 불가피하면 별도 보호 컬럼
- 시간: `created_at`, `updated_at`

다중 값은 별도 테이블 또는 JSON 컬럼으로 설계한다.

- `property_feature(property_id, feature_code)`
- `property_option(property_id, option_code)`
- `property_utility(property_id, utility_code)`
- `property_image(id, property_id, storage_key, original_name, content_type, size, sort_order)`

### 5.3 관심매물과 문의

```text
favorite(member_id, property_id, created_at)
  UNIQUE(member_id, property_id)

inquiry(id, member_id nullable, name, email, type, title, message,
        status, created_at, answered_at)
```

향후 공지사항을 구현한다면 `notice` 테이블도 추가한다.

## 6. 필요한 API

### 6.1 회원/인증

Spring Security의 폼 로그인을 유지하는 권장안:

| Method | URL | 역할 | 인증 |
|---|---|---|---|
| GET | `/login` | 통합 로그인 화면 | 공개 |
| GET | `/join` | 회원가입 화면 | 공개 |
| POST | `/join` | 회원가입 | 공개 |
| POST | `/login` | Spring Security 로그인 처리 | 공개 |
| POST | `/logout` | 로그아웃 | 로그인 |
| GET | `/api/members/me` | 현재 로그인 사용자 정보 | 로그인 |

서버 검증, 중복 이메일/아이디 처리, BCrypt, 오류 메시지, 가입 성공 후 로그인 이동이 필요하다. 브라우저에 비밀번호나 가짜 회원 목록을 저장하는 코드는 제거한다.

### 6.2 매물

| Method | URL | 역할 | 인증 |
|---|---|---|---|
| GET | `/api/properties` | 지도 범위·검색·필터·페이징 조회 | 공개 |
| GET | `/api/properties/{id}` | 매물 상세 | 공개 |
| POST | `/api/properties` | 매물 등록 | 로그인 |
| PUT | `/api/properties/{id}` | 본인 매물 수정 | 소유자/관리자 |
| DELETE | `/api/properties/{id}` | 본인 매물 삭제 | 소유자/관리자 |
| POST | `/api/properties/{id}/images` | 이미지 업로드 | 소유자/관리자 |
| DELETE | `/api/properties/{id}/images/{imageId}` | 이미지 삭제 | 소유자/관리자 |
| GET | `/api/live/recommendations` | 추천 매물 3건 | 공개 |

지도 API에는 최소한 `bounds`, `zoom`, `propertyType`, `dealType`, 가격 범위, 면적 범위 파라미터가 필요하다. 한 번에 4,970건을 계속 내려주기보다 현재 지도 범위 또는 클러스터 단위로 조회하도록 발전시키는 것이 좋다.

### 6.3 관심매물

| Method | URL | 역할 | 인증 |
|---|---|---|---|
| GET | `/api/favorites` | 내 관심매물 목록 | 로그인 |
| POST | `/api/favorites/{propertyId}` | 관심 등록 | 로그인 |
| DELETE | `/api/favorites/{propertyId}` | 관심 해제 | 로그인 |

### 6.4 고객 문의

| Method | URL | 역할 | 인증 |
|---|---|---|---|
| POST | `/api/inquiries` | 문의 등록 | 공개 또는 로그인 |
| GET | `/api/inquiries/me` | 내 문의 내역 | 로그인 |
| GET | `/api/admin/inquiries` | 문의 관리 | 관리자 |

### 6.5 시장동향

| Method | URL | 역할 |
|---|---|---|
| GET | `/api/market/health` | 외부 API 설정 상태 |
| GET | `/api/market/summary?region=41117&month=202607` | 월별 시장 요약 |

## 7. 팀원별 상세 작업

## 7.1 안종범 — 지도 기반 매물 탐색

### 프론트엔드 이전 대상

- `templates/property/map.html`
- `static/js/map.js`
- `static/css/map.css`
- `static/data/properties.json`
- `static/data/poi_database.json`
- 학군 경계 JSON 3개
- 교통 지점 JSON
- 매물 및 평면도 이미지
- `templates/favorite/favorite.html`, `favorite.js`, `favorite.css` 중 지도 관심 기능과 맞닿는 부분

### 해야 할 작업

1. 지도 화면을 `templates/property/map.html`로 이전하고 상대 경로를 Thymeleaf 경로로 수정한다.
2. Naver Maps `ncpKeyId`를 HTML에 하드코딩하지 않도록 환경 설정 또는 서버 렌더링 값으로 분리한다. Naver 콘솔에서 운영 도메인도 등록한다.
3. 초기에는 `/data/properties.json`을 사용할 수 있지만, 최종적으로 `fetch('/api/properties?...')`로 변경한다.
4. `properties.json` 필드와 `PropertyResponse` DTO 필드를 맞춘다. 기존 프론트 필드명을 유지하면 화면 수정량이 줄어든다.
5. 검색·필터 항목별 요청 파라미터를 정한다.
6. 지도 이동 시 현재 경계 좌표를 API에 전달하고 결과를 다시 클러스터링한다.
7. 매물 상세 팝업이 `/api/properties/{id}`를 호출하도록 분리한다.
8. 관심 버튼을 localStorage가 아닌 `/api/favorites/{id}` POST/DELETE로 변경한다.
9. 비로그인 상태에서 관심 버튼 클릭 시 `/login?redirect=...`로 이동시킨다.
10. 등록된 신규 매물이 지도에 표시되는지 확인한다.
11. POI·학군 데이터는 갱신 빈도와 크기에 따라 정적 JSON 유지 또는 API화를 결정한다.
12. 지도 키 실패, 데이터 로딩 실패, 빈 검색 결과 UI를 추가한다.

### Spring Boot 필요 파일

- `PropertyApiController.java`
- `PropertyService.java`
- `PropertyRepository.java`
- `PropertySearchCondition.java`
- `PropertySummaryResponse.java`
- `PropertyDetailResponse.java`
- `FavoriteApiController.java`
- `FavoriteService.java`
- `FavoriteRepository.java`
- `property`, `favorite` 테이블 SQL 및 JSON 초기 적재 스크립트

### 완료 기준

- DB 매물이 지도에 표시된다.
- 필터와 지도 경계 검색이 서버 데이터로 동작한다.
- 로그인 사용자의 관심매물이 다른 브라우저에서도 유지된다.
- 매물 등록 이후 새 매물이 지도와 상세 화면에 나타난다.

## 7.2 이승호 — 메인, 시장동향, 회원 기능

### 프론트엔드 이전 대상

- `index.html`, `main.js`, `main.css`
- `templates/market/*`, 시장 관련 JS/CSS
- `templates/member/login.html`, `signup.html`
- `auth.js`, `common.js`, `auth.css`, `common.css`
- `server/server.js` 중 `/api/market/*` 구현

### 해야 할 작업

1. 메인 화면을 기존 Spring `index.html`과 병합하고 모든 메뉴 URL을 Controller URL로 변경한다.
2. 로그인/회원가입 디자인은 새 프론트 화면을 기준으로 하되 기존 Spring Security 폼 규약과 맞춘다.
3. 로그인 입력값을 현재의 이메일 기준으로 할지 기존 username 기준으로 할지 팀에서 확정한다.
4. `auth.js`의 `preventDefault()` 가짜 로그인과 localStorage 인증 코드를 제거한다.
5. 회원가입 폼에 `name` 속성과 CSRF 토큰을 넣고 `/join`으로 제출하거나 JSON API 방식으로 통일한다.
6. 일반회원/공인중개사 필드를 DTO와 DB에 반영하고 서버 측 Bean Validation을 추가한다.
7. 로그인 실패·중복 가입·검증 실패를 alert가 아닌 화면 필드 오류로 표시한다.
8. `common.js`의 로그인 메뉴 판정은 Thymeleaf Spring Security fragment로 교체한다.
9. Express의 국토교통부 호출·XML 파싱·통계 계산을 `MolitClient`와 `MarketService`로 이식한다.
10. 기존 시장 JavaScript가 기대하는 JSON 필드명을 유지하고 화면별 API base 처리 방식을 하나로 합친다.
11. 외부 API 키는 환경변수에서만 읽고 로그나 HTML에 노출하지 않는다.
12. 요청 타임아웃, 잘못된 법정동코드/월, 외부 API 오류와 데모 fallback 정책을 구현한다.
13. Spring Security의 공개/보호 URL, 세션, 로그아웃, CSRF 정책을 정리한다.

### Spring Boot 필요 파일

- `PageController.java`
- `MarketPageController.java`
- 개선된 `MemberController.java`, `MemberService.java`, `MemberRepository.java`
- `MemberJoinRequest.java`, `MemberResponse.java`
- `MarketApiController.java`
- `MarketService.java`
- `MolitClient.java`
- 매매·전월세 외부 응답 DTO와 `MarketSummaryResponse.java`
- `GlobalExceptionHandler.java`
- 개선된 `SecurityConfig.java`
- 회원 테이블 migration SQL

### 완료 기준

- 실제 DB 회원가입과 Spring Security 로그인이 새 UI에서 동작한다.
- 로그아웃과 로그인 메뉴 전환이 서버 세션을 기준으로 동작한다.
- Node 서버 없이 시장동향 화면이 Spring API를 호출한다.
- 인증키 유무와 외부 API 장애 상황이 사용자에게 명확히 표시된다.

## 7.3 맹준영 — 매물 등록, 이용가이드, 고객센터

### 프론트엔드 이전 대상

- `templates/property/register.html`, `register.css`, 관련 이미지
- `templates/support/guide.html`, `guide.js`, `guide.css`
- `templates/support/contact.html`, `contact.js`, `contact.css`
- 공지 화면을 구현한다면 `support/notice.html`

### 해야 할 작업

1. 등록 화면을 Thymeleaf 템플릿으로 이전하고 실제 `<form>` 필드에 일관된 `name`을 부여한다.
2. 4단계 UI 상태와 최종 제출 데이터 구조를 `PropertyCreateRequest`와 맞춘다.
3. 현재 성공 alert만 띄우는 submit handler를 `multipart/form-data` API 호출로 변경한다.
4. 주소 검색 결과에서 위도·경도를 확보해 함께 전송한다.
5. 매매/전세/월세별 필수 가격 필드를 서버에서도 조건부 검증한다.
6. 면적, 층, 방/욕실 수, 관리비, 옵션과 특징의 타입·최댓값을 정한다.
7. 사진의 허용 확장자, MIME, 개수, 개별/총 용량, 대표 이미지 순서를 검증한다.
8. 이미지 미리보기의 Object URL을 적절히 해제하고 업로드 실패·부분 실패 UI를 추가한다.
9. 로컬 디스크 저장과 S3 계열 오브젝트 저장 중 배포 환경에 맞는 방식을 결정한다. 컨테이너 로컬 디스크는 재배포 시 사라질 수 있으므로 운영은 외부 저장소가 권장된다.
10. 등록된 매물의 초기 상태를 `PENDING`으로 두고 관리자 승인 후 `ACTIVE`로 노출할지 정책을 정한다.
11. 고객 문의 localStorage 저장을 `POST /api/inquiries`로 변경한다.
12. 로그인 사용자는 이름·이메일을 서버에서 채우고, 비회원 문의 정책도 결정한다.
13. FAQ와 가이드는 당장은 정적 화면으로 유지해도 된다. 관리 기능이 필요할 때 DB화한다.
14. 임시 저장이 요구사항이면 localStorage 데모를 유지할지 `property_draft` 서버 저장 기능을 만들지 결정한다.

### Spring Boot 필요 파일

- `PropertyPageController.java`
- `PropertyApiController.java`의 등록 부분
- `PropertyCreateRequest.java`
- `PropertyImageResponse.java`
- `PropertyService.java`
- `FileStorageService.java`
- `PropertyRepository.java`, `PropertyImageRepository.java`
- `SupportPageController.java`
- `InquiryApiController.java`
- `InquiryService.java`, `InquiryRepository.java`
- `InquiryCreateRequest.java`
- `property`, `property_image`, `inquiry` 테이블 SQL
- 업로드 제한 및 저장 위치 설정

### 완료 기준

- 로그인 사용자가 사진을 포함한 매물을 등록할 수 있다.
- 실패 시 입력값을 보존하고 필드별 오류를 확인할 수 있다.
- DB와 파일 저장소에 데이터가 일관되게 저장된다.
- 문의가 DB에 저장되고 중복 제출이 방지된다.

## 7.4 황상옥 — 서비스 및 프로젝트 소개

### 프론트엔드 이전 대상

- `templates/support/Servise.html`
- `templates/support/team.html`
- `servise.css`, `team.css`, `team.js`
- 팀 이미지와 로고

### 해야 할 작업

1. `Servise.html`을 `service.html` 또는 `about/service.html`로 이름을 정상화한다.
2. 페이지를 Spring templates로 이전하고 CSS·이미지·링크를 Thymeleaf 경로로 변경한다.
3. 중복 헤더·푸터를 공통 fragment로 교체한다.
4. 서비스명 `집찾GO` 표기, URL, 메뉴명, 푸터 내용을 전체 페이지와 통일한다.
5. 정적 콘텐츠이므로 별도 API는 만들지 않고 PageController 매핑만 추가한다.
6. 모바일 메뉴, 접근성, 깨진 링크, 이미지 대체 텍스트를 확인한다.
7. 팀 소개 사진의 사용 동의와 공개 범위를 확인한다.
8. 서비스 소개에서 링크하는 지도·시장동향·회원 페이지가 새 URL로 정상 이동하는지 통합 테스트한다.

### Spring Boot 필요 파일

- `AboutPageController.java` 또는 공통 `PageController.java`
- `templates/about/service.html`
- `templates/about/team.html`
- 공통 `header.html`, `footer.html` fragment 반영

### 완료 기준

- 소개 화면이 Node/GitHub Pages 경로 없이 Spring Boot에서 열린다.
- 공통 헤더·푸터와 로그인 상태가 다른 화면과 동일하다.
- 모든 내부 링크와 정적 이미지가 배포 환경에서 정상 동작한다.

## 8. 공동 작업으로 먼저 확정할 사항

개별 화면을 옮기기 전에 아래 계약을 합의해야 충돌이 줄어든다.

1. URL 규칙: 화면 URL과 `/api` URL 목록
2. 로그인 ID: username 또는 email
3. 공통 헤더·푸터의 최종 디자인과 담당자
4. DTO JSON 필드명: snake_case 유지 또는 camelCase 전환
5. 매물 테이블과 등록 상태 정책
6. 이미지 저장 위치와 제한
7. 정적 샘플 매물 4,970건의 TiDB 적재 방식
8. Naver Maps 및 공공데이터 키 관리 방식
9. 오류 응답 공통 형식
10. 브랜치와 파일 소유권 규칙

권장 오류 응답:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "입력값을 확인해 주세요.",
  "fieldErrors": {
    "email": "올바른 이메일 형식이 아닙니다."
  }
}
```

## 9. 권장 구현 순서

### 1단계 — 공통 기반

- DB 환경변수 이름을 `DB_NAME` 또는 `DB_DATABASE` 하나로 통일
- `.env` 로딩 방식 확정
- DB migration SQL 정리
- 공통 URL, DTO, 오류 응답 확정
- 프론트 정적 자원과 템플릿 이전
- 공통 header/footer fragment 구성

### 2단계 — 회원과 보안

- 회원 스키마 확장
- 새 회원 UI와 Spring Security 연결
- localStorage 가짜 인증 제거
- CSRF와 보호 URL 설정

### 3단계 — 매물 조회와 지도

- JSON 데이터를 TiDB에 적재
- 매물 목록/상세/필터 API 구현
- 지도 `fetch`를 API로 변경
- 추천 매물 API 이전

### 4단계 — 매물 등록과 이미지

- 등록 DTO와 API
- 파일 저장소
- 소유권 및 승인 상태
- 지도와 신규 매물 연계

### 5단계 — 관심매물과 문의

- localStorage를 사용자별 DB 데이터로 전환
- 로그인 리다이렉트와 오류 처리

### 6단계 — 시장동향

- Express 로직을 Java로 이식
- OpenAPI 테스트와 캐시
- Node 서버 제거

### 7단계 — 품질과 배포

- Controller/Service/Repository 테스트
- MockMvc 보안 테스트
- 외부 API mock 테스트
- 파일 업로드 테스트
- 주요 사용자 동선 브라우저 테스트
- Docker 배포 및 환경변수 검증

## 10. 파일 충돌을 줄이는 작업 분리

| 공용 파일 | 관리 방법 |
|---|---|
| `SecurityConfig.java` | 이승호가 1차 담당, 변경 전 팀 공유 |
| `common/header.html`, `footer.html` | 한 명이 통합 담당하고 다른 팀원은 직접 수정하지 않음 |
| `application.properties` | 환경변수 목록을 문서화하고 통합 담당자가 반영 |
| DB migration SQL | 기능별 SQL 파일을 나누고 실행 순서만 통합 관리 |
| `PropertyService`, `PropertyApiController` | 안종범은 조회, 맹준영은 등록 메서드를 담당하되 파일 충돌 가능성이 높으므로 인터페이스를 먼저 합의 |
| `common.js`, `common.css` | 페이지별 브랜치에서 중복 수정하지 않고 공통 담당자에게 요청 |

기능별 브랜치 예:

```text
feature/common-layout
feature/member-security
feature/property-map-api
feature/property-registration
feature/market-api
feature/support-pages
feature/about-pages
```

## 11. 테스트 체크리스트

### 공통

- 직접 URL 접근과 메뉴 이동이 모두 동작한다.
- CSS, JS, 이미지에 404가 없다.
- 모바일과 데스크톱 레이아웃이 유지된다.
- 로그인 전/후 메뉴가 올바르다.

### 회원

- 정상/중복/잘못된 가입 입력
- 정상/실패 로그인과 로그아웃
- 비로그인 사용자의 보호 페이지 접근
- 세션 만료 후 API 응답

### 지도·매물

- 지도 범위, 검색, 모든 필터 조합
- 매물 0건 및 API 실패 상태
- 상세 조회와 관심 등록/해제
- 다중 사용자 관심목록 분리
- 신규 등록 매물 표시

### 등록·문의

- 매매/전세/월세 조건부 필드
- 잘못된 파일 형식과 용량 초과
- 업로드 도중 실패 시 DB/파일 정합성
- 문의 중복 제출과 서버 오류

### 시장동향

- 올바른/잘못된 지역코드와 월
- 인증키 없음, OpenAPI 오류, 타임아웃
- 이전 달 데이터 없음과 거래 0건
- 프론트 차트의 빈 데이터 처리

## 12. 현재 확인된 위험 요소

1. 메시지와 로컬 `.env`에 실제 DB 비밀번호가 존재하므로 비밀번호 교체가 필요하다.
2. Spring Boot는 루트 `.env`를 기본 자동 로딩하지 않는다.
3. 기본 설정은 `DB_NAME`, 운영 설정과 예시는 `DB_DATABASE`를 사용한다.
4. 현재 SQL 파일은 데이터베이스명이 다르고 중간에 `DROP TABLE qna`가 있어 그대로 일괄 실행하면 안 된다.
5. `/qna/**`가 전부 공개이고 CSRF가 꺼져 있다.
6. Naver Maps 클라이언트 키가 HTML에 직접 포함되어 있다. 클라이언트 키는 원래 브라우저에서 보일 수 있지만 허용 도메인 제한이 반드시 필요하다.
7. `server/node_modules`가 프론트 저장소 안에 존재한다. 최종 통합 후 Node 서버와 함께 제외하고 Git에 추적되지 않게 해야 한다.
8. 대용량 이미지와 JSON을 모두 애플리케이션 JAR에 포함하면 빌드와 배포가 무거워진다.
9. `property/map.html`과 `support/map.html`, `auth.js`와 `member.js`, `login.html`과 `signup.html`처럼 중복 또는 구버전 후보가 있다.
10. 빈 화면은 `property/search.html`, `support/notice.html`이다.

## 13. 1차 통합 완료의 정의

다음 조건을 모두 만족하면 “프론트엔드를 Spring Boot에 연결했다”고 볼 수 있다.

- Node.js 없이 Spring Boot 하나만 실행한다.
- 모든 완성된 HTML 화면을 Spring Controller URL로 열 수 있다.
- 정적 자원에 404가 없고 내부 링크가 새 URL을 사용한다.
- 실제 회원가입·로그인·로그아웃이 TiDB와 Spring Security로 동작한다.
- 지도 매물이 Spring API 또는 합의된 정적 데이터 경로로 표시된다.
- 매물 등록과 사진 업로드가 서버에 저장된다.
- 관심매물과 문의가 localStorage가 아니라 사용자/DB 기준으로 저장된다.
- 시장동향 API가 Spring Boot에서 국토교통부 API를 호출한다.
- 주요 성공·실패 흐름에 자동화 테스트가 있다.

AI 추천, 마이페이지, 공지사항, 관리자 승인 화면은 1차 통합 이후 별도 기능 범위로 두어도 된다.
