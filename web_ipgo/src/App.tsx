import { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './Sidebar';
import IpgoRegister from './IpgoRegister';
import IpgoHistory from './IpgoHistory';
import OrdrHistory from './OrdrHistory';
import { authApi } from '../src/api/axiosInstances';
import logoImg from '../src/images/SHTECH_logo.png';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [custId, setCustId] = useState<string>('');
  const [custName, setCustName] = useState<string>(''); // 사용자명 State 추가
  const [password, setPassword] = useState<string>('');
  const [activePage, setActivePage] = useState<string>('register');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // 컴포넌트 마운트 시 세션 정보 확인 (새로고침 시에도 유지)
  useEffect(() => {
    const savedCustCode = sessionStorage.getItem('custCode');
    const savedCustName = sessionStorage.getItem('custName'); // 세션에서 custName 읽기

    if (savedCustCode && savedCustName) {
      setCustId(savedCustCode);
      setCustName(savedCustName);
      setIsLoggedIn(true);
    }
  }, []);

  // 실제 로그인 연동 함수
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custId || !password) {
      alert('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      const response = await authApi.post('/login', {
        custCode: custId,
        password: password,
      });

      if (response.data.success) {
        const custCode = response.data.cust_code;
        const fetchedCustName = response.data.cust_name;

        // 세션 저장
        sessionStorage.setItem('custCode', custCode);
        sessionStorage.setItem('custName', fetchedCustName);

        // State 업데이트
        setCustName(fetchedCustName);
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
    // 세션 삭제
    sessionStorage.removeItem('custCode');
    sessionStorage.removeItem('custName');

    setIsLoggedIn(false);
    setCustId('');
    setCustName('');
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
              value={custId}
              onChange={(e) => setCustId(e.target.value)}
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
          {activePage === 'register' && (
            <IpgoRegister 
              setActivePage={setActivePage} 
              custCode={custId} 
              custName={custName} 
            />
          )}
          {activePage === 'history' && (
            <IpgoHistory 
              custCode={custId} 
              custName={custName} 
            />
          )}
          {activePage === 'orderHistory' && (
            <OrdrHistory 
              custCode={custId} 
              custName={custName} 
            />
          )}
        </div>
      </div>
    </div>
  );
}