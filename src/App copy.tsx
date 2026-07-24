import { useState, useEffect } from 'react';
// import axios from 'axios';
import './App.css';
import Sidebar from './Sidebar';
import IpgoRegister from './IpgoRegister';
import IpgoHistory from './IpgoHistory';
import OrdrHistory from './OrdrHistory';
import { authApi } from '../src/api/axiosInstances';
import logoImg from '../src/images/SHTECH_logo.png';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>('');
  const [password, setPassword] = useState<string>(''); // 비밀번호 State 추가
  const [activePage, setActivePage] = useState<string>('register');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // 컴포넌트 마운트 시 세션 정보 확인 (새로고침 시에도 유지)
  useEffect(() => {
    const savedUserCode = sessionStorage.getItem('userCode');
    if (savedUserCode) {
      setUserId(savedUserCode);
      setIsLoggedIn(true);
    }
  }, []);

  // 실제 로그인 연동 함수
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password) {
      alert('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      const response = await authApi.post('/login', {
      // const response = await axios.post('/api/auth/login', {
        user_code: userId,
        password: password,
      });

      if (response.data.success) {
        const userCode = response.data.user_code;
        sessionStorage.setItem('userCode', userCode); // 세션 저장
        setIsLoggedIn(true);
        setPassword(''); // 비밀번호 필드 초기화
      } else {
        alert(response.data.message || '로그인 정보가 일치하지 않습니다.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errMsg = error.response?.data?.detail || '로그인 중 오류가 발생했습니다.';
      alert(errMsg);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('userCode'); // 세션 삭제
    setIsLoggedIn(false);
    setUserId('');
    setPassword('');
    setActivePage('register');
  };

  // 로그인 전 화면
  if (!isLoggedIn) {
    return (
      <div id="loginWrapper">
        <div className="login-box">
          <h2>협력사 포탈 로그인</h2>
          <form onSubmit={handleLogin}>
            <input 
              type="text" 
              className="login-input" 
              placeholder="협력사 코드 (ID)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
            <input 
              type="password" 
              className="login-input" 
              placeholder="비밀번호" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="btn-login">로그인 시스템 접속</button>
          </form>
        </div>
      </div>
    );
  }

  // 로그인 후 메인 화면
  return (
    <div id="mainContainer">
      {isSidebarOpen && <div id="mobileOverlay" onClick={() => setIsSidebarOpen(false)}></div>}

      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        handleLogout={handleLogout}
      />

      <div className="content">
        <div className="mobile-header">
          <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>☰</button>
          <div className="mobile-title-wrap" style={{ fontWeight: 'bold', color: '#1e3d59', fontSize: '16px' }}>
            <img src={logoImg} alt="로고" className="mobile-logo-img" />
            <span className="sidebar-title">SH테크 자재관리 포탈</span>
          </div>
          <div style={{ width: '24px' }}></div>
        </div>

        <div className="content-body">
          {activePage === 'register' && <IpgoRegister setActivePage={setActivePage} />}
          {activePage === 'history' && <IpgoHistory />}
          {activePage === 'orderHistory' && <OrdrHistory />}
        </div>
      </div>
    </div>
  );
}