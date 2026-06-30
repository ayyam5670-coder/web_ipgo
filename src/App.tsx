import { useState } from 'react';
import './App.css';
// 블록(컴포넌트)들 불러오기
import Sidebar from './Sidebar';
import IpgoRegister from './IpgoRegister';
import IpgoHistory from './IpgoHistory';
import OrdrHistory from './OrdrHistory';
import logoImg from '../src/images/SHTECH_logo.png';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>('');
  const [activePage, setActivePage] = useState<string>('register');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { alert('아이디를 입력해주세요.'); return; }
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserId('');
    setActivePage('register');
  };

  // 로그인 전 화면
  if (!isLoggedIn) {
    return (
      <div id="loginWrapper">
        <div className="login-box">
          <h2>협력사 포탈 로그인 (React)</h2>
          <form onSubmit={handleLogin}>
            <input 
              type="text" 
              className="login-input" 
              placeholder="협력사 코드 (ID)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
            <input type="password" className="login-input" placeholder="비밀번호" />
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

      {/* 사이드바 블록 배치 (Props 전달) */}
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
          {/* 로그아웃 등 우측 버튼 영역 */}
          <div style={{ width: '24px' }}></div>
        </div>

        <div className="content-body">
          {/* 메뉴 블록 추가 */}
          {activePage === 'register' && <IpgoRegister setActivePage={setActivePage} />}
          {activePage === 'history' && <IpgoHistory />}
          {activePage === 'orderHistory' && <OrdrHistory />}
        </div>
      </div>
    </div>
  );
}