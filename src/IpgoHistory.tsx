import React, { useState, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeAlpine } from 'ag-grid-community'; // 최신 테마 객체
import type { ColDef, CellClickedEvent } from 'ag-grid-community';

const myCompactTheme = themeAlpine.withParams({
  headerHeight: 32,       // 제목행 높이 (기본값은 48대 크기라 대폭 줄임)
  rowHeight: 28,          // 데이터행 높이 (기본값보다 촘촘하게 설정)
  fontSize: '12px',       // 텍스트 크기 조절
});

// 가상의 로그인된 사용자 정보
const loginUser = {
  userId: 'supplier_01',
  compCode: 'C001',
  compName: '(주)한국정밀'
};

// 가입고 내역 메인 그리드용 (마스터 정보)
interface IpgoHistoryMaster {
  ipgoNo: string;         
  poNo: string;
  regDate: string;
  dueDate: string;
  ipgoDate: string;       
  itemCountText: string;
  status: '가입고진행중' | '입고대기중' | '입고완료';
}

// 상세 내역 구조
interface IpgoHistoryDetail {
  itemCode: string;
  itemName: string;
  orderQty: number;
  needIpgoQty: number;
  currentQty: number;
  unit: string;
}

export default function IpgoHistory() {
  const mainGridRef = useRef<AgGridReact>(null);
  
  const getPastDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };
  const [startDate, setStartDate] = useState(getPastDate(30));
  const [endDate, setEndDate] = useState(getPastDate(0));
  
  const [searchPoNo, setSearchPoNo] = useState('');
  const [searchStatus, setSearchStatus] = useState('전체');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIpgoNo, setSelectedIpgoNo] = useState('');
  const [modalRowData, setModalRowData] = useState<IpgoHistoryDetail[]>([]);

  const masterData: IpgoHistoryMaster[] = [
    { ipgoNo: 'IG-20260629-001', poNo: 'PO-20260629-001', regDate: '2026-06-29', dueDate: '2026-06-30', ipgoDate: '2026-06-29', itemCountText: '브레이크 패드 외 1건', status: '입고완료' },
    { ipgoNo: 'IG-20260628-002', poNo: 'PO-20260628-004', regDate: '2026-06-28', dueDate: '2026-07-02', ipgoDate: '-', itemCountText: '조립용 플랜지 볼트 1건', status: '입고대기중' },
    { ipgoNo: 'IG-20260625-001', poNo: 'PO-20260625-002', regDate: '2026-06-25', dueDate: '2026-06-27', ipgoDate: '2026-06-26', itemCountText: '가이드 레일 (우) 외 3건', status: '가입고진행중' },
  ];

  const detailDataMap: Record<string, IpgoHistoryDetail[]> = {
    'IG-20260629-001': [
      { itemCode: 'BRK-FRONT-01', itemName: '브레이크 패드 (앞)', orderQty: 2000, needIpgoQty: 1500, currentQty: 1500, unit: 'EA' },
      { itemCode: 'BOLT-M08-L20', itemName: '조립용 플랜지 볼트', orderQty: 5000, needIpgoQty: 3500, currentQty: 3500, unit: 'EA' }
    ],
    'IG-20260628-002': [
      { itemCode: 'BOLT-M08-L20', itemName: '조립용 플랜지 볼트', orderQty: 3000, needIpgoQty: 2000, currentQty: 2000, unit: 'EA' }
    ],
    'IG-20260625-001': [
      { itemCode: 'ITEM-WASH-11', itemName: '평와셔 M12', orderQty: 1000, needIpgoQty: 1000, currentQty: 1000, unit: 'EA' }
    ]
  };

  const filteredRowData = useMemo(() => {
    return masterData.filter(item => {
      const isWithinDate = item.regDate >= startDate && item.regDate <= endDate;
      const matchesPoNo = item.poNo.toLowerCase().includes(searchPoNo.toLowerCase());
      const matchesStatus = searchStatus === '전체' || item.status === searchStatus;
      return isWithinDate && matchesPoNo && matchesStatus;
    });
  }, [startDate, endDate, searchPoNo, searchStatus]);

  // 품목건수 원클릭 전용 핸들러 함수
  const onCellClicked = (event: CellClickedEvent<IpgoHistoryMaster>) => {
    // 클릭한 필드가 'itemCountText' 일 때만 모달 팝업 수행
    if (event.colDef?.field === 'itemCountText' && event.data) {
      const ipgoNo = event.data.ipgoNo;
      setSelectedIpgoNo(ipgoNo);
      setModalRowData(detailDataMap[ipgoNo] || []);
      setIsModalOpen(true);
    }
  };

  // 메인 현황 그리드 컬럼 정의
  const [columnDefs] = useState<ColDef<IpgoHistoryMaster>[]>([
    { field: 'ipgoNo', headerName: '가입고번호', width: 150, sortable: true, filter: true },
    { field: 'poNo', headerName: '발주번호', width: 150, sortable: true, filter: true },
    { 
      field: 'itemCountText', 
      headerName: '품목건수', 
      flex: 2, 
      minWidth: 120,
      cellStyle: { 
        color: '#0066cc', 
        textDecoration: 'underline', 
        cursor: 'pointer',
        fontWeight: '500'
      }
    },
    { field: 'regDate', headerName: '등록일자', width: 110, cellStyle: { textAlign: 'center' } },
    { field: 'dueDate', headerName: '입고예정일', width: 110, cellStyle: { textAlign: 'center' } },
    { field: 'ipgoDate', headerName: '입고일', width: 110, cellStyle: { textAlign: 'center' } },
    { 
      field: 'status', 
      headerName: '진행상태', 
      width: 110,
      cellStyle: (params) => {
        if (params.value === '입고완료') return { color: '#2b8a3e', fontWeight: 'bold' };
        if (params.value === '입고대기중') return { color: '#fcc419', fontWeight: 'bold' };
        return { color: '#4c6ef5', fontWeight: 'bold' };
      }
    }
  ]);

  // 모달 그리드 컬럼 정의
  const [modalColumnDefs] = useState<ColDef<IpgoHistoryDetail>[]>([
    { field: 'itemCode', headerName: '품번', width: 130 },
    { field: 'itemName', headerName: '품명', flex: 1, minWidth: 150 },
    { field: 'orderQty', headerName: '발주수량', width: 90, cellStyle: { textAlign: 'right' } },
    { field: 'needIpgoQty', headerName: '필요 입고수량', width: 110, cellStyle: { textAlign: 'right', color: '#ff6b6b' } },
    { field: 'currentQty', headerName: '금회 납품수량', width: 110, cellStyle: { textAlign: 'right', fontWeight: 'bold' } },
    { field: 'unit', headerName: '단위', width: 60 }
  ]);

  return (
    <div className="page-panel">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>
          가입고 내역 현황
        </h2>
        <div style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>
          소속 업체: <span style={{ color: '#2b8a3e', fontWeight: 'bold' }}>{loginUser.compName}</span>
        </div>
      </div>

      {/* 상단 필터바 */}
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #e9ecef' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>가입고일</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
          <span style={{ fontSize: '13px', color: '#868e96' }}>~</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>발주번호</label>
          <input type="text" placeholder="발주번호 입력..." value={searchPoNo} onChange={(e) => setSearchPoNo(e.target.value)} style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>진행상태</label>
          <select value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)} style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px', backgroundColor: '#fff' }}>
            <option value="전체">전체</option>
            <option value="가입고진행중">가입고진행중</option>
            <option value="입고대기중">입고대기중</option>
            <option value="입고완료">입고완료</option>
          </select>
        </div>
      </div>

      {/* 중앙 마스터 내역 그리드 영역 */}
      <div style={{ height: 'calc(100vh - 230px)', width: '100%' }}>
        <div style={{ fontSize: '11px', color: '#868e96', marginBottom: '4px' }}>* '품목건수' 텍스트를 클릭하시면 상세 명세 모달이 열립니다.</div>
        <AgGridReact
          ref={mainGridRef}
          rowData={filteredRowData}
          columnDefs={columnDefs}
          rowSelection={{ mode: 'singleRow' }}
          onCellClicked={onCellClicked}
          theme={myCompactTheme}
        />
      </div>

      {/* 상세 품목 목록 모달 팝업 */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-body" style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>가입고 상세 품목 명세 [{selectedIpgoNo}]</h3>
              <button type="button" className="btn-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="modal-content-area" style={{ padding: '15px' }}>
              <div style={{ height: '350px', width: '100%' }}>
                <AgGridReact
                  rowData={modalRowData}
                  columnDefs={modalColumnDefs}
                  theme={themeAlpine}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}