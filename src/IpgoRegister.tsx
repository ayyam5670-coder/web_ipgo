import React, { useState, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ValidationModule, themeAlpine } from 'ag-grid-community'; 
import type { ColDef, RowSelectionOptions } from 'ag-grid-community';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect } from 'react';
import axios from 'axios';

ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);

// 등록 화면용 콤팩트 테마 커스텀 변수 선언
const myCompactTheme = themeAlpine.withParams({
  headerHeight: 32,
  rowHeight: 28,
  fontSize: '12px',
});

const loginUser = {
  userId: 'supplier_01',
  compCode: 'C001',
  compName: '(주)한국정밀'
};

interface IpgoRegisterProps {
  setActivePage: (page: string) => void;
}

interface BomItem {
  checkbox: boolean;
  itemGubn: string;
  itemGrup: string;
  itemCode: string;
  atskCode: string;
  itemName: string;
  orderQty: number;
  prevIpgoQty: number;
  actualIpgoQty: number;
  needIpgoQty: number; 
  currentQty: number;
}

// 전역 변수로 html5QrScanner를 선언하여 스캐너 인스턴스를 관리
let html5QrScanner: any = null;

interface DbItem {
  itemGrup: string;  // 원자재/부자재
  itemGubn: string;  // 품목구분
  itemCode: string;   // 품목코드 (필수)
  atskCode: string;  // 품번
  itemName: string;   // 품명 (필수)
}


