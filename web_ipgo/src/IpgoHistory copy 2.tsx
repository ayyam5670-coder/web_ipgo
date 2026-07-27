import { useState, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellClickedEvent } from 'ag-grid-community';
import { ModuleRegistry, AllCommunityModule, themeAlpine } from 'ag-grid-community';
import { useReactToPrint } from 'react-to-print';
import { IpgoPrintSheet } from '../src/report/IpgoPrint';

ModuleRegistry.registerModules([AllCommunityModule]);

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

// 가입고 내역 메인 그리드용 (statType: 'N' | 'Y' 적용)
interface IpgoHistoryMaster {
  ipgoNo: string;         
  poNo: string;
  regDate: string;
  dueDate: string;
  ipgoDate: string;       
  itemCountText: string;
  statType: 'N' | 'Y'; // 'N': 진행중, 'Y': 종결
}

// 상세 내역 구조 (품목별 statType: 'N' | 'Y' 적용)
interface IpgoHistoryDetail {
  itemCode: string;
  itemName: string;
  orderQty: number;
  needIpgoQty: number;
  currentQty: number;
  unit: string;
  statType: 'N' | 'Y';
}

export default function IpgoHistory() {
  const mainGridRef = useRef<AgGridReact>(null);
  const printComponentRef = useRef<HTMLDivElement>(null);

  // 1. 현재 체크된 품목 데이터를 담아둘 상태 변수
  const [printData, setPrintData] = useState<any[]>([]);

  // 2. react-to-print 훅 (v3 최신 옵션 적용)
  const handlePrintTrigger = useReactToPrint({
    contentRef: printComponentRef, // content 함수 대신 contentRef에 ref 객체 직접 전달
    documentTitle: '가입고_등록_내역서',
  });

  // 3. 인쇄 버튼 클릭 핸들러
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

  const getPastDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getPastDate(30));
  const [endDate, setEndDate] = useState(getPastDate(0));
  
  const [searchPoNo, setSearchPoNo] = useState('');
  const [searchStatus, setSearchStatus] = useState('전체'); // '전체' | 'N' | 'Y'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIpgoNo, setSelectedIpgoNo] = useState('');
  const [modalRowData, setModalRowData] = useState<IpgoHistoryDetail[]>([]);

  // statType 기준 ('N', 'Y') 데이터 반영
  const masterData: IpgoHistoryMaster[] = [
    { ipgoNo: 'IG-20260629-001', poNo: 'PO-20260629-001', regDate: '2026-06-29', dueDate: '2026-06-30', ipgoDate: '2026-06-30', itemCountText: '브레이크 패드 외 1건', statType: 'Y' },
    { ipgoNo: 'IG-20260628-002', poNo: 'PO-20260628-004', regDate: '2026-06-28', dueDate: '2026-07-02', ipgoDate: '-', itemCountText: '조립용 플랜지 볼트 1건', statType: 'N' },
    { ipgoNo: 'IG-20260625-001', poNo: 'PO-20260625-002', regDate: '2026-06-25', dueDate: '2026-06-27', ipgoDate: '2026-06-28', itemCountText: '가이드 레일 (우) 외 3건', statType: 'N' },
  ];

  const detailDataMap: Record<string, IpgoHistoryDetail[]> = {
    'IG-20260629-001': [
      { itemCode: 'BRK-FRONT-01', itemName: '브레이크 패드 (앞)', orderQty: 2000, needIpgoQty: 1500, currentQty: 1500, unit: 'EA', statType: 'Y' },
      { itemCode: 'BOLT-M08-L20', itemName: '조립용 플랜지 볼트', orderQty: 5000, needIpgoQty: 3500, currentQty: 3500, unit: 'EA', statType: 'Y' }
    ],
    'IG-20260628-002': [
      { itemCode: 'BOLT-M08-L20', itemName: '조립용 플랜지 볼트', orderQty: 3000, needIpgoQty: 2000, currentQty: 2000, unit: 'EA', statType: 'N' }
    ],
    'IG-20260625-001': [
      { itemCode: 'ITEM-WASH-11', itemName: '평와셔 M12', orderQty: 1000, needIpgoQty: 1000, currentQty: 1000, unit: 'EA', statType: 'N' }
    ]
  };

  const filteredRowData = useMemo(() => {
    return masterData.filter(item => {
      const isWithinDate = item.regDate >= startDate && item.regDate <= endDate;
      const matchesPoNo = item.poNo.toLowerCase().includes(searchPoNo.toLowerCase());
      const matchesStatus = searchStatus === '전체' || item.statType === searchStatus;
      return isWithinDate && matchesPoNo && matchesStatus;
    });
  }, [startDate, endDate, searchPoNo, searchStatus]);

  // 품목건수 클릭 핸들러
  const onCellClicked = (event: CellClickedEvent<IpgoHistoryMaster>) => {
    if (event.colDef?.field === 'itemCountText' && event.data) {
      const ipgoNo = event.data.ipgoNo;
      setSelectedIpgoNo(ipgoNo);
      setModalRowData(detailDataMap[ipgoNo] || []);
      setIsModalOpen(true);
    }
  };

  // 메인 현황 그리드 컬럼 정의
  const [columnDefs] = useState<ColDef<IpgoHistoryMaster>[]>([
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
    { field: 'ipgoNo', headerName: '가입고번호', width: 150, sortable: true, filter: true },
    { field: 'regDate', headerName: '등록일', width: 110, cellStyle: { textAlign: 'center' } },
    { field: 'dueDate', headerName: '입고예정일', width: 110, cellStyle: { textAlign: 'center' } },
    { field: 'ipgoDate', headerName: '최근입고일', width: 110, cellStyle: { textAlign: 'center' } },
    { 
      field: 'statType', 
      headerName: '진행상태', 
      width: 110,
      valueGetter: (params) => params.data?.statType === 'N' ? '진행중' : '종결',
      cellStyle: (params) => {
        if (params.value === '종결') return { color: '#888', fontWeight: 'bold' };
        return { color: '#2e7d32', fontWeight: 'bold' };
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
    { field: 'unit', headerName: '단위', width: 60, cellStyle: { textAlign: 'center' } },
    { 
      field: 'statType', 
      headerName: '상태', 
      width: 85,
      valueGetter: (params) => params.data?.statType === 'N' ? '진행중' : '종결',
      cellStyle: (params) => {
        if (params.value === '종결') return { color: '#2b8a3e', fontWeight: 'bold', textAlign: 'center' };
        return { color: '#4c6ef5', fontWeight: 'bold', textAlign: 'center' };
      }
    }
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

      {/* 상단 필터바 (statType N / Y 옵션 적용) */}
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #e9ecef' }}>
        <div className="date-filter-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>입고일</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
              style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
          <span style={{ fontSize: '13px', color: '#868e96' }}>~</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} 
              style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>발주번호</label>
          <input type="text" placeholder="발주번호 입력..." value={searchPoNo} onChange={(e) => setSearchPoNo(e.target.value)} style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>진행상태</label>
          <select value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)} style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px', backgroundColor: '#fff' }}>
            <option value="전체">전체</option>
            <option value="N">진행중</option>
            <option value="Y">종결</option>
          </select>
        </div>
      </div>

      {/* 중앙 마스터 내역 그리드 영역 */}
      <div style={{ height: 'calc(100vh - 230px)', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div className="grid-notice-text" style={{ fontSize: '11px', color: '#868e96' }}>
            * '품목건수' 텍스트를 클릭하시면 상세 명세 모달이 열립니다.
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
          rowData={filteredRowData}
          columnDefs={columnDefs}
          onCellClicked={onCellClicked}
          theme={myCompactTheme}
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
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}