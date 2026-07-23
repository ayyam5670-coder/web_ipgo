/*import React, { useState, useMemo, useRef } from 'react';*/
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import { themeAlpine } from 'ag-grid-community'; 
import type { ColDef, CellClickedEvent } from 'ag-grid-community';

// 최신 Alpine 테마 기반 콤팩트 스타일 설정
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

// 백엔드 API 발주 마스터 데이터 인터페이스
interface OrderMaster {
  ordrNumb: string;    // 발주번호
  ordrDate: string;    // 발주일자
  deryDate: string;    // 납기일자
  itemSummary: string; // 품목요약
  statType: string;    // 진행상태 (Y: 종결, N: 진행중)
}

// 백엔드 API 발주 상세 품목 데이터 인터페이스
interface OrderDetail {
  ordrNumb: string;
  ordrDate: string;
  itemCode: string;
  statType: string;
  atskCode: string;
  itemName: string;
  itemGrup: string;
  ordrQnty: number;    // 발주수량
  apgoQnty: number;    // 총입고수량
  miQnty: number;      // 미입고수량
  prevQnty: number;
  unit: string;        // 단위
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
  const [searchOrdrNo, setSearchOrdrNo] = useState('');
  const [searchStatus, setSearchStatus] = useState('전체'); // '전체' | '진행중' | '종결'

