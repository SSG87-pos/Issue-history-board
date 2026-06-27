from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import get_settings
from .db import SessionLocal, get_db, init_db
from .models import AccessRequest, BoardSnapshot, ROLE_ADMIN, ROLE_EDITOR, ROLE_VIEWER, User
from .schemas import (
    AccessRequestCreate,
    AccessRequestOut,
    AccessRequestUpdate,
    BoardData,
    LoginRequest,
    LoginResponse,
    UserCreate,
    UserOut,
    UserUpdate,
)
from .security import create_access_token, hash_password, verify_access_token, verify_password

settings = get_settings()
security = HTTPBearer(auto_error=False)
app = FastAPI(title="Issue History Board API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()
    with SessionLocal() as db:
        ensure_initial_data(db)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def require_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="로그인이 필요합니다.")

    try:
        payload = verify_access_token(credentials.credentials, secret_key=settings.secret_key)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="세션이 만료되었거나 올바르지 않습니다.")

    username = str(payload.get("sub", ""))
    user = db.query(User).filter(User.username == username).one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자 권한을 확인할 수 없습니다.")
    return user


def require_editor(current_user: User = Depends(require_user)) -> User:
    if current_user.role not in {ROLE_ADMIN, ROLE_EDITOR}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="편집 권한이 필요합니다.")
    return current_user


def require_admin(current_user: User = Depends(require_user)) -> User:
    if current_user.role != ROLE_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다.")
    return current_user


@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.query(User).filter(User.username == payload.username).one_or_none()
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    token = create_access_token(
        {"sub": user.username, "role": user.role},
        secret_key=settings.secret_key,
        expires_in_seconds=settings.access_token_expires_minutes * 60,
    )
    return LoginResponse(accessToken=token, user=to_user_out(user))


@app.get("/api/auth/me", response_model=UserOut)
def me(current_user: User = Depends(require_user)) -> UserOut:
    return to_user_out(current_user)


@app.post("/api/access-requests", response_model=AccessRequestOut, status_code=status.HTTP_201_CREATED)
def create_access_request(payload: AccessRequestCreate, db: Session = Depends(get_db)) -> AccessRequestOut:
    existing_user = db.query(User).filter(User.username == payload.requestedUsername).one_or_none()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 등록된 아이디입니다.")

    request = AccessRequest(
        requested_username=payload.requestedUsername,
        display_name=payload.displayName,
        department=payload.department,
        email=payload.email,
        password_hash=hash_password(payload.password),
        reason=payload.reason,
        status="pending",
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return to_access_request_out(request)


@app.get("/api/board", response_model=BoardData)
def get_board(
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> BoardData:
    snapshot = get_or_create_board_snapshot(db)
    return snapshot.data


@app.put("/api/board", status_code=status.HTTP_204_NO_CONTENT)
def put_board(
    payload: BoardData,
    current_user: User = Depends(require_editor),
    db: Session = Depends(get_db),
) -> None:
    snapshot = get_or_create_board_snapshot(db)
    snapshot.data = payload
    snapshot.updated_by_user_id = current_user.id
    db.add(snapshot)
    db.commit()


@app.get("/api/admin/users", response_model=list[UserOut])
def list_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[UserOut]:
    users = db.query(User).order_by(User.created_at.asc()).all()
    return [to_user_out(user) for user in users]


@app.get("/api/admin/access-requests", response_model=list[AccessRequestOut])
def list_access_requests(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AccessRequestOut]:
    requests = db.query(AccessRequest).order_by(AccessRequest.created_at.desc()).all()
    return [to_access_request_out(request) for request in requests]


@app.patch("/api/admin/access-requests/{request_id}", response_model=AccessRequestOut)
def update_access_request(
    request_id: str,
    payload: AccessRequestUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AccessRequestOut:
    request = db.query(AccessRequest).filter(AccessRequest.id == request_id).one_or_none()
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="회원가입 신청을 찾을 수 없습니다.")

    if payload.status == "approved" and request.status != "approved":
        existing_user = db.query(User).filter(User.username == request.requested_username).one_or_none()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 등록된 아이디입니다.")
        if not request.password_hash:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="비밀번호가 없는 이전 신청은 승인할 수 없습니다.")
        db.add(
            User(
                username=request.requested_username,
                display_name=request.display_name,
                password_hash=request.password_hash,
                role=ROLE_VIEWER,
                is_active=True,
            )
        )

    request.status = payload.status
    db.add(request)
    db.commit()
    db.refresh(request)
    return to_access_request_out(request)


@app.post("/api/admin/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserOut:
    existing = db.query(User).filter(User.username == payload.username).one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 존재하는 아이디입니다.")

    user = User(
        username=payload.username,
        display_name=payload.displayName,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=payload.isActive,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return to_user_out(user)


@app.patch("/api/admin/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserOut:
    user = db.query(User).filter(User.id == user_id).one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")

    if user.role == ROLE_ADMIN and (
        payload.role in {ROLE_EDITOR, ROLE_VIEWER} or payload.isActive is False
    ):
        active_admin_count = db.query(User).filter(User.role == ROLE_ADMIN, User.is_active.is_(True)).count()
        if active_admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="마지막 활성 관리자 계정은 비활성화하거나 권한을 낮출 수 없습니다.",
            )

    if payload.displayName is not None:
        user.display_name = payload.displayName
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
    if payload.role is not None:
        user.role = payload.role
    if payload.isActive is not None:
        user.is_active = payload.isActive

    db.add(user)
    db.commit()
    db.refresh(user)
    return to_user_out(user)


def ensure_initial_data(db: Session) -> None:
    admin = db.query(User).filter(User.username == settings.admin_username).one_or_none()
    if admin is None:
        db.add(
            User(
                username=settings.admin_username,
                display_name=settings.admin_display_name,
                password_hash=hash_password(settings.admin_password),
                role=ROLE_ADMIN,
                is_active=True,
            )
        )

    get_or_create_board_snapshot(db)
    db.commit()


def get_or_create_board_snapshot(db: Session) -> BoardSnapshot:
    snapshot = db.query(BoardSnapshot).filter(BoardSnapshot.id == 1).one_or_none()
    if snapshot is None:
        snapshot = BoardSnapshot(id=1, data=empty_board_data())
        db.add(snapshot)
        db.flush()
    return snapshot


def empty_board_data() -> BoardData:
    return {
        "categories": [],
        "subtopics": [],
        "issueGroups": [],
        "detailIssues": [],
        "historyEntries": [],
    }


def to_user_out(user: User) -> UserOut:
    role = user.role if user.role in {ROLE_ADMIN, ROLE_EDITOR, ROLE_VIEWER} else ROLE_VIEWER
    return UserOut(
        id=user.id,
        username=user.username,
        displayName=user.display_name,
        role=role,
        isActive=user.is_active,
    )


def to_access_request_out(request: AccessRequest) -> AccessRequestOut:
    status = request.status if request.status in {"pending", "approved", "rejected"} else "pending"
    return AccessRequestOut(
        id=request.id,
        requestedUsername=request.requested_username,
        displayName=request.display_name,
        department=request.department,
        email=request.email,
        reason=request.reason,
        status=status,
        createdAt=request.created_at,
        updatedAt=request.updated_at,
    )
