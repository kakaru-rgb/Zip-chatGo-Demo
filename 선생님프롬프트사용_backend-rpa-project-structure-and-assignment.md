# 집찾GO Spring Boot 4 + RPA/AI 프로젝트 구조 및 4인 분담안

작성 기준: 2026-08-21  
기준 저장소: `springboot_test`  
적용 기술: Java 21, Spring Boot 4, Gradle, Thymeleaf, MySQL 8/TiDB, Python 3.11, Docker, GitHub Actions, Render

## 1. 문서의 목적과 전제

이 문서는 현재 `src/main/resources/templates`, `static/css`, `static/js`, `static/data`에 들어 있는 프런트엔드를 기준으로, 백엔드와 Python RPA/AI 및 배포 환경까지 완성하기 위한 **목표 프로젝트 구조와 파일별 담당자**를 정의한다. 현재 저장소에 이미 있는 일부 Java 파일은 완성 구현으로 가정하지 않으며, 아래 목표 구조에 맞게 검토·이동·재작성한다.

핵심 원칙은 다음과 같다.

- 브라우저는 Spring Boot 한 서버에만 접속한다. 화면은 Thymeleaf, 데이터 변경과 비동기 조회는 `/api/**` JSON API로 처리한다.
- Java 패키지는 기능 중심(`member`, `property`, `market`, `support`, `recommendation`)으로 나눈다.
- 영속 계층은 **Spring Data JDBC만 사용**한다. JPA/Hibernate, MyBatis는 추가하지 않는다.
- Python은 Java 웹 요청 중 직접 실행하지 않는다. RPA/분석/학습 작업이 MySQL 8 또는 TiDB에 결과를 적재하고 Spring Boot가 그 결과를 조회한다.
- 로컬 개발은 MySQL 8, 운영은 MySQL 호환 TiDB를 사용한다. SQL은 두 환경에서 공통으로 실행 가능해야 한다.
- 비밀번호와 API 키는 `.env` 또는 Render/GitHub Secret에만 둔다. `.env`, 모델 원천데이터, 업로드 파일은 Git에 커밋하지 않는다.
- 아래 표의 **주 담당자**가 설계·구현·테스트·문서화까지 끝내고, 연동 담당자는 API 계약을 함께 검토한다.

## 2. 전체 실행 구조

```text
Browser
  ├─ GET /... ───────────────> Spring MVC Controller ─> Thymeleaf templates
  └─ fetch /api/... ─────────> REST Controller ─> Service ─> Spring Data JDBC ─> MySQL/TiDB
                                                        └─ 외부 OpenAPI(국토교통부 등)

GitHub Actions 또는 Render Cron
  └─ Python 3.11 rpa job ─> 수집/정제/분석/학습 ─> MySQL/TiDB
                                                   └─ artifacts/*.joblib, reports/*.html
```

Python 결과는 `market_statistics`, `recommendations`, `model_runs` 같은 테이블을 통해 Java와 공유한다. Plotly HTML이나 PNG처럼 파일로 제공할 결과는 `rpa/reports`에서 생성한 뒤 운영 저장소 또는 DB에 저장하고, 웹 화면에는 가능한 한 JSON 데이터로 전달해 기존 JavaScript 차트가 렌더링하도록 한다.

## 3. 허용 의존성

Gradle의 애플리케이션 의존성은 요청 범위를 지켜 다음 항목만 둔다.

```groovy
implementation 'org.springframework.boot:spring-boot-starter-webmvc'
implementation 'org.springframework.boot:spring-boot-starter-thymeleaf'
implementation 'org.springframework.boot:spring-boot-starter-data-jdbc'
implementation 'org.springframework.boot:spring-boot-starter-security'
compileOnly 'org.projectlombok:lombok'
annotationProcessor 'org.projectlombok:lombok'
runtimeOnly 'com.mysql:mysql-connector-j'
```

테스트용 Spring Boot starter와 JUnit은 테스트 범위에서만 허용한다. `thymeleaf-extras-springsecurity6`, DevTools, Validation, Actuator 등은 편리하더라도 요구된 여섯 의존성 밖이므로 추가하지 않는다. 입력 검증은 DTO와 서비스에서 명시적으로 구현하고, Thymeleaf의 Security Dialect 없이 `Model` 속성 및 표준 Thymeleaf 조건식으로 로그인 상태를 출력한다.

Python `requirements.txt`에는 실제 코드에서 import하는 패키지만 넣는다. 예상 최소 구성은 다음과 같다.

```text
requests
beautifulsoup4
python-dotenv
numpy
pandas
scikit-learn
matplotlib
seaborn
plotly
```

초기에는 수집 작업에 `requests`, `beautifulsoup4`, `python-dotenv`, 분석에 `numpy`, `pandas`, 시각화에 필요한 도구 하나 이상, 추천 모델에 `scikit-learn`만 선택한다. MySQL/TiDB 적재가 필요하므로 Python 표준 라이브러리만으로 해결하지 못할 경우 DB 드라이버 1개가 추가로 필요하다. 이는 사용자 제한 목록 밖이므로 팀 합의 후 승인받거나, Python은 CSV/JSON 산출만 하고 Java 적재 작업이 파일을 읽는 방식으로 운영한다.