  // 메인 그리드 및 상태값
  const [masterRowData, setMasterRowData] = useState<OrderMaster[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 모달 제어 및 상세 데이터 상태값
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrdrNo, setSelectedOrdrNo] = useState('');
  const [modalRowData, setModalRowData] = useState<OrderDetail[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // ----------------------------------------------------
  // 발주 내역 메인 리스트 조회 (FastAPI 연동)
  // ----------------------------------------------------
  const fetchOrderMasters = useCallback(async () => {
    setIsLoading(true);
    try {
      // 프론트엔드 셀렉트 박스 상태값을 백엔드 DB statType 코드값으로 변환
      let statTypeParam = '';
      if (searchStatus === '진행중') statTypeParam = 'N';
      else if (searchStatus === '종결') statTypeParam = 'Y';

      const response = await axios.get('http://127.0.0.1:8000/api/ipgo/menu/ordrHistory', {
        params: {
          startDate: startDate,
          endDate: endDate,
          searchText: searchOrdrNo,
          statType: statTypeParam
        }
      });
      
      setMasterRowData(response.data);
    } catch (error) {
      console.error("❌ 발주 내역 조회 실패:", error);
      alert("발주 내역을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, searchOrdrNo, searchStatus]);

  // 최초 화면 진입 시 조회 실행
  useEffect(() => {
    fetchOrderMasters();
  }, [startDate, endDate, searchStatus]);

  // ----------------------------------------------------
  // '품목요약' 원클릭 시 상세 품목 조회 및 모달 오픈
  // ----------------------------------------------------
  const onCellClicked = async (event: CellClickedEvent<OrderMaster>) => {
    if (event.colDef?.field === 'itemSummary' && event.data) {
      const ordr_numb = event.data.ordrNumb;
      setSelectedOrdrNo(ordr_numb);
      setIsModalOpen(true);
      setIsModalLoading(true);

      try {
        // 기존 입고 화면에서 사용하던 발주 상세 품목 API 재사용
        const response = await axios.get(`http://127.0.0.1:8000/api/ipgo/ordr/${ordr_numb}/items`);
        setModalRowData(response.data);
      } catch (error) {
        console.error("❌ 발주 상세 품목 조회 실패:", error);
        alert("상세 품목 정보를 불러오지 못했습니다.");
        setModalRowData([]);
      } finally {
        setIsModalLoading(false);
      }
    }
  };

  // ----------------------------------------------------
  // AG-Grid 컬럼 정의
  // ----------------------------------------------------
  // 메인 발주 내역 그리드 컬럼
  const [columnDefs] = useState<ColDef<OrderMaster>[]>([
    { field: 'ordrNumb', headerName: '발주번호', width: 160, sortable: true, filter: true },
    { field: 'ordrDate', headerName: '발주일', width: 110, cellStyle: { textAlign: 'center' }, sortable: true },
    { field: 'deryDate', headerName: '납기일', width: 110, cellStyle: { textAlign: 'center' }, sortable: true },
    { 
      field: 'itemSummary', 
      headerName: '품목요약', 
      flex: 1, 
      minWidth: 200,
      cellStyle: { 
        color: '#0066cc', 
        textDecoration: 'underline', 
        cursor: 'pointer',
        fontWeight: '500'
      }
    },
    { 
      field: 'statType', 
      headerName: '진행상태', 
      width: 100,
      cellStyle: (params) => {
        if (params.value === 'Y' || params.value === '종결') {
          return { color: '#868e96', textAlign: 'center', fontWeight: 'bold' };
        }
        return { color: '#2b8a3e', textAlign: 'center', fontWeight: 'bold' }; // 진행중 (N)
      },
      valueFormatter: (params) => {
        if (params.value === 'Y') return '종결';
        if (params.value === 'N') return '진행중';
        return params.value || '-';
      }
    }
  ]);

  // 상세 모달 그리드 컬럼
  const [modalColumnDefs] = useState<ColDef<OrderDetail>[]>([
    { field: 'atskCode', headerName: '품번', width: 120 },
    { field: 'itemCode', headerName: '품목코드', width: 120 },
    { field: 'itemName', headerName: '품명', flex: 1, minWidth: 160 },
    { 
      field: 'ordrQnty', 
      headerName: '발주수량', 
      width: 100, 
      cellStyle: { textAlign: 'right' }, 
      valueFormatter: p => p.value?.toLocaleString() 
    },
    { 
      field: 'miQnty', 
      headerName: '미입고수량', 
      width: 110, 
      cellStyle: { textAlign: 'right', color: '#f03e3e', fontWeight: 'bold' }, 
      valueFormatter: p => p.value?.toLocaleString() 
    },
    { field: 'unit', headerName: '단위', width: 60, cellStyle: { textAlign: 'center' } },
    {
      field: 'statType',
      headerName: '진행상태',
      width: 100,
      cellStyle: { textAlign: 'center'},
      valueFormatter: (params) => {
        if (params.value === 'N') return '진행중';
        if (params.value === 'Y') return '종결';
        return params.value ;
      },
      cellRenderer: (params: any) => {
        const isComplete = params.value === 'Y';
        return (
          <span style={{ color: isComplete ? '#888' : '#2e7d32', fontWeight: 'bold' }}>
            {isComplete ? '종결' : '진행중'}
          </span>
        );
      }
    }
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
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #e9ecef', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>발주일자</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
          <span style={{ fontSize: '13px', color: '#868e96' }}>~</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>검색어</label>
          <input 
            type="text" 
            placeholder="발주번호 또는 품명 입력..." 
            value={searchOrdrNo} 
            onChange={(e) => setSearchOrdrNo(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && fetchOrderMasters()}
            style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px', width: '180px' }} 
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>진행상태</label>
          <select value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)} style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px', backgroundColor: '#fff' }}>
            <option value="전체">전체</option>
            <option value="진행중">진행중</option>
            <option value="종결">종결</option>
          </select>
        </div>

        <button 
          type="button" 
          onClick={fetchOrderMasters}
          style={{ height: '32px', padding: '0 16px', backgroundColor: '#228be6', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginLeft: 'auto' }}
        >
          {isLoading ? '조회 중...' : '조회'}
        </button>
      </div>

      {/* 중앙 메인 발주 내역 그리드 */}
      <div style={{ height: 'calc(100vh - 230px)', width: '100%' }}>
        <div style={{ fontSize: '11px', color: '#868e96', marginBottom: '4px' }}>* '품목요약' 텍스트를 클릭하시면 상세 발주 내역 모달이 열립니다.</div>
        <AgGridReact
          ref={gridRef}
          rowData={masterRowData}
          columnDefs={columnDefs}
          onCellClicked={onCellClicked}
          theme={myCompactTheme}
          overlayLoadingTemplate={'<span class="ag-overlay-loading-center">데이터를 불러오는 중입니다...</span>'}
          overlayNoRowsTemplate={'<span class="ag-overlay-loading-center">조회된 발주 내역이 없습니다.</span>'}
        />
      </div>

      {/* 팝업 모달창 영역 */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-body" style={{ maxWidth: '850px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #dee2e6' }}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>발주 상세 품목 명세 [{selectedOrdrNo}]</h3>
              <button type="button" className="btn-close" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="modal-content-area" style={{ padding: '15px' }}>
              <div style={{ height: '350px', width: '100%' }}>
                <AgGridReact
                  rowData={modalRowData}
                  columnDefs={modalColumnDefs}
                  theme={myCompactTheme} 
                  loading={isModalLoading}
                  overlayNoRowsTemplate={'<span class="ag-overlay-loading-center">상세 품목 데이터가 없습니다.</span>'}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}