from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import ipgo  # 쪼개놓은 라우터 파일 import

app = FastAPI()

# CORS 설정 (리액트가 포트가 달라도 접근할 수 있게 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # 리액트 개발 서버 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 가입고 라우터 ipgo.py에 적힌 모든 주소 서비스
app.include_router(ipgo.ipgo_router)
app.include_router(ipgo.auth_router)