## 4. 목표 구조와 파일별 업무 분담표

아래 표가 이 프로젝트의 단일 작업 원장이다. `신규`는 새로 만들 파일, `전환`은 현재 프런트 경로와 링크를 Thymeleaf/Spring 방식으로 바꿀 파일, `검토`는 현재 파일을 목표 책임에 맞게 정리할 파일이다. 디렉터리 표기의 `*`는 그 폴더 아래 해당 기능 파일 전체를 의미한다.

| 구분 | 목표 경로/파일 | 상태 | 주 담당자 | 상세 구현 및 완료 기준 | 주요 연동 담당 |
|---|---|---:|---|---|---|
| 루트 | `build.gradle` | 검토 | 이승호 | Java 21과 Spring Boot 4 설정을 유지하고 허용된 Spring Web MVC, Thymeleaf, Lombok, MySQL Driver, Data JDBC, Security 및 테스트 의존성만 남긴다. `./gradlew test`가 통과해야 한다. | 전원 |
| 루트 | `settings.gradle`, `gradlew*`, `gradle/wrapper/*` | 검토 | 이승호 | 프로젝트명과 Wrapper 버전을 고정하고 Windows/Linux 모두 빌드되는지 확인한다. | 황상옥 |
| 루트 | `.gitignore`, `.dockerignore`, `.env.example` | 신규 | 황상옥 | `.env`, `build`, `.gradle`, Python 가상환경/캐시, 업로드, 모델 산출물과 보고서를 제외하고 필요한 환경변수 이름만 예제로 제공한다. | 전원 |
| 루트 | `README.md` | 신규 | 황상옥 | 로컬 MySQL 실행, 환경변수, Spring 실행, RPA 실행, Docker/Render 배포, 담당자별 진입점을 한 문서에 정리한다. | 전원 |
| 공통 Java | `src/main/java/com/onrender/springboot_test/SpringbootTestApplication.java` | 검토 | 황상옥 | 애플리케이션 진입점과 기본 패키지 스캔 범위를 확정한다. | 이승호 |
| 공통 Java | `common/config/WebConfig.java` | 신규 | 황상옥 | 업로드 경로의 정적 리소스 매핑, 날짜/화폐 표시용 공통 MVC 설정을 담당한다. 무분별한 CORS 허용은 하지 않는다. | 맹준영 |
| 공통 Java | `common/controller/PageController.java` | 신규 | 황상옥 | `/`, 서비스/팀 소개, 이용안내 등 단순 페이지 라우팅을 정의하고 HTML 파일 경로 노출을 제거한다. | 전원 |
| 공통 Java | `common/controller/GlobalExceptionHandler.java` | 신규 | 황상옥 | `@ControllerAdvice`로 화면 오류와 API 오류 응답 형식을 분리한다. 400/401/403/404/500 템플릿과 `{code,message}` JSON 계약을 만든다. | 전원 |
| 공통 Java | `common/dto/ApiResponse.java`, `PageResponse.java` | 신규 | 황상옥 | 목록/단건/오류 응답의 공통 형태를 정의한다. Lombok은 단순 보일러플레이트에만 사용한다. | 전원 |
| 공통 Java | `common/audit/AuditFields.java` | 신규 | 맹준영 | Data JDBC aggregate에서 재사용할 생성·수정 시각 필드를 정의하거나, 상속 부작용이 있으면 각 aggregate에 동일 규칙으로 명시한다. | 전원 |
| 보안 | `config/SecurityConfig.java` | 검토 | 이승호 | 세션 기반 폼 로그인, 로그아웃, 공개 URL, 회원 전용 `/favorites/**`, 등록 권한, CSRF 정책을 구성한다. 정적 리소스와 로그인 페이지는 공개한다. | 전원 |
| 보안 | `member/security/CustomUserDetailsService.java`, `LoginMember.java` | 검토/신규 | 이승호 | 이메일로 회원을 조회하고 상태/권한을 Spring Security 권한으로 변환한다. 비밀번호는 `PasswordEncoder` Bean으로만 검증한다. | 황상옥 |
| 회원 | `member/domain/Member.java`, `MemberRole.java`, `MemberStatus.java` | 신규 | 이승호 | `members` aggregate와 USER/ADMIN, ACTIVE/LOCKED 상태를 정의한다. 이메일 unique, 비밀번호 hash, 약관 동의 시각을 포함한다. | 맹준영 |
| 회원 | `member/repository/MemberRepository.java` | 검토 | 이승호 | Spring Data JDBC `CrudRepository`와 이메일 조회/중복 확인만 제공한다. SQL 문자열을 Controller에 두지 않는다. | 맹준영 |
| 회원 | `member/dto/MemberJoinRequest.java`, `MemberResponse.java`, `LoginRequest.java` | 검토/신규 | 이승호 | 폼 필드와 서버 DTO를 일치시키고 빈 값, 이메일 형식, 비밀번호 확인, 필수 약관을 의존성 추가 없이 검증한다. 응답에 hash를 절대 포함하지 않는다. | 맹준영 |
| 회원 | `member/service/MemberService.java` | 검토 | 이승호 | 가입, 이메일 중복, 회원 조회, 비밀번호 암호화, 탈퇴/잠금 규칙과 트랜잭션 경계를 구현한다. | 맹준영 |
| 회원 | `member/controller/MemberPageController.java`, `MemberApiController.java` | 검토/신규 | 이승호 | `GET /login`, `GET /members/join`, `POST /members`, `GET /api/members/me`를 제공하고 성공/실패 메시지를 화면에 전달한다. | 황상옥 |
| 회원 화면 | `templates/member/login.html`, `signup.html`; `static/js/auth.js`, `member.js`; `static/css/auth.css`, `member.css` | 전환 | 이승호 | 상대 파일 링크를 `@{...}`로 변경하고 localStorage 가짜 회원/로그인을 제거한다. 폼 action, CSRF hidden input, 서버 오류와 로그인 상태를 연결한다. | 황상옥 |
| 메인 | `templates/index.html`; `static/js/main.js`; `static/css/main.css` | 전환 | 이승호 | 메인 진입 URL을 `/`로 통일하고 실제 매물/시장 요약을 Model 또는 API로 출력한다. 모든 `./templates/...html` 링크를 애플리케이션 URL로 바꾼다. | 안종범, 황상옥 |
| 시장 도메인 | `market/domain/MarketTransaction.java`, `MarketStatistic.java`, `Region.java` | 신규 | 이승호 | 국토부 원본 거래와 화면용 월별/지역별 집계를 분리하고 금액 단위, 법정동 코드, 계약월을 명확히 정의한다. | 안종범 |
| 시장 저장소 | `market/repository/MarketTransactionRepository.java`, `MarketStatisticRepository.java`, `RegionRepository.java` | 신규 | 이승호 | 지역·월 조건 조회, upsert를 고려한 식별키, 차트용 정렬 조회를 Data JDBC로 구현한다. | 맹준영 |
| 외부 API | `market/client/MolitClient.java`, `MolitResponseParser.java`, `market/dto/molit/*` | 신규 | 이승호 | Java 표준 HTTP Client로 국토교통부 OpenAPI를 호출한다. 서비스키 인코딩, 타임아웃, HTTP 오류, XML/JSON 응답 파싱, 중복 거래 식별을 처리한다. | 황상옥 |
| 시장 서비스/API | `market/service/MarketService.java`; `market/controller/MarketPageController.java`, `MarketApiController.java`; `market/dto/*` | 신규 | 이승호 | `/market`, `/market/{detail}` 화면과 `/api/market/summary?region=&month=`, `/api/market/trends` 계약을 구현한다. 외부 API 실패 시 최근 DB 집계값을 반환한다. | 황상옥 |
| 시장 화면 | `templates/market/*`; `static/js/market-api.js`, `sale.js`, `jeonse.js`, `volume.js`, `region.js`, `region-flow.js`, `rate.js`, `school.js`, `traffic.js`, `ai-report.js`; 관련 CSS | 전환 | 이승호 | 하드코딩/모의 데이터를 API 응답으로 교체하고 차트의 빈 데이터·로딩·오류 상태를 구현한다. URL과 정적 리소스는 Thymeleaf 표현식으로 바꾼다. | 안종범, 황상옥 |
| 매물 도메인 | `property/domain/Property.java`, `PropertyImage.java`, `PropertyType.java`, `DealType.java` | 신규 | 안종범 | `properties.json` 필드를 정규화하고 위치, 가격, 면적, 거래유형, 등록자, 게시 상태, 대표사진을 aggregate 규칙에 맞게 설계한다. | 맹준영 |
| 지도/POI 도메인 | `property/domain/Poi.java`, `SchoolZone.java`, `TransitPoint.java`; `property/dto/MapPropertyResponse.java`, `PropertyFilter.java`, `DistanceResponse.java` | 신규 | 안종범 | POI/학군/교통 데이터와 지도에 필요한 경량 DTO를 정의한다. 좌표계, 거리 단위(m), 필터 기본값을 문서화한다. | 이승호 |
| 매물 저장소 | `property/repository/PropertyRepository.java`, `PropertyImageRepository.java`, `PoiRepository.java`, `SchoolZoneRepository.java` | 신규 | 안종범 | 지도 bounding-box, 가격/면적/거래유형 필터, 상세 조회를 구현한다. 전체 4,970건을 매번 브라우저로 보내지 않고 화면 영역/페이지 단위로 조회한다. | 맹준영 |
| 매물 서비스/API | `property/service/PropertyQueryService.java`, `DistanceService.java`; `property/controller/PropertyPageController.java`, `PropertyApiController.java` | 신규 | 안종범 | `GET /properties/map`, `/properties/{id}`, `/api/properties?bounds=&...`, `/api/properties/{id}`, `/api/properties/{id}/nearby`를 구현한다. Haversine 거리 계산과 상세/클러스터용 응답을 분리한다. | 맹준영 |
| 지도 화면 | `templates/property/map.html`, `search.html`; `static/js/map.js`; `static/css/map.css` | 전환 | 안종범 | Naver Maps 키를 환경변수→Model로 안전하게 전달하고, JSON 파일 직접 fetch를 매물/POI API로 교체한다. 지도 이동 debounce, 필터, 클러스터, 상세 패널, POI/학군/거리 표시를 연결한다. | 황상옥 |
| 정적 지도 데이터 | `static/data/properties.json`, `poi_database.json`, 학군/교통 JSON 및 아파트 이미지 | 마이그레이션 | 안종범 | JSON 스키마를 분석해 DB seed/import 입력으로 보존하되 운영 조회 원본은 DB로 일원화한다. 라이선스·출처·중복·깨진 좌표를 점검한다. | 이승호 |
| 관심매물 | `favorite/domain/Favorite.java`, `repository/FavoriteRepository.java`, `service/FavoriteService.java`, `controller/FavoriteController.java` | 신규 | 안종범 | `(member_id, property_id)` unique 규칙, 회원별 추가/삭제/목록 API와 소유권 검사를 구현한다. localStorage 관심목록을 서버 데이터로 교체한다. | 이승호 |
| 관심 화면 | `templates/favorite/favorite.html`; `static/js/favorite.js`; `static/css/favorite.css` | 전환 | 안종범 | 로그인 회원의 관심 매물을 페이징 조회하고 삭제/빈 목록/로그인 만료 상태를 처리한다. | 이승호 |
| 매물 등록 | `property/dto/PropertyCreateRequest.java`, `PropertyImageResponse.java`; `property/service/PropertyCommandService.java` | 신규 | 맹준영 | 4단계 폼을 서버 DTO로 조립하고 필수값, 숫자 범위, 단계 간 일관성, 등록자 권한, 임시저장/DRAFT→PUBLISHED 전이를 검증한다. | 안종범 |
| 파일 업로드 | `property/service/PropertyImageService.java`, `property/storage/FileStorage.java`, `LocalFileStorage.java` | 신규 | 맹준영 | 확장자·MIME·개수·용량·파일명 traversal을 검증하고 UUID 파일명으로 저장한다. DB에는 공개 URL/상대키와 순서만 저장한다. Render의 임시 파일시스템 한계를 README에 명시한다. | 황상옥 |
| 등록 API | `property/controller/PropertyRegistrationController.java` | 신규 | 맹준영 | `GET/POST /properties/register`, `POST /api/properties/drafts`, `POST/DELETE /api/properties/{id}/images`를 제공한다. CSRF와 본인 소유 검사를 적용한다. | 안종범, 이승호 |
| 등록 화면 | `templates/property/register.html`; `static/js/register.js`(신규 또는 기존 스크립트 분리); `static/css/register.css` | 전환 | 맹준영 | 4단계 상태, 서버 임시저장, multipart 업로드, 미리보기 URL 해제, 재진입 복원, 제출 중복 방지를 구현한다. localStorage는 입력 중 보조 캐시에만 사용한다. | 안종범 |
| 고객지원 도메인 | `support/domain/Inquiry.java`, `Notice.java`, `Faq.java`, `InquiryStatus.java` | 신규 | 맹준영 | 문의 상태/작성자/답변, 공지 공개기간, FAQ 순서를 모델링한다. 비회원 문의 허용 여부를 Security 정책과 일치시킨다. | 이승호 |
| 고객지원 계층 | `support/repository/*`, `support/service/SupportService.java`, `support/controller/SupportPageController.java`, `SupportApiController.java`, `support/dto/*` | 신규/검토 | 맹준영 | 현재 `Qna*` 파일을 기능 패키지로 정리하고 문의 등록/내 문의 조회, FAQ/공지 목록 API, 입력 검증과 본인 조회 권한을 구현한다. | 이승호 |
| 고객지원 화면 | `templates/support/guide.html`, `contact.html`, `notice.html`; `static/js/guide.js`, `contact.js`; 관련 CSS | 전환 | 맹준영 | FAQ/공지를 DB 데이터로 출력하고 문의 localStorage 저장을 실제 API 및 서버 임시저장으로 교체한다. 성공/오류/중복 제출 상태를 표시한다. | 황상옥 |
| DB 공통 | `src/main/resources/schema.sql` | 신규 | 맹준영 | members, properties, property_images, favorites, inquiries, notices, faqs, regions, transactions, statistics, recommendations, model_runs 테이블과 PK/FK/unique/index를 MySQL 8/TiDB 공통 SQL로 정의한다. | 전원 |
| DB 공통 | `src/main/resources/data.sql`, `sql/seed/*.sql`, `sql/migration/*.sql` | 신규/검토 | 맹준영 | 개발 최소 seed와 버전별 수동 migration을 분리한다. `sql/sql0813.sql`을 검토해 재실행 가능하고 개인정보가 없는 스크립트로 정리한다. Flyway 의존성은 추가하지 않는다. | 전원 |
| 소개 페이지 | `templates/support/Servise.html`, `team.html`; `static/js/team.js`; `static/css/servise.css`, `team.css` | 전환 | 황상옥 | 파일명 오타는 최종적으로 `service.html`로 정리하고 `/about/service`, `/about/team` 라우팅에 연결한다. 공통 헤더/푸터, 팀 콘텐츠, 실제 서비스 흐름과 링크를 정돈한다. | 전원 |
| 콘텐츠 화면 | `templates/support/live.html`, `live2.html`, `modelhouse.html`, `map.html`; 관련 JS/CSS | 검토/전환 | 황상옥 | 중복/실험 화면을 운영, 보류, 삭제 후보로 분류한다. 유지 화면은 명확한 `/content/**` 경로와 데이터 출처를 갖도록 하고 `support/map.html`과 `property/map.html` 중복을 해소한다. 삭제는 전원 합의 후 별도 PR로 한다. | 안종범 |
| 공통 UI | `templates/fragments/header.html`, `footer.html`, `alerts.html`; `static/css/common.css`; `static/js/common.js`, `auth.js` | 신규/전환 | 황상옥 | 중복 헤더/푸터를 Thymeleaf fragment로 만들고 Bootstrap 5/Flex 반응형 구조를 보존한다. 로그인 여부/권한/CSRF를 Model 기반으로 표현하고 HTML 상대경로를 모두 제거한다. | 전원 |
| 오류 화면 | `templates/error/400.html`, `403.html`, `404.html`, `500.html` | 신규 | 황상옥 | 사용자 메시지, 메인 복귀, 요청 추적용 식별값을 제공하되 stack trace와 비밀값은 노출하지 않는다. | 이승호 |
| 추천 도메인 | `recommendation/domain/Recommendation.java`, `ModelRun.java`; `repository/*`; `service/RecommendationService.java` | 신규 | 황상옥 | Python이 적재한 추천 점수/근거/모델 버전을 읽고 최신 성공 모델만 서비스한다. 결과가 없으면 명시적인 빈 상태를 반환한다. | 안종범 |
| 추천 API/화면 | `recommendation/controller/RecommendationApiController.java`; `templates/ai/chat.html`; `static/js/chat.js`; `static/css/chat.css` | 신규/전환 | 황상옥 | `/api/recommendations`에서 로그인 조건/가격/지역 선호를 받아 추천 결과를 제공한다. 현재 규칙 기반 모의 응답과 HTML 직접 링크를 실제 API/URL로 교체한다. | 안종범, 이승호 |
| 설정 | `src/main/resources/application.properties` | 검토 | 황상옥 | 공통 이름, Thymeleaf, 업로드 한도, 세션 쿠키, 환경변수 placeholder만 둔다. 비밀번호나 실제 호스트를 기록하지 않고 현재 깨진 주석 인코딩을 UTF-8로 정리한다. | 이승호 |
| 설정 | `application-local.properties`, `application-prod.properties`, `application-test.properties` | 신규/검토 | 황상옥 | local은 MySQL 8, prod는 TiDB TLS, test는 별도 테스트 DB를 사용하도록 profile을 분리한다. `PORT`, `DB_*`, API 키, 업로드 경로를 환경변수화한다. | 이승호, 맹준영 |
| RPA 기반 | `rpa/README.md`, `rpa/requirements.txt`, `rpa/.env.example`, `rpa/pyproject.toml` 또는 설정 파일 | 신규 | 황상옥 | Python 3.11 실행법, job 입출력, 환경변수, 데이터 계약, 설치 패키지를 문서화한다. 요구 목록 중 실제 사용하는 패키지만 고정 버전으로 기록한다. | 전원 |
| RPA 공통 | `rpa/src/config.py`, `rpa/src/logging_config.py`, `rpa/src/db.py` 또는 `export.py` | 신규 | 황상옥 | dotenv 설정, 구조화 로그, 실행 ID와 실패 코드를 공통화한다. 승인된 DB 드라이버가 없으면 결과를 JSON/CSV로 원자적 생성하여 Java import 대상으로 전달한다. | 이승호 |
| RPA 매물 수집 | `rpa/src/crawlers/property_crawler.py`, `parsers/property_parser.py`, `jobs/collect_properties.py` | 신규 | 안종범 | robots.txt/이용약관/호출 간격을 준수하는 출처만 requests/BeautifulSoup로 수집하고 재시도·중복 제거·원본 수집 시각을 기록한다. JS 렌더링 사이트를 우회하지 않는다. | 황상옥 |
| RPA 위치 정제 | `rpa/src/processing/property_cleaner.py`, `geo_feature_builder.py`; `rpa/data/reference/*` | 신규 | 안종범 | 주소/단지명/가격/면적/좌표를 정제하고 POI·학교·교통 거리 특성을 만든다. 입력/출력 컬럼과 결측치 정책을 테스트로 고정한다. | 이승호 |
| RPA 시장 수집 | `rpa/src/crawlers/molit_crawler.py`, `jobs/collect_market.py` | 신규 | 이승호 | Java 실시간 호출과 별개로 월별 원본을 배치 수집하고 API rate limit, 재실행, 기간 checkpoint, 중복키를 관리한다. | 황상옥 |
| RPA 분석 | `rpa/src/analysis/market_analyzer.py`, `jobs/analyze_market.py` | 신규 | 이승호 | pandas/numpy로 지역·월별 매매/전세/거래량/변동률을 계산하고 `market_statistics` 계약에 맞춘다. Java 계산 결과와 표본 대조한다. | 황상옥 |
| RPA 시각화 | `rpa/src/visualization/market_charts.py`, `rpa/reports/.gitkeep` | 신규 | 이승호 | matplotlib/seaborn 또는 Plotly 중 화면 목적에 필요한 것만 사용해 검증용 리포트를 생성한다. 웹 운영 차트는 가능하면 JSON API+기존 JS로 그린다. | 황상옥 |
| RPA 등록 데이터 품질 | `rpa/src/quality/property_validator.py`, `jobs/audit_properties.py` | 신규 | 맹준영 | 등록 매물/사진 메타데이터의 누락, 이상 가격·면적, 중복 매물을 탐지하고 관리자 검토용 결과를 만든다. 자동 삭제는 하지 않는다. | 안종범 |
| RPA 문의 분석 | `rpa/src/analysis/inquiry_analyzer.py`, `jobs/analyze_inquiries.py` | 신규 | 맹준영 | 개인정보를 제거한 문의 텍스트의 카테고리·빈도·처리시간 통계를 만든다. 단순 통계부터 시작하며 원문을 보고서에 노출하지 않는다. | 황상옥 |
| AI 특성/학습 | `rpa/src/ml/features.py`, `train.py`, `evaluate.py`, `jobs/train_recommender.py` | 신규 | 황상옥 | 가격/지역/면적/POI 특성을 만들고 scikit-learn 파이프라인으로 학습·검증한다. train/test 분리, seed, 기준 모델 대비 지표, 모델 버전과 데이터 기간을 기록한다. | 안종범 |
| AI 추론 배치 | `rpa/src/ml/predict.py`, `jobs/generate_recommendations.py`; `rpa/artifacts/.gitkeep` | 신규 | 황상옥 | 승인된 최신 모델로 추천 후보를 배치 생성하고 점수와 사람이 읽을 수 있는 근거를 DB/교환 파일에 쓴다. joblib 산출물은 Git에서 제외한다. | 안종범 |
| Python 테스트 | `rpa/tests/test_property_parser.py`, `test_property_cleaner.py`, fixtures | 신규 | 안종범 | 수집 HTML fixture, 잘못된 좌표/가격, 중복 레코드 케이스를 검증하고 외부 사이트를 테스트 중 직접 호출하지 않는다. | 황상옥 |
| Python 테스트 | `rpa/tests/test_market_analyzer.py`, `test_molit_crawler.py`, fixtures | 신규 | 이승호 | API 오류/빈 응답/페이지네이션과 집계 공식의 고정 표본을 검증한다. | 황상옥 |
| Python 테스트 | `rpa/tests/test_property_validator.py`, `test_inquiry_analyzer.py` | 신규 | 맹준영 | 이상치 경계와 개인정보 제거를 검증한다. 실제 사용자 데이터를 fixture로 넣지 않는다. | 황상옥 |
| Python 테스트 | `rpa/tests/test_features.py`, `test_train.py`, `test_predict.py` | 신규 | 황상옥 | 데이터 누수, 컬럼 불일치, 재현 가능한 seed, 모델 미존재/버전 불일치와 추천 출력 스키마를 검증한다. | 안종범 |
| Java 테스트 | `src/test/java/.../property/*`, `favorite/*` | 신규 | 안종범 | 지도 필터, 상세, 거리, 관심매물 소유권 및 repository 통합 테스트를 담당한다. | 이승호 |
| Java 테스트 | `src/test/java/.../member/*`, `market/*`, `config/SecurityConfigTest.java` | 신규 | 이승호 | 가입 중복/암호화, 인증·인가·CSRF, OpenAPI parser, 시장 집계/API 계약을 테스트한다. | 황상옥 |
| Java 테스트 | `src/test/java/.../property/registration/*`, `support/*` | 신규 | 맹준영 | 등록 단계 검증, 파일 위장/용량/소유권, 문의 권한과 FAQ/공지 조회를 테스트한다. | 이승호 |
| Java 테스트 | `src/test/java/.../common/*`, `recommendation/*`, 화면 smoke test | 신규 | 황상옥 | 주요 페이지 200/redirect, 공통 오류 응답, 추천 최신 버전/빈 결과, profile 설정을 테스트한다. | 전원 |
| 컨테이너 | `Dockerfile` | 검토 | 황상옥 | Gradle multi-stage build와 Java 21 런타임, non-root 사용자, `PORT`, JVM 메모리 제한, 단일 실행 JAR을 구성한다. | 이승호 |
| 컨테이너 | `compose.yaml` | 신규 | 황상옥 | 로컬 Spring Boot+MySQL 8를 healthcheck와 named volume으로 구성한다. `.env` 비밀값을 이미지에 COPY하지 않는다. | 맹준영 |
| RPA 컨테이너 | `rpa/Dockerfile` | 신규 | 황상옥 | Python 3.11 slim, 고정 requirements, non-root 실행, job별 command를 제공한다. 브라우저 자동화 패키지는 요구 범위 밖이므로 넣지 않는다. | 전원 |
| CI | `.github/workflows/ci.yml` | 신규 | 황상옥 | PR/push에서 Java 21 Gradle test, Python 3.11 test/compile 검사, dependency cache, Docker build 검증을 실행한다. Secret을 fork PR에 노출하지 않는다. | 전원 |
| 배포 | `.github/workflows/deploy.yml` | 신규 | 황상옥 | main 보호 브랜치의 CI 성공 뒤 Render Deploy Hook을 호출한다. 환경별 승인과 동시 배포 취소를 설정한다. | 전원 |
| 배포 | `render.yaml` | 신규 | 황상옥 | Spring Web Service, TiDB 환경변수, 필요 시 Python Cron Job을 선언한다. persistent disk 또는 외부 객체 저장소가 확정되지 않으면 사진 업로드를 운영 완료로 표시하지 않는다. | 맹준영 |
| 문서 | `docs/api-contract.md` | 신규 | 이승호 | 화면이 사용하는 페이지 URL과 회원/시장 API 요청·응답·오류 예제를 기록하고 변경 시 프런트 담당 검토를 받는다. | 전원 |
| 문서 | `docs/database.md` | 신규 | 맹준영 | ERD, 컬럼/인덱스, migration 순서, MySQL/TiDB 차이, 백업/복구 절차를 기록한다. | 전원 |
| 문서 | `docs/rpa-data-contract.md`, `docs/model-card.md` | 신규 | 황상옥 | Java↔Python 테이블/파일 스키마, timezone/단위/null 규칙과 모델 목적·지표·한계·재학습 기준을 기록한다. | 안종범, 이승호 |
| 문서 | `docs/map-data-source.md` | 신규 | 안종범 | 매물/POI/학군/교통 출처, 라이선스, 갱신주기, 좌표계, 거리 계산, 정제 규칙을 기록한다. | 황상옥 |

