import React, { useState, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeAlpine } from 'ag-grid-community'; 
import type { ColDef, CellClickedEvent } from 'ag-grid-community';

// 최신 Alpine 테마 기반 콤팩트 스타일 설정 (기존 화면들과 통일)
const myCompactTheme = themeAlpine.withParams({
  headerHeight: 32,
  rowHeight: 28,
  fontSize: '12px',
});

// 가상의 로그인된 사용자 정보
const loginUser = {
  userId: 'supplier_01',
  compCode: 'C001',
  compName: '(주)한국정밀'
};

// 발주 마스터 데이터 구조
interface OrderMaster {
  poNo: string;         // 발주번호 (주문번호)
  poDate: string;       // 발주일자
  dueDate: string;      // 납기일자
  itemCountText: string;// 품목건수
  totalOrderQty: number;// 총 발주수량
  remainQty: number;    // 미입고수량
  isClosed: '진행중' | '종결'; // 종결여부
}

// 발주 상세 품목 데이터 구조
interface OrderDetail {
  itemCode: string;
  itemName: string;
  orderQty: number;     // 발주수량
  remainQty: number;    // 미입고수량
  unit: string;
}

export default function OrdrHistory() {
  const gridRef = useRef<AgGridReact>(null);
  
  // 기본 날짜 검색 범위 설정 (최근 30일)
  const getPastDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };
  const [startDate, setStartDate] = useState(getPastDate(30));
  const [endDate, setEndDate] = useState(getPastDate(0));
  
  const [searchPoNo, setSearchPoNo] = useState('');
  const [searchStatus, setSearchStatus] = useState('전체');

  // 모달 제어 상태값
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPoNo, setSelectedPoNo] = useState('');
  const [modalRowData, setModalRowData] = useState<OrderDetail[]>([]);

  // 📊 가상의 원본 발주 데이터 (다른 화면의 PO 데이터 포맷과 유기적 연동되도록 매칭)
  const orderMasterData: OrderMaster[] = [
    { poNo: 'PO-20260629-001', poDate: '2026-06-29', dueDate: '2026-07-05', itemCountText: '브레이크 패드 외 2건', totalOrderQty: 7000, remainQty: 5000, isClosed: '진행중' },
    { poNo: 'PO-20260625-004', poDate: '2026-06-25', dueDate: '2026-06-30', itemCountText: '조립용 플랜지 볼트 1건', totalOrderQty: 3000, remainQty: 0, isClosed: '종결' },
    { poNo: 'PO-20260620-002', poDate: '2026-06-20', dueDate: '2026-07-10', itemCountText: '가이드 레일 (우) 외 5건', totalOrderQty: 12000, remainQty: 9000, isClosed: '진행중' },
    { poNo: 'PO-20260515-001', poDate: '2026-05-15', dueDate: '2026-05-25', itemCountText: '에어 실린더 2건', totalOrderQty: 150, remainQty: 0, isClosed: '종결' },
  ];

  // 상세 품목 데이터 맵 (원클릭 시 모달 그리드와 연동)
  const detailDataMap: Record<string, OrderDetail[]> = {
    'PO-20260629-001': [
      { itemCode: 'BRK-FRONT-01', itemName: '브레이크 패드 (앞)', orderQty: 2000, remainQty: 1500, unit: 'EA' },
      { itemCode: 'BOLT-M08-L20', itemName: '조립용 플랜지 볼트', orderQty: 5000, remainQty: 3500, unit: 'EA' }
    ],
    'PO-20260625-004': [
      { itemCode: 'BOLT-M08-L20', itemName: '조립용 플랜지 볼트', orderQty: 3000, remainQty: 0, unit: 'EA' }
    ],
    'PO-20260620-002': [
      { itemCode: 'ITEM-WASH-11', itemName: '평와셔 M12', orderQty: 10000, remainQty: 8000, unit: 'EA' },
      { itemCode: 'ITEM-NUT-005', itemName: '플랜지 너트 M12', orderQty: 2000, remainQty: 1000, unit: 'EA' }
    ],
    'PO-20260515-001': [
      { itemCode: 'CYL-AIR-50', itemName: '에어 실린더 50ST', orderQty: 150, remainQty: 0, unit: 'EA' }
    ]
  };

  // 상단 필터 조건 실시간 반영 필터링 로직
  const filteredRowData = useMemo(() => {
    return orderMasterData.filter(item => {
      const isWithinDate = item.poDate >= startDate && item.poDate <= endDate;
      const matchesPoNo = item.poNo.toLowerCase().includes(searchPoNo.toLowerCase());
      const matchesStatus = searchStatus === '전체' || item.isClosed === searchStatus;
      return isWithinDate && matchesPoNo && matchesStatus;
    });
  }, [startDate, endDate, searchPoNo, searchStatus]);

  // ✨ 품목건수 원클릭 상세조회 팝업 핸들러
  const onCellClicked = (event: CellClickedEvent<OrderMaster>) => {
    if (event.colDef?.field === 'itemCountText' && event.data) {
      const poNo = event.data.poNo;
      setSelectedPoNo(poNo);
      setModalRowData(detailDataMap[poNo] || []);
      setIsModalOpen(true);
    }
  };

  // 메인 발주 현황 그리드 컬럼 정의
  const [columnDefs] = useState<ColDef<OrderMaster>[]>([
    { field: 'poNo', headerName: '발주번호', width: 150, sortable: true, filter: true },
    { field: 'poDate', headerName: '발주일자', width: 110, cellStyle: { textAlign: 'center' }, sortable: true },
    { field: 'dueDate', headerName: '납기일자', width: 110, cellStyle: { textAlign: 'center' } },
    { 
      field: 'itemCountText', 
      headerName: '품목건수', 
      flex: 2, 
      minWidth: 150,
      cellStyle: { 
        color: '#0066cc', 
        textDecoration: 'underline', 
        cursor: 'pointer',
        fontWeight: '500'
      }
    },
    { field: 'totalOrderQty', headerName: '발주수량', width: 100, cellStyle: { textAlign: 'right' }, valueFormatter: p => p.value?.toLocaleString() },
    { field: 'remainQty', headerName: '미입고수량', width: 110, cellStyle: { textAlign: 'right', color: '#f03e3e', fontWeight: 'bold' }, valueFormatter: p => p.value?.toLocaleString() },
    { 
      field: 'isClosed', 
      headerName: '종결여부', 
      width: 100,
      cellStyle: (params) => {
        if (params.value === '종결') return { color: '#868e96', textAlign: 'center', fontWeight: 'bold' };
        return { color: '#2b8a3e', textAlign: 'center', fontWeight: 'bold' }; // 진행중
      }
    }
  ]);

  // 상세 모달 그리드 컬럼 정의
  const [modalColumnDefs] = useState<ColDef<OrderDetail>[]>([
    { field: 'itemCode', headerName: '품번', width: 130 },
    { field: 'itemName', headerName: '품명', flex: 1, minWidth: 160 },
    { field: 'orderQty', headerName: '발주수량', width: 100, cellStyle: { textAlign: 'right' }, valueFormatter: p => p.value?.toLocaleString() },
    { field: 'remainQty', headerName: '미입고수량', width: 110, cellStyle: { textAlign: 'right', color: '#f03e3e', fontWeight: 'bold' }, valueFormatter: p => p.value?.toLocaleString() },
    { field: 'unit', headerName: '단위', width: 60, cellStyle: { textAlign: 'center' } }
  ]);

  return (
    <div className="page-panel">
      {/* 화면 타이틀 영역 */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>
          발주 내역 현황
        </h2>
        <div style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>
          소속 업체: <span style={{ color: '#2b8a3e', fontWeight: 'bold' }}>{loginUser.compName}</span>
        </div>
      </div>

      {/* 상단 통합 검색 바 */}
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #e9ecef' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>발주일자</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
          <span style={{ fontSize: '13px', color: '#868e96' }}>~</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>발주번호</label>
          <input type="text" placeholder="발주번호 입력..." value={searchPoNo} onChange={(e) => setSearchPoNo(e.target.value)} style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>종결여부</label>
          <select value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)} style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px', backgroundColor: '#fff' }}>
            <option value="전체">전체</option>
            <option value="진행중">진행중</option>
            <option value="종결">종결</option>
          </select>
        </div>
      </div>

      {/* 📊 중앙 메인 발주 내역 그리드 */}
      <div style={{ height: 'calc(100vh - 230px)', width: '100%' }}>
        <div style={{ fontSize: '11px', color: '#868e96', marginBottom: '4px' }}>* '품목건수' 텍스트를 클릭하시면 상세 발주 내역 모달이 열립니다.</div>
        <AgGridReact
          ref={gridRef}
          rowData={filteredRowData}
          columnDefs={columnDefs}
        //   rowSelection={{ mode: 'none' }}
          onCellClicked={onCellClicked} // 원클릭 이벤트 연동
          theme={myCompactTheme}       // 통일된 슬림 테마 스타일 주입
        />
      </div>

      {/* 팝업 모달창 영역 */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-body" style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>발주 상세 품목 명세 [{selectedPoNo}]</h3>
              <button type="button" className="btn-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="modal-content-area" style={{ padding: '15px' }}>
              <div style={{ height: '350px', width: '100%' }}>
                <AgGridReact
                  rowData={modalRowData}
                  columnDefs={modalColumnDefs}
                  theme={myCompactTheme} 
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}