// import React from 'react';
import logoImg from '../src/images/SHTECH_logo.png';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  handleLogout: () => void;
}

export default function Sidebar({ 
  activePage, 
  setActivePage, 
  isSidebarOpen, 
  setIsSidebarOpen, 
  handleLogout 
}: SidebarProps) {
  return (
    <div id="sidebar" className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
      <div className="logo">
        <img src={logoImg} alt="업체 로고" className="sidebar-logo-img" />
        <span className="sidebar-title">SH테크 자재관리 포탈</span>
      </div>
      
      <div className="menu-group">
        <div className="menu-title">📦 가입고 관리</div>
        <div 
          className={`menu-item ${activePage === 'register' ? 'active' : ''}`} 
          onClick={() => { setActivePage('register'); setIsSidebarOpen(false); }}
        >
          <span style={{ marginRight: '10px' }}>📝</span>가입고 등록
        </div>
        
        <div 
          className={`menu-item ${activePage === 'history' ? 'active' : ''}`} 
          onClick={() => { setActivePage('history'); setIsSidebarOpen(false); }}
        >
          <span style={{ marginRight: '10px' }}>📋</span>가입고 내역 현황
        </div>

        <div 
          className={`menu-item ${activePage === 'orderHistory' ? 'active' : ''}`} 
          onClick={() => { setActivePage('orderHistory'); setIsSidebarOpen(false); }}
        >
          <span style={{ marginRight: '10px' }}>📊</span>발주 내역
        </div>
      </div>
      
      <div className="logout-area">
        <button className="btn-logout" onClick={handleLogout}>🔒 로그아웃</button>
      </div>
    </div>
  );
}