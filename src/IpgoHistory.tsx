import { useState, useEffect, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellClickedEvent } from 'ag-grid-community';
import { ModuleRegistry, AllCommunityModule, themeAlpine } from 'ag-grid-community';
import { useReactToPrint } from 'react-to-print';
// import axios from 'axios';
import { IpgoPrintSheet } from '../src/report/IpgoPrint';
import { ipgoApi } from '../src/api/axiosInstances';

ModuleRegistry.registerModules([AllCommunityModule]);

const myCompactTheme = themeAlpine.withParams({
  headerHeight: 32,
  rowHeight: 28,
  fontSize: '12px',
});

// 로그인된 사용자 정보
interface IpgoHistoryProps {
  userCode: string;
  userName: string;
}

// 1. 메인 목록 API 응답 구조 (SELECT_GAIP_HISTOTY_MAIN_LIST 매핑)
interface IpgoHistoryMaster {
  ipgoNumb: string;    // 가입고번호
  ipgoDate: string;    // 입고예정일자
  ordrNumb: string;    // 발주번호
  saveDate: string;    // 등록일/저장일
  lastDate: string;    // 최근입고일
  itemSummary: string; // 품목 요약 (품목건수 표시용)
  statType: 'N' | 'Y'; // 'N': 진행중, 'Y': 종결
}

// 2. 모달 상세 목록 API 응답 구조 (SELECT_GAIP_HISTORY_DETL_ITEMS 매핑)
interface IpgoHistoryDetail {
  ipgoNumb: string;
  ipgoDate: string;
  itemCode: string;   // 품번
  itemName: string;   // 품명
  ordrQnty: number;   // 발주수량
  miQnty: number;     // 미입고/필요수량
  gaipQnty: number;   // 금회/가입고 수량
  unit: string;       // 단위
  statType: 'N' | 'Y';
}

