// src/api/axiosInstances.ts
import axios from 'axios';

// 1. 가입고 전용 API (모든 요청에 /api/ipgo 가 자동으로 붙음)
export const ipgoApi = axios.create({
  baseURL: '/api/ipgo',
});

// 2. 인증 전용 API (모든 요청에 /api/auth 가 자동으로 붙음)
export const authApi = axios.create({
  baseURL: '/api/auth',
});

// Interceptor(가로채기)를 써서 세션의 userCode를 모든 요청에 자동으로 실어줄 수도 있음
ipgoApi.interceptors.request.use((config) => {
  const userCode = sessionStorage.getItem('userCode');
  if (userCode) {
    // 예: Query Parameter나 Header에 user_code 자동 추가
    config.params = { 
      ...config.params,
      cust_code: userCode,
     };
  }
  return config;
});