export default function IpgoRegister({ setActivePage }: IpgoRegisterProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false); // 카메라 화면 토글 상태
  const [rowData, setRowData] = useState<BomItem[]>([]);
  
  // 품목 추가 모달, DB의 품목 리스트 저장할 상태
  const [dbItemList, setDbItemList] = useState<DbItem[]>([]);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);     // 로딩 상태 관리

  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  
  const [selectedPoNo, setSelectedPoNo] = useState('');

  const getPastDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };
  const [poStartDate, setPoStartDate] = useState(getPastDate(7));
  const [poEndDate, setPoEndDate] = useState(getPastDate(0));
  const [poSearchText, setPoSearchText] = useState('');


  // =================================== 모달창 열릴 때 전체 품목 조회 함수
  const handleOpenProductModal = async () => {
    setIsItemModalOpen(true);
    setIsLoading(true);
    
    try {
      // 파이썬 FastAPI 서버의 전체 품목 조회 주소
      const response = await axios.get('http://127.0.0.1:8000/api/ipgo/items');
      
      // 서버가 준 데이터로 상태 업데이트 -> 모달 그리드에 바인딩됨
      setDbItemList(response.data); // 서버에서 받아온 데이터를 자바스크립트 배열 상태인 response.data로 넘겨주고 setDbItemList 함수 실행하면 dbItemList 배열 변수에 저장
    } catch (error) {
      console.error("전체 품목 조회 실패:", error);
      alert("서버에서 품목 리스트를 가져오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };


  const poData = [
    { poNo: 'PO-20260629-001', compName: '(주)한국정밀', itemSummary: '브레이크 패드 외 2건', poDate: '2026-06-29' },
    { poNo: 'PO-20260625-004', compName: '(주)한국정밀', itemSummary: '조립용 플랜지 볼트 1건', poDate: '2026-06-25' },
    { poNo: 'PO-20260620-002', compName: '삼우정밀', itemSummary: '가이드 레일 (우) 외 5건', poDate: '2026-06-20' },
    { poNo: 'PO-20260515-001', compName: '대성기공', itemSummary: '에어 실린더 2건', poDate: '2026-05-15' },
  ];

  

  const [columnDefs] = useState<ColDef[]>([
    { field: 'itemCode', headerName: '품번', width: 120, sortable: true, filter: true },
    { field: 'itemName', headerName: '품명', flex: 2, minWidth: 120, sortable: true, filter: true },
    { field: 'orderQty', headerName: '발주수량', width: 90, cellStyle: { textAlign: 'right' } },
    { field: 'needIpgoQty', headerName: '필요 입고수량', width: 120, cellStyle: { textAlign: 'right', color: '#ff6b6b', fontWeight: 'bold' } },
    { 
      field: 'currentQty', 
      headerName: '금회 납품수량', 
      flex: 1, 
      minWidth: 120, 
      editable: true, 
      cellEditor: 'agTextCellEditor', 
      cellStyle: { textAlign: 'right', backgroundColor: '#e8f0f7', fontWeight: 'bold' } 
    },
    { field: 'prevIpgoQty', headerName: '이전 가입고 수량', width: 130, cellStyle: { textAlign: 'right' } },
    { field: 'actualIpgoQty', headerName: '실제 입고수량', width: 120, cellStyle: { textAlign: 'right' } },
    { field: 'unit', headerName: '단위', width: 60 }
  ]);

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    cellStyle: { fontSize: '12px', paddingLeft: '8px', paddingRight: '8px' }
  }), []);
  
  const rowSelection = useMemo<RowSelectionOptions>(() => ({
    mode: 'multiRow',
    checkboxes: true,
    headerCheckbox: true
  }), []);
  
  const handleAddItemToGrid = (item: DbItem) => {
    const newRow: BomItem = {
      checkbox: false,
      itemGubn: item.itemGubn || '원자재', // 만약 DB에 gubn이 없으면 임시 텍스트
      itemGrup: item.itemGrup || '',
      itemCode: item.itemCode,
      atskCode: item.atskCode,
      itemName: item.itemName,
      orderQty: 0,
      prevIpgoQty: 0,
      actualIpgoQty: 0,
      needIpgoQty: 0,
      currentQty: 1,
    };
    setRowData(prevRows => [...prevRows, newRow]);
    setIsItemModalOpen(false);
  };

  // 품목 추가 후 가등록 리스트에서 선택된 품목들을 제외시키는 함수
  const handleRemoveItemFromGrid = () => {
    if (!gridRef.current?.api) return;

    // 현재 그리드에 체크 처리된 항목 수집
    const selectedRows = gridRef.current.api.getSelectedRows() as BomItem[];

    if (selectedRows.length === 0) {
      alert('삭제할 품목을 왼쪽 체크박스에서 선택해 주세요.');
      return;
    }

    // 체크된 품목코드(itemCode)를 추출하여 목록에서 필터링
    const selectedItemCodes = selectedRows.map(row => row.itemCode);
    setRowData(prevRows => prevRows.filter(row => !selectedItemCodes.includes(row.itemCode)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('가입고 등록이 완료되었습니다.\n내역 화면으로 이동합니다.'); 
    setActivePage('history');
  };

  const filteredPoData = useMemo(() => {
    return poData.filter(po => {
      const isWithinDate = po.poDate >= poStartDate && po.poDate <= poEndDate;
      const matchesSearch = po.poNo.toLowerCase().includes(poSearchText.toLowerCase());
      return isWithinDate && matchesSearch;
    });
  }, [poStartDate, poEndDate, poSearchText]);

  const handleSelectPo = (poNo: string) => {
    const dummyPoItems: BomItem[] = [
      // { checkbox: false, itemCode: 'BRK-FRONT-01', itemName: '브레이크 패드 (앞)', orderQty: 2000, prevIpgoQty: 500, actualIpgoQty: 500, needIpgoQty: 1500, currentQty: 1500, unit: 'EA' },
      // { checkbox: false, itemCode: 'BOLT-M08-L20', itemName: '조립용 플랜지 볼트', orderQty: 5000, prevIpgoQty: 2000, actualIpgoQty: 1500, needIpgoQty: 3500, currentQty: 3500, unit: 'EA' }
    ];
    setSelectedPoNo(poNo);
    setRowData(dummyPoItems);
    setIsPoModalOpen(false);
  };


  /* ========================== QR/바코드 스캐너 관련 상태 및 함수 start ========================== */
  // 1. QR/바코드 인식 또는 Input 엔터 입력 시 실행될 함수
  const handleScanSubmit = async(code: string) => {
    if (!code.trim()) return;
  
    // console.log(`스캔/입력된 품목코드: ${code}`);

    if (!code.trim()) return;

    try {
      // 파이썬 FastAPI 서버의 개별 품목 조회 주소 찌르기
      const response = await axios.get(`http://127.0.0.1:8000/api/ipgo/items/${code}`);
      const foundItem = response.data;

      if (foundItem) {
        handleAddItemToGrid(foundItem);
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        alert("DB에 등록되지 않은 품목코드입니다.");
      } else {
        alert("서버 통신 오류가 발생했습니다.");
      }
    }
  };

  // 모바일 카메라 스캐너 토글 함수
  const toggleScanner = () => {
    if (!isScannerOpen) {
      setIsScannerOpen(true);
      
      setTimeout(() => {
        // 전역 변수에 스캐너 인스턴스를 할당
        html5QrScanner = new Html5QrcodeScanner(
          "qr-reader", 
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );
        
        html5QrScanner.render(
          (decodedText: string) => {
            handleScanSubmit(decodedText);
            if (html5QrScanner) {
              html5QrScanner.clear().catch((err: any) => console.error("스캐너 해제 실패:", err));
            }
            setIsScannerOpen(false);
          },
          (error: any) => {
            // 매 프레임 발생하는 단순 "QR 없음" 안내 텍스트는 필터링, 진짜 에러만 찍기
            if (error && typeof error === 'string' && error.includes("NotFoundException")) {
              return; // QR을 찾는 중일 때 나오는 흔한 예외는 무시해서 콘솔 청정구역 유지
            }
            
            // 카메라 권한 거부, 하드웨어 충돌 등 치명적인 에러만 콘솔에 기록
            console.warn("스캐너 내부 경고/오류:", error);
          }
        );
      }, 100);

    } else {
      /* [사용자가 직접 X 버튼이나 닫기를 눌렀을 때] 강제로 카메라 스트림을 죽여 메모리 반환 */
      if (html5QrScanner) {
        html5QrScanner.clear()
          .then(() => {
            html5QrScanner = null; // 메모리 참조 해제
            setIsScannerOpen(false);
          })
          .catch((err: any) => {
            console.error("카메라 강제 종료 중 에러:", err);
            setIsScannerOpen(false); // 에러가 나더라도 우선 창은 닫음
          });
      } else {
        setIsScannerOpen(false);
      }
    }
  };

  // 클린업 - 페이지 이탈 시 스캐너 해제 및 메모리 반환
  useEffect(() => {
    return () => {
      if (html5QrScanner) {
        html5QrScanner.clear()
          .then(() => { html5QrScanner = null; })
          .catch((err: any) => console.error("페이지 이탈 시 스캐너 해제 실패:", err));
      }
    };
  }, []);

  /* ========================== QR/바코드 스캐너 관련 상태 및 함수 end ========================== */





  return (
    <div className="page-panel">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>
        <h1 className="section-title">가입고 등록</h1>
        <div style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>
          소속 업체: <span style={{ color: '#2b8a3e', fontWeight: 'bold' }}>{loginUser.compName}</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="form-grid">
          <div className="form-group">
            <label>업체명</label>
            <input type="text" value="(주)한국정밀" readOnly style={{ background: '#f5f5f5', color: '#888' }} />
          </div>
          <div className="form-group">
            <label>발주번호</label>
            <div className="input-with-btn">
              <input type="text" placeholder="검색 버튼을 눌러주세요" value={selectedPoNo} readOnly />
              <button type="button" className="btn-search" onClick={() => setIsPoModalOpen(true)}>
                🔍
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>입고 예정일시</label>
            <input 
              type="datetime-local" 
              defaultValue={new Date().toISOString().slice(0, 16)} 
            />
          </div>
          <div className="form-group"><label>운전자</label><input type="text" placeholder="예: 홍길동" required /></div>
          <div className="form-group"><label>운전자 연락처</label><input type="text" placeholder="예: 010-1234-5678" required /></div>
        </div>
        
        {/* 품목 명세 헤더 및 컨트롤 버튼 조합바 */}
        <div className="grid-control-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="grid-title">
            품목 명세 <span className="pc-only-text">('금회 납품수량'은 클릭하여 수정 가능)</span>
          </span>
          

          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" className="btn-camera-scan" onClick={toggleScanner} >
              {isScannerOpen ? '카메라 닫기' : 'QR/바코드 스캔'}
            </button>
            <button type="button" className="btn-item-delete" onClick={handleRemoveItemFromGrid}>
              선택 삭제
            </button>
            <button type="button" className="btn-add-product" onClick={handleOpenProductModal} >
              품목 추가
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 250, width: '100%', marginBottom: 12 }}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            theme={myCompactTheme} 
            rowSelection={rowSelection}
            singleClickEdit={true}
            stopEditingWhenCellsLoseFocus={true} 
            onCellValueChanged={(params) => console.log('데이터 수정됨:', params.data)}
            onGridReady={(params) => params.api.sizeColumnsToFit()}
            onGridSizeChanged={(params) => params.api.sizeColumnsToFit()}
          />
        </div>

        <div className="btn-container">
          <button type="submit" className="btn-submit">가입고 정보 등록</button>
        </div>

        {/* 발주서 모달 */}
        {isPoModalOpen && (
          <div className="modal-overlay" onClick={() => setIsPoModalOpen(false)}>
            <div className="modal-body" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>발주서(PO) 검색</h3>
                <button type="button" className="btn-close" onClick={() => setIsPoModalOpen(false)}>✕</button>
              </div>
              <div className="modal-filters-split">
                <div className="filter-side-date">
                  <input type="date" value={poStartDate} onChange={(e) => setPoStartDate(e.target.value)} />
                  <span className="date-dash">~</span>
                  <input type="date" value={poEndDate} onChange={(e) => setPoEndDate(e.target.value)} />
                </div>
                <div className="filter-side-search">
                  <input type="text" placeholder="발주번호 검색..." className="modal-search-input" value={poSearchText} onChange={(e) => setPoSearchText(e.target.value)} />
                  <button type="button" className="btn-modal-query">조회</button>
                </div>
              </div>
              <div className="modal-content-area">
                <table className="modal-table">
                  <thead>
                    <tr>
                      <th className="col-po-no">발주번호</th>
                      <th className="col-summary">품목요약</th>
                      <th className="col-date">발주 일자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPoData.length > 0 ? (
                      filteredPoData.map((po, idx) => (
                        <tr key={idx} className="modal-tr-row" onClick={() => handleSelectPo(po.poNo)}>
                          <td className="font-bold-blue col-po-no">{po.poNo}</td>
                          <td className="col-summary">{po.itemSummary}</td>
                          <td className="text-gray col-date">{po.poDate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>해당 조건에 맞는 발주서가 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 품목추가 버튼 모달 */}
        {isItemModalOpen && (
          <div className="modal-overlay" onClick={() => setIsItemModalOpen(false)}>
            <div className="modal-body" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>추가 품목 검색</h3>
                <button type="button" className="btn-close" onClick={() => setIsItemModalOpen(false)}>✕</button>
              </div>
              <div className="modal-filters" style={{ display: 'flex', gap: '8px', width: '100%' }}>
                
                <input type="text" placeholder="품번 또는 품명 검색..." className="modal-search-input" />
                <button type="button" className="btn-modal-query">조회</button>
              </div>
              <div className="modal-content-area">
                
                {isLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    데이터를 불러오는 중입니다...
                  </div>
                ) : (
                  <table className="modal-table">
                    <thead>
                      <tr>
                        <th style={{ width: '70px' }}>품목유형</th>
                        <th style={{ width: '70px' }}>구분</th>
                        <th style={{ width: '130px' }}>코드</th>
                        <th style={{ width: '130px' }}>품번</th>
                        <th>품명</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 서버에서 받아온 [dbItemList]로 매핑 */}
                      {dbItemList.map((item, idx) => (
                        <tr 
                          key={idx} 
                          className="modal-tr-row" 
                          onClick={() => {
                            handleAddItemToGrid(item);
                            setIsItemModalOpen(false);
                          }}
                        >
                          {/* 파이썬 API 서버가 보내주는 데이터 필드명에 맞춰 바인딩 */}
                          <td>{item.itemGubn || '원자재'}</td> {/* 만약 DB에 gubn이 없으면 임시 텍스트 */}
                          <td>{item.itemGrup || ''}</td>
                          <td className="font-bold-blue">{item.itemCode}</td>
                          <td className="font-bold-blue">{item.atskCode || '-'}</td>
                          <td>{item.itemName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                
              </div>
            </div>
          </div>
        )}

        {/* ========================== QR/바코드 스캐너 팝업 영역 start ========================== */}
        {isScannerOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.6)', /* 배경을 어둡게 처리 */
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999, /* 최상단에 띄우기 */
            padding: '20px',
            boxSizing: 'border-box'
          }}>
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '20px',
              width: '100%',
              maxWidth: '450px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              position: 'relative'
            }}>
              {/* 팝업 헤더 타이틀 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>📷 QR / 바코드 스캔</h3>
                <button 
                  type="button" 
                  onClick={toggleScanner} /* 카메라 닫기 기능 연동 */
                  style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}
                >
                  &times;
                </button>
              </div>

              {/* html5-qrcode 스캐너가 그려질 영역 */}
              <div id="qr-reader" style={{ width: '100%', overflow: 'hidden', borderRadius: '4px' }}></div>
              
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '10px', marginBottom: 0 }}>
                카메라 권한을 허용하고 바코드를 사각형 안에 맞춰주세요.
              </p>
            </div>
          </div>
        )} {/* ========================== QR/바코드 스캐너 팝업 영역 end ========================== */}
      </form>
    </div>
  );
}