export default function IpgoHistory({ userCode, userName }: IpgoHistoryProps) {
  const mainGridRef = useRef<AgGridReact>(null);
  const printComponentRef = useRef<HTMLDivElement>(null);

  // 로딩 상태 및 데이터 상태
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [masterRowData, setMasterRowData] = useState<IpgoHistoryMaster[]>([]);
  const [modalRowData, setModalRowData] = useState<IpgoHistoryDetail[]>([]);

  // 인쇄 데이터 관리
  const [printData, setPrintData] = useState<any[]>([]);

  // react-to-print 설정
  const handlePrintTrigger = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: '가입고_등록_내역서',
  });

  const handlePrintHistory = () => {
    const selectedNodes = mainGridRef.current?.api?.getSelectedNodes();
    const selectedData = selectedNodes?.map((node: any) => node.data) || [];

    if (selectedData.length === 0) {
      alert('인쇄할 가입고 내역을 목록에서 최소 1건 이상 선택해 주세요.');
      return;
    }

    setPrintData(selectedData);

    setTimeout(() => {
      handlePrintTrigger();
    }, 100);
  };

  // 날짜 계산 함수
  const getPastDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getPastDate(30));
  const [endDate, setEndDate] = useState(getPastDate(0));
  const [searchText, setSearchText] = useState('');
  const [searchStatus, setSearchStatus] = useState('전체'); // '전체' | 'N' | 'Y'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIpgoNo, setSelectedIpgoNo] = useState('');

  // API 연동: 메인 마스터 목록 조회
  const fetchMasterList = useCallback(async () => {
    setLoading(true);
    try {
      // 1. 셀렉트 박스 상태값('진행중'|'종결'|'전체')을 백엔드 DB statType 코드값('N'|'Y'|'')으로 변환
      let statTypeParam = '';
      if (searchStatus === '진행중' || searchStatus === 'N') statTypeParam = 'N';
      else if (searchStatus === '종결' || searchStatus === 'Y') statTypeParam = 'Y';

      // 2. 백엔드 API 호출
      const response = await ipgoApi.get('/menu/gaipHistory', {
        params: {
          startDate: startDate,
          endDate: endDate,
          searchText: searchText,
          statType: statTypeParam
        }
      });

      setMasterRowData(response.data);
    } catch (error) {
      console.error("❌ 가입고 내역 조회 실패:", error);
      alert("가입고 내역을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, searchText, searchStatus]);

  // 최초 화면 진입 및 주요 검색 조건 변경 시 데이터 자동 조회
  useEffect(() => {
    fetchMasterList();
  }, [startDate, endDate, searchStatus]);

  // API 연동: 모달 상세 품목 목록 조회
  const fetchDetailItems = async (gaip_numb: string) => {
  setModalLoading(true);
  try {
    const response = await ipgoApi.get(`/gaip/${gaip_numb}/items`);
    setModalRowData(response.data);
  } catch (error) {
    console.error("❌ 가입고 상세 품목 조회 실패:", error);
    alert("가입고 상세 내역을 불러오는 중 오류가 발생했습니다.");
  } finally {
    setModalLoading(false);
  }
};

  // 'itemSummary' (품목건수) 클릭 시 모달 팝업 열기
  const onCellClicked = (event: CellClickedEvent<IpgoHistoryMaster>) => {
    if (event.colDef?.field === 'itemSummary' && event.data) {
      const targetIpgoNo = event.data.ipgoNumb;
      setSelectedIpgoNo(targetIpgoNo);
      setIsModalOpen(true);
      fetchDetailItems(targetIpgoNo);
    }
  };


  // 메인 현황 그리드 컬럼 정의 (DB 쿼리 필드명과 일치)
  const [columnDefs] = useState<ColDef<IpgoHistoryMaster>[]>([
    { field: 'ordrNumb', headerName: '발주번호', width: 150, sortable: true, filter: true },
    {
      field: 'itemSummary',
      headerName: '품목요약',
      flex: 2,
      minWidth: 120,
      cellStyle: {
        color: '#0066cc',
        textDecoration: 'underline',
        cursor: 'pointer',
        fontWeight: '500',
      },
    },
    { field: 'ipgoNumb', headerName: '가입고번호', width: 150, sortable: true, filter: true },
    { field: 'saveDate', headerName: '등록일', width: 110, cellStyle: { textAlign: 'center' } },
    { field: 'ipgoDate', headerName: '입고예정일', width: 110, cellStyle: { textAlign: 'center' } },
    { field: 'lastDate', headerName: '최근입고일', width: 110, cellStyle: { textAlign: 'center' } },
    {
      field: 'statType',
      headerName: '진행상태',
      width: 110,
      valueGetter: (params) => (params.data?.statType === 'N' ? '진행중' : '종결'),
      cellStyle: (params) => {
        if (params.value === '종결') return { color: '#888', fontWeight: 'bold', textAlign: 'center' };
        return { color: '#2e7d32', fontWeight: 'bold', textAlign: 'center' };
      },
    },
  ]);

  // 모달 그리드 컬럼 정의 (DB 쿼리 필드명과 일치)
  const [modalColumnDefs] = useState<ColDef<IpgoHistoryDetail>[]>([
    { field: 'itemCode', headerName: '품번', width: 130 },
    { field: 'itemName', headerName: '품명', flex: 1, minWidth: 150 },
    { field: 'ordrQnty', headerName: '발주수량', width: 90, cellStyle: { textAlign: 'right' } },
    { field: 'miQnty', headerName: '필요 입고수량', width: 110, cellStyle: { textAlign: 'right', color: '#ff6b6b', fontWeight: 'bold' } },
    { field: 'gaipQnty', headerName: '금회 납품수량', width: 110, cellStyle: { textAlign: 'right', fontWeight: 'bold' } },
    { field: 'unit', headerName: '단위', width: 60, cellStyle: { textAlign: 'center' } },
    {
      field: 'statType',
      headerName: '상태',
      width: 85,
      valueGetter: (params) => (params.data?.statType === 'N' ? '진행중' : '종결'),
      cellStyle: (params) => {
        if (params.value === '종결') return { color: '#888', fontWeight: 'bold', textAlign: 'center' };
        return { color: '#2e7d32', fontWeight: 'bold', textAlign: 'center' };
      },
    },
  ]);

  return (
    <div className="page-panel">
      {/* 헤더 영역 */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>
          가입고 내역 현황
        </h2>
        <div style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>
          소속 업체: <span style={{ color: '#2b8a3e', fontWeight: 'bold' }}>{userName}</span>
        </div>
      </div>

      {/* 상단 검색 필터바 */}
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #e9ecef', alignItems: 'center' }}>
        {/* 입고일 범위 */}
        <div className="date-filter-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>입고일</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
              style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
          <span style={{ fontSize: '13px', color: '#868e96' }}>~</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} 
              style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
        </div>

        {/* 통합 검색어 (발주번호, 가입고번호, 품목명) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>검색어</label>
          <input 
            type="text" 
            placeholder="발주번호 / 가입고번호 / 품목명..." 
            value={searchText} 
            onChange={(e) => setSearchText(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && fetchMasterList()}
            style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px', width: '200px' }} 
          />
        </div>

        {/* 진행상태 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>진행상태</label>
          <select value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)} style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px', backgroundColor: '#fff' }}>
            <option value="전체">전체</option>
            <option value="N">진행중</option>
            <option value="Y">종결</option>
          </select>
        </div>

        {/* 조회 버튼 */}
        <button 
          type="button" 
          onClick={fetchMasterList}
          style={{ height: '32px', padding: '0 16px', backgroundColor: '#228be6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', marginLeft: 'auto' }}
        >
          🔍 조회
        </button>
      </div>

      {/* 중앙 마스터 내역 그리드 영역 */}
      <div style={{ height: 'calc(100vh - 230px)', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div className="grid-notice-text" style={{ fontSize: '11px', color: '#868e96' }}>
            * '품목요약' 텍스트를 클릭하시면 상세 명세 모달이 열립니다.
          </div>

          <button
            type="button"
            className="btn-print-action"
            onClick={handlePrintHistory}
          >
            🖨️ <span className="btn-text">입고 내역서 인쇄</span>
          </button>
        </div>

        <AgGridReact
          ref={mainGridRef}
          rowData={masterRowData}
          columnDefs={columnDefs}
          onCellClicked={onCellClicked}
          theme={myCompactTheme}
          loading={loading}
          rowSelection={{ mode: 'multiRow', headerCheckbox: true }}
        />
      </div>
      
      {/* 인쇄용 백그라운드 영역 */}
      <div style={{ display: 'none' }}>
        <IpgoPrintSheet ref={printComponentRef} selectedData={printData} />
      </div>

      {/* 상세 품목 목록 모달 팝업 */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-body" style={{ maxWidth: '850px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
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
                  loading={modalLoading}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}