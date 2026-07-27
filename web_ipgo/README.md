# 📦 B2B 가입고 관리 시스템 (Gaipgo Project)

> 외부 협력사 및 내부 관리를 위한 B2B 가입고 웹 애플리케이션입니다.  
> React 프론트엔드와 FastAPI 백엔드로 구성된 Monorepo 프로젝트입니다.

<br />

## 🛠 Tech Stack

### Frontend
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

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
└── web_ipgo/        # React 프론트엔드
    ├── src/
    └── package.json