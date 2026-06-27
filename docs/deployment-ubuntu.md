# Ubuntu 배포 메모

이 문서는 PosLAB 이력관리 센터를 회사 내부 Ubuntu 서버에서 Docker Compose로 실행하기 위한 최소 절차다.

## 1. 서버 준비

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
```

## 2. 소스 배치

```bash
git clone <repository-url> issue-history-board
cd issue-history-board
cp .env.example .env
nano .env
./scripts/company-run.sh check
```

`.env`에서 반드시 바꿀 값:

```text
POSTGRES_PASSWORD
SECRET_KEY
ADMIN_PASSWORD
CORS_ORIGINS
WEB_PORT
```

`SECRET_KEY`는 긴 임의 문자열로 둔다. `ADMIN_PASSWORD`는 최초 관리자 로그인 비밀번호다. 외부 접속은 `WEB_PORT` 하나만 열고, FastAPI 8000 포트는 Docker 내부 네트워크에서만 사용한다.

## 3. 실행

```bash
./scripts/company-run.sh up
```

기본 접속 주소:

```text
http://<server-ip>:8080
```

상태 확인:

```bash
curl http://127.0.0.1:8080/health
```

운영 스크립트 명령:

```bash
./scripts/company-run.sh env-check # Docker 없이 .env 값만 확인
./scripts/company-run.sh check   # .env와 Docker Compose 구성 확인
./scripts/company-run.sh up      # 빌드 후 백그라운드 실행, /health 응답 대기
./scripts/company-run.sh status  # 컨테이너 상태 확인
./scripts/company-run.sh health  # 현재 웹 /health 응답 확인
./scripts/company-run.sh logs    # 최근 로그 tail
./scripts/company-run.sh backup  # PostgreSQL dump 백업
./scripts/company-run.sh down    # 컨테이너 중지
```

Compose 구성 사전 확인:

```bash
./scripts/company-run.sh check
pnpm check:deployment -- --with-docker
```

`scripts/company-run.sh check`는 Node/pnpm이 없는 Ubuntu 서버에서도 `.env`의 필수 시크릿, 포트, CORS 형식과 `docker compose config`를 확인한다. `up`은 컨테이너를 띄운 뒤 `http://127.0.0.1:<WEB_PORT>/health`가 응답할 때까지 기다리고, 실패하면 최근 `api`/`web` 로그를 보여준다. `pnpm check:deployment`는 개발/CI 환경에서 배포 파일과 필수 프록시/환경 구성을 정적으로 확인한다. `--with-docker` 명령은 Docker가 설치된 서버에서 `docker compose config`까지 확인한다.

GitHub Actions 워크플로 파일은 현재 `main`에 포함되어 있지 않다. 저장소 push 토큰에 `workflow` scope를 추가한 뒤 `.github/workflows`를 커밋하면 같은 검증 묶음을 push, pull request, 수동 실행에서 자동화할 수 있다. 그 전까지는 아래 명령을 로컬 또는 회사 서버에서 직접 실행한다.

GitHub Pages는 `gh-pages` 브랜치 배포 기준으로 운영한다. `/Issue-history-board/` 정적 데모를 갱신한 뒤에는 `pnpm test:e2e:pages:live:current`를 실행해 공개 URL이 방금 만든 asset을 서빙하는지 확인한다. Actions 기반 Pages 배포로 전환하려면 workflow 파일을 커밋하고 저장소 Pages 설정을 GitHub Actions 배포로 맞춘다.

## 4. 최초 운영 흐름

1. `.env`의 `ADMIN_USERNAME` / `ADMIN_PASSWORD`로 로그인한다.
2. 일반 사용자는 로그인 화면의 `회원가입` 탭에서 이름, 이메일, 비밀번호를 입력한다.
3. 관리자는 `사용자 권한` 화면의 `회원가입 신청` 목록에서 신청을 승인한다.
4. 승인된 사용자는 가입 때 입력한 이메일과 비밀번호로 로그인한다.
5. 사용자 행에서 역할을 `viewer`, `editor`, `admin` 중 하나로 바꾼다.
6. 퇴사, 부서 이동, 임시 차단이 필요하면 사용자 행의 활성 체크를 끈다.
7. 비밀번호를 잊은 사용자는 새 비밀번호를 입력하고 `재설정`을 누른다.
8. 서버 DB가 비어 있으면 빈 보드로 시작한다. 운영 데이터는 관리자 `분류 관리`에서 대분류와 하위 주제를 추가하거나, 기존 JSON 백업을 가져와 채운다.
9. 마지막 활성 관리자 계정은 비활성화하거나 권한을 낮출 수 없도록 API에서 차단한다.
10. 관리자 `분류 관리`에서 대분류와 하위 주제명을 수정한다.
11. 관리자 `데이터 관리`에서 JSON/Excel 내보내기와 가져오기를 확인한다.
12. 관리자 `담당 정보 관리`에서 이슈명, 업무 라벨, 세부 항목명, 대표 단계, 담당자, 담당부서, 유관부서를 수정한다.
13. 관리자 `옵션 관리`에서 세부 단계/유형 표시명, 후보 순서/숨김, 새 이슈 업무 라벨 후보의 추가, 삭제, 순서를 관리한다.