## 5. 담당자별 책임 요약

**안종범 — 지도/매물 조회/관심매물/공간 특성**  
기존 지도와 데이터 가공 경험을 이어 매물 조회 aggregate, 지도 범위 검색, 필터, POI·학군·교통·거리, 관심매물, 매물 수집·정제 RPA를 맡는다. 맹준영의 매물 등록 결과가 즉시 지도 조회에 나타나도록 동일 `Property` 계약을 공동 검토한다.

**이승호 — 메인/회원·보안/시장동향/OpenAPI**  
메인 화면, 회원가입·로그인, Spring Security, 국토교통부 API, 시장 데이터 저장·집계·차트와 시장 RPA를 맡는다. 모든 팀원이 쓰는 인증 정책과 API 응답 계약의 기준을 관리한다.

**맹준영 — 매물 등록/파일/고객센터/DB 스키마**  
4단계 등록·임시저장·사진 업로드, 문의·FAQ·공지, 데이터 품질 작업과 전체 DB 스키마를 맡는다. 안종범의 조회 모델, 이승호의 회원 FK, 황상옥의 추천/배포 테이블 요구를 받아 migration 순서를 관리한다.

**황상옥 — 공통 Thymeleaf/소개/추천 AI/인프라**  
공통 레이아웃과 서비스·팀 소개, 예외 처리, Python 공통 실행 환경, 추천 모델, Docker·GitHub Actions·Render를 맡는다. 각 기능을 대신 구현하는 역할이 아니라 공통 규약과 실제 배포 가능 상태를 책임진다.

