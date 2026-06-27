# PosLAB 이력관리 센터

연구원 내부 이슈와 날짜별 이력을 관리하는 FastAPI + PostgreSQL 기반 웹 앱입니다. 소수 사용자에게 권한을 부여해 조회, 이력 편집, 관리자 사용자 관리, 보고서 다운로드를 운영할 수 있습니다.

## 빠른 실행

회사 Ubuntu 서버에서는 Docker Compose 실행을 기본으로 합니다.

```bash
cp .env.example .env
# .env에서 POSTGRES_PASSWORD, SECRET_KEY, ADMIN_PASSWORD, CORS_ORIGINS 값을 변경
./scripts/company-run.sh up
```

기본 접속 주소:

```text
http://<server-ip>:8080
```

운영 배포에서는 웹 포트만 외부에 열고 FastAPI 8000 포트는 Docker 내부 네트워크로만 연결합니다.

상세 절차는 [docs/deployment-ubuntu.md](docs/deployment-ubuntu.md)를 확인하세요.

## 주요 기능

- 로그인 및 역할 권한: `viewer`, `editor`, `admin`
- 관리자 사용자 추가, 권한 변경, 비밀번호 재설정, 비활성화
- 대분류, 하위 주제, 이슈명, 업무 라벨, 세부 항목명, 대표 단계, 담당 정보 관리
- 세부 단계/유형 표시명, 후보 순서/숨김, 업무 라벨 후보 추가/삭제/정렬, 이력 추가/상세/보고서/Excel 반영
- 날짜별 이력 추가, 수정, 삭제
- 처리 지연 이슈, 최근 갱신, 검색, 알림 바로가기
- 보고서 필터, 주간 보고/이슈 요약/처리 지연 이슈 양식, Excel/Word 다운로드
- JSON 백업/복원, 앱 생성 `.xlsx` 이력 내보내기/가져오기
- 모바일/태블릿 반응형 화면

## 개발 검증

빠른 로컬 검증:

```bash
pnpm verify:static
```

브라우저까지 포함한 전체 검증:

```bash
pnpm verify:all
```

개별 명령:

```bash
pnpm test
pnpm test:backend
pnpm build
pnpm check:deployment
pnpm check:env:example
pnpm check:shell
pnpm test:e2e
pnpm test:e2e:pages
pnpm test:e2e:pages:live
pnpm test:e2e:server
```

로컬 Playwright 스크립트는 실행할 때 빈 포트를 자동으로 골라 Vite/FastAPI를 띄웁니다. 다른 Codex 스레드와 포트가 겹치면 `E2E_WEB_PORT`, `E2E_PAGES_PORT`, `E2E_SERVER_API_PORT`, `E2E_SERVER_WEB_PORT`로 직접 지정할 수 있습니다.

Docker가 있는 서버에서는 배포 구성까지 확인합니다.

```bash
./scripts/company-run.sh check
pnpm check:deployment -- --with-docker
```

`scripts/company-run.sh`는 Node/pnpm이 없는 Ubuntu 서버에서도 Docker Compose 기반 환경 점검, 실행, health 확인, 상태 확인, 로그 보기, 백업을 처리합니다.
Docker 권한을 잡기 전 `.env` 값만 먼저 확인하려면 `./scripts/company-run.sh env-check`를 실행합니다.

GitHub Pages 배포 직후에는 `pnpm test:e2e:pages:live:current`로 공개 URL이 최신 로컬 `build:pages` asset을 서빙하는지 확인합니다.
`main` 브랜치에 반영되면 GitHub Pages Actions 워크플로가 `/Issue-history-board/` 정적 데모를 빌드, 검증, 배포하고 공개 URL이 최신 asset을 서빙하는지 다시 확인합니다.