역할 기준:

```text
viewer: 조회 전용
editor: 이력 추가/수정 및 보드 데이터 저장
admin: editor 권한 + 사용자 관리
```

## 5. 백업

PostgreSQL 볼륨을 백업하거나 앱 관리자 화면의 JSON 내보내기를 사용한다. 운영 중 빠른 앱 단위 복원은 JSON 내보내기/가져오기를 우선 사용한다.

```bash
./scripts/company-run.sh backup
```

## 6. 업데이트

```bash
git pull
./scripts/company-run.sh up
```

업데이트 전에는 JSON 내보내기 또는 PostgreSQL 백업을 남긴다.

## 7. 개발/검증 명령

빠른 로컬 검증:

```bash
pnpm verify:static
```

브라우저까지 포함한 전체 검증:

```bash
pnpm verify:all
```

프론트 검증:

```bash
pnpm test
pnpm test:backend
pnpm build
pnpm check:deployment
pnpm check:env:example
pnpm check:shell
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:e2e:pages
pnpm test:e2e:pages:live
```

백엔드 API 검증:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements-dev.txt
pnpm test:backend
```

서버 연결 E2E 검증:

```bash
pnpm test:e2e:server
```

`pnpm test:e2e`는 브라우저에서 관리자 카드, 보고서 필터와 보고서 양식, 모바일 관리자 화면, Excel/Word 다운로드 파일 내용, JSON/Excel 데이터 내보내기, 관리자 옵션 표시명이 반영된 Excel 가져오기, JSON 데이터 가져오기 반영을 확인한다. `pnpm test:e2e:pages`는 GitHub Pages용 `/Issue-history-board/` base path 정적 빌드에서 fallback 시연 데이터가 데스크톱/모바일 모두에 표시되는지 확인한다. `pnpm test:e2e:pages:live`는 공개 GitHub Pages URL이 실제로 fallback 시연 데이터를 렌더링하는지 확인한다. 배포 직후 최신 로컬 `build:pages` asset까지 일치시켜야 하면 `pnpm test:e2e:pages:live:current`를 실행한다. `backend.tests.test_api`는 임시 SQLite DB로 FastAPI 앱을 띄워 로그인, 회원가입 접수/관리자 조회/승인 후 계정 생성, 역할별 접근 제어, 보드 저장/조회, 관리자 사용자 생성/수정을 실제 HTTP 요청으로 확인한다. `pnpm test:e2e:server`는 FastAPI와 Vite를 함께 띄운 뒤 데스크톱/모바일 브라우저에서 POSLAB 형식 로그인/회원가입 탭, 관리자/편집자/조회자 로그인, 권한별 메뉴 노출, 관리자 UI 사용자 생성, 회원가입 신청 목록 확인/승인/승인 계정 로그인, 관리자 분류/이슈명/업무 라벨/세부 항목/대표 단계/담당 정보 저장 후 재접속 유지, 관리자 옵션 표시명/순서/숨김 저장 후 이력 추가 화면 반영, 모바일 권한 변경/비밀번호 재설정/재로그인을 확인한다. 운영 실행은 `docker compose`의 PostgreSQL을 사용한다.

로컬 E2E 스크립트는 `scripts/run-playwright-with-ports.mjs`를 통해 빈 loopback 포트를 자동 선택한다. OS 임시 포트 할당이 가능한 환경에서는 그 값을 우선 쓰고, 제한된 환경에서는 `42000-60999` 범위에서 재시도한다. 병렬 Codex 스레드나 다른 개발 서버와 충돌하면 `E2E_WEB_PORT`, `E2E_PAGES_PORT`, `E2E_SERVER_API_PORT`, `E2E_SERVER_WEB_PORT`로 명시 포트를 지정한다.

CI에서 실행되는 전체 검증 순서:

```bash
pnpm test:backend
pnpm check:shell
pnpm test
pnpm build
pnpm check:deployment -- --with-docker
pnpm check:env:example
pnpm test:e2e
pnpm test:e2e:pages
pnpm test:e2e:pages:live
pnpm test:e2e:server
```