## 6. 화면과 URL 전환 규칙

현재 HTML의 `../../templates/member/login.html`, `../../static/css/common.css` 같은 파일 상대경로는 서버에서 올바른 애플리케이션 URL이 아니다. 전환할 때 아래처럼 통일한다.

```html
<a th:href="@{/login}">로그인</a>
<link rel="stylesheet" th:href="@{/css/common.css}">
<script th:src="@{/js/common.js}" defer></script>
<img th:src="@{/images/logo.png}" alt="집찾GO">
```

권장 페이지 URL은 `/`, `/login`, `/members/join`, `/properties/map`, `/properties/{id}`, `/properties/register`, `/favorites`, `/market`, `/market/{detail}`, `/support/guide`, `/support/contact`, `/support/notices`, `/about/service`, `/about/team`, `/ai/chat`이다. 파일명이 URL에 드러나지 않도록 한다.

## 7. 데이터베이스 최소 모델

최소 테이블은 `members`, `properties`, `property_images`, `favorites`, `pois`, `school_zones`, `transit_points`, `market_transactions`, `market_statistics`, `inquiries`, `notices`, `faqs`, `model_runs`, `recommendations`이다.

- 모든 시간은 DB에는 UTC로 저장하고 화면에서 Asia/Seoul로 표시한다.
- 가격 단위는 컬럼명 또는 문서에서 원/만원 중 하나로 고정한다. 소수 계산에는 Java `BigDecimal`을 사용한다.
- 위도/경도는 충분한 precision의 `DECIMAL`로 저장한다.
- Data JDBC aggregate 경계를 지켜 다른 aggregate는 객체 참조 대신 ID로 연결한다.
- 운영에서 `schema.sql` 자동 초기화에 의존하지 않는다. migration SQL을 버전 순서대로 검토 후 적용한다.
- TiDB가 MySQL 문법을 대부분 지원하더라도 FK, auto increment, transaction/locking 동작 차이는 배포 전에 실제 TiDB에서 통합 테스트한다.

