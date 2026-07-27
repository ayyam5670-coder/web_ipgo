# 📦 B2B 가입고 관리 시스템 (Gaipgo Project)

> MES와 연동하여 외부 협력사에서 사용하기 위한 B2B 가입고 웹 프로그램입니다.  
> React + TypeScript 프론트엔드와 FastAPI 백엔드로 구성된 프로젝트입니다.

<br />

| 항목 | 내용 |
| 웹 가입고 화면 | MES와 연동되어 외부에서 등록, 조회 할 수 있는 가입고 화면입니다. |
| **개발자** | 황지원 (개발팀) |
| **개발 기간** | 2026.07 (약 7일 소요) |
| **최종 버전** | v1.0.0 |

## 🛠 Tech Stack

### Frontend
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

### Backend & Database
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![MSSQL](https://img.shields.io/badge/Microsoft_SQL_Server-CC292B?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)

### Infrastructure & Operations
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Uvicorn](https://img.shields.io/badge/Uvicorn-499848?style=for-the-badge&logo=python&logoColor=white)

<br />

## 📁 Repository Structure

```text
gaipgo_project/
├── server/          # FastAPI 백엔드
│   ├── ipgo.py      # Main API & DB Connection Logic
│   ├── .env.example # 환경 변수 템플릿
│   └── requirements.txt
└── web_ipgo/        # React + TypeScript 프론트엔드
    ├── src/
    └── package.json