## 8. 보안 및 운영 필수 조건

- 회원 비밀번호는 평문/복호화 가능 형태로 저장하지 않는다.
- 변경 요청은 CSRF를 유지하고, API라고 해서 일괄 disable하지 않는다.
- 매물 수정·사진 삭제·문의 조회·관심목록은 항상 서버에서 소유권을 검사한다.
- 업로드는 파일 내용 유형, 크기, 개수, 확장자와 저장 경로를 검증한다.
- 외부 API 키, TiDB CA/접속정보, Naver Maps 키 제한 설정을 Secret으로 관리한다.
- 로그에 비밀번호, 세션 ID, API 키, 문의 원문과 개인정보를 남기지 않는다.
- 크롤링은 공개 접근 가능 여부, robots.txt, 이용약관, 저작권, 개인정보와 호출 제한을 먼저 확인한다.
- Render의 기본 파일시스템은 영속 업로드 저장소로 가정하지 않는다. 운영 사진 기능 전에는 persistent disk 또는 별도 객체 저장소 결정을 완료한다.

## 9. 권장 구현 순서와 합류 기준

1. **공통 계약 확정:** URL, DB 스키마, 인증 정책, Java↔Python 데이터 계약을 먼저 PR로 합의한다.
2. **세로 기능 1차:** 각 담당자가 자신의 화면 하나를 Controller→Service→Repository→DB까지 끝까지 연결한다.
3. **정적 데이터 이관:** 지도 JSON과 seed 데이터를 DB로 이관하고 브라우저 직접 JSON 조회를 제거한다.
4. **RPA 배치 연결:** 수집→정제→집계/학습→DB 적재를 작은 표본으로 검증한다.
5. **보안·통합:** CSRF, 권한, 소유권, 파일 업로드, 외부 API 장애와 빈 데이터 상태를 합동 점검한다.
6. **배포:** CI 전체 통과 후 Docker로 로컬 검증하고 Render+TiDB staging에서 smoke test한 뒤 운영 배포한다.

각 작업의 완료 조건은 “파일 생성”이 아니라 다음 네 가지를 모두 만족하는 것이다.

- 담당 화면에서 실제 DB/API 데이터가 보인다.
- 정상·빈 값·잘못된 입력·권한 없음·외부 장애가 처리된다.
- 단위/통합 테스트와 실행 방법이 함께 커밋된다.
- 연동 담당자가 API 또는 데이터 계약을 확인하고 PR을 승인한다.

## 10. 브랜치와 충돌 방지 규칙

- 브랜치는 `feature/이름-기능` 형식으로 짧게 유지한다.
- 한 기능의 domain/controller/service/repository/template/js/test는 가능한 한 같은 PR에 넣는다.
- `build.gradle`, `SecurityConfig`, `schema.sql`, 공통 fragment, 공통 응답 DTO는 담당자 승인 없이 직접 수정하지 않는다.
- API 변경은 먼저 `docs/api-contract.md`, RPA 스키마 변경은 `docs/rpa-data-contract.md`를 수정한다.
- 큰 공통 파일을 네 명이 동시에 편집하지 말고, 표의 주 담당자가 변경을 모아 반영한다.
- PR 체크 항목은 빌드, 테스트, 비밀값 유출, 상대 HTML 경로 잔존, localStorage 모의 데이터 잔존, 모바일 레이아웃 회귀다.

이 분담은 네 명 모두가 Java 백엔드, 데이터/RPA, 테스트와 문서에 참여하도록 구성하되, 기존 프런트 담당 영역의 도메인 지식을 그대로 이어받도록 설계했다.
