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
  itemGubnName: string;
  itemGrup: string;
  itemCode: string;
  atskCode: string;
  itemName: string;
  ordrQnty: number;
  prevQnty: number;
  apgoQnty: number;
  needQnty: number; 
  ipgoQnty: number;
  unit: string;
}

// 전역 변수로 html5QrScanner를 선언하여 스캐너 인스턴스를 관리
let html5QrScanner: any = null;

interface DbItem {
  itemGrup: string;  // 원자재/부자재
  itemGubn: string;  // 품목구분
  itemGubnName: string;  // 품목구분
  itemCode: string;   // 품목코드
  atskCode: string;  // 품번
  itemName: string;   // 품명
  unit: string;       // 단위
  ordrNumb: string;
  ordrDate: string;
  itemQnty: number;  // 입고 수량
  ordrQnty: number;  // 발주 수량
  apgoQnty: number;  // 총 입고 수량
  miQnty: number;  // 미입고 수량
  deryDate: String;  // 납기일
  statType: string; // 발주종결여부
  prevGaip: number;  // 이전 가입고 수량
}

interface gubnCode {
  code: string;
  name: string;
}

interface ordrMaster {
  ordrNumb: string;
  compName: string;
  itemSummary: string;
  ordrDate: string;
}

/* ========================================================================================================================================= */
export default function IpgoRegister({ setActivePage }: IpgoRegisterProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false); // 카메라 화면 토글 상태
  const [rowData, setRowData] = useState<BomItem[]>([]);
  
  // 품목 추가 모달, DB의 품목 리스트 저장할 상태
  const [dbItemList, setDbItemList] = useState<DbItem[]>([]);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);     // 로딩 상태 관리

  const [isOrdrModalOpen, setIsOrdrModalOpen] = useState(false);
  const [ordrData, setOrdrData] = useState<ordrMaster[]>([]);
  const [isOrdrLoading, setIsOrdrLoading] = useState(false); // 조회 상태 분리
  const [selectedOrdrNo, setSelectedOrdrNo] = useState('');

  const [itemSearchText, setItemSearchText] = useState(''); // 품목 검색어 상태

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);   // 모바일 여부 체크

  const getPastDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };
  const [ordrStartDate, setOrdrStartDate] = useState(getPastDate(7));
  const [ordrEndDate, setOrdrEndDate] = useState(getPastDate(0));
  const [ordrSearchText, setOrdrSearchText] = useState('');
/* =============================================================== useEffect start =============================================================== */
// 발주서 모달날짜(시작일, 종료일)가 변경되면 자동으로 조회
useEffect(() => {
  // 처음 컴포넌트가 켜졌을 때나 모달이 닫혀있을 때는 실행 방지
  if (isOrdrModalOpen) {
    handleFetchOrdrList();
  }
}, [isOrdrModalOpen, ordrStartDate, ordrEndDate]);

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

// 아이템 구분 select박스 조회
useEffect(() => {
  const fetchCommonCodes = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/ipgo/item/gubn');
      setItemGubnCodes(response.data); 
    } catch (error) {
      console.error("공통코드 조회 실패:", error);
    }
  };
  fetchCommonCodes();
}, []);

// 화면 리사이즈 이벤트 감지하여
useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
/* =============================================================== useEffect end =============================================================== */


  /* ========================= 발주서 모달 관련 상태 및 함수 start ========================== */
  // 발주서 모달 오픈 또는 발주서 조회버튼
  const handleFetchOrdrList = async () => {
    setIsOrdrLoading(true);
    try {
      // 기간 및 검색어를 쿼리 파라미터로 포함하여 백엔드 호출
      const response = await axios.get('http://127.0.0.1:8000/api/ipgo/ordr', {
        params: {
          startDate: ordrStartDate,
          endDate: ordrEndDate,
          searchText: ordrSearchText
        }
      });
      setOrdrData(response.data); // 서버에서 가져온 발주 마스터 리스트
    } catch (error) {
      console.error("발주서 목록 조회 실패:", error);
      alert("발주서 목록을 가져오지 못했습니다.");
    } finally {
      setIsOrdrLoading(false);
    }
  };


  // 발주 선택 시 상세 품목(Item) 리스트를 조회 후 메인 그리드에 바인딩
  const handleSelectOrdr = async (ordrNumb: string) => {
    try {
      // 백엔드에서 발주 상세 품목들 받아오기
      const response = await axios.get(`http://127.0.0.1:8000/api/ipgo/ordr/${ordrNumb}/items`);
      const rawItems = response.data; // 백엔드가 준 상태 그대로의 배열

      // 화면 상단 인풋박스에 발주번호
      setSelectedOrdrNo(ordrNumb);

      // 수량 계산식을 거쳐서 그리드용 데이터(BomItem 구조)로 재조립하기
      const calculatedRows = rawItems.map((item: any) => {
        
        // 변수 선언 (백엔드에서 넘어온 값들)
        const ordrQnty = item.ordrQnty || 0; // 발주수량
        const apgoQnty = item.apgoQnty || 0;   // 실제 총입고수량
        
        // 필요 입고수량 = 발주수량 - 실제 총입고수량
        const needQnty = ordrQnty - apgoQnty; 

        // AG-Grid 한 줄 양식에 맞춰서 리턴
        return {
          checkbox: false,
          itemGrup: item.itemGrup,     // 구분 (원자재 등)
          itemCode: item.itemCode,     // 품목코드
          atskCode: item.atskCode,     // 품번
          itemName: item.itemName,     // 품명
          ordrQnty: ordrQnty,        // 발주수량
          apgoQnty: apgoQnty,          // 실제 총입고수량
          
          // 계산식 결과 반영
          needQnty: needQnty,  // 필요 입고수량 (계산된 값)
          
          ipgoQnty: 10,                 // 금회 납품수량 (기본값 10, 사용자가 입력함)
          prevQnty: item.prevQnty || 0, // 이전 가입고 수량
          unit: item.unit || 'EA',
          //,statType: item.statType
        };
      });

      // 최종 계산된 리스트
      setRowData(calculatedRows);
      
      // 모달창 닫기
      setIsOrdrModalOpen(false);

    } catch (error) {
      console.error("발주 상세 내역 바인딩 실패:", error);
      alert("상세 내역을 계산하는 중 오류가 발생했습니다.");
    }
  };
  /* ========================= 발주서 모달 관련 상태 및 함수 end ========================== */



  /* ========================= 품목 추가 모달 관련 상태 및 함수 start ========================== */
  // 공통코드 목록을 담을 상태 추가
  const [itemGubnCodes, setItemGubnCodes] = useState<gubnCode[]>([]);
  // select 박스에서 사용자가 선택한 값을 저장할 상태 추가
  const [selectedGubn, setSelectedGubn] = useState('');

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

  // 품목 조건 조회 함수
  const handleFetchItemList = async () => {
    setIsLoading(true);
    try {
      // 백엔드(FastAPI)로 셀렉트박스 값(itemGubn)과 검색어(searchText)를 파라미터로 전송
      const response = await axios.get('http://127.0.0.1:8000/api/ipgo/items', {
        params: {
          itemGubn: selectedGubn,   // '21', '22' 등의 코드
          searchText: itemSearchText // 입력한 검색어
        }
      });
      setDbItemList(response.data); // 서버에서 필터링되어 온 결과로 리스트 갱신
    } catch (error) {
      console.error("품목 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 서버에서 받아온 전체 데이터(dbItemList)를 셀렉트 박스 선택값(selectedGubn)에 따라 필터링
  const filteredDbItemList = useMemo(() => {
    // 셀렉트 박스가 '전체'("")이거나 데이터가 없으면 전체 목록 반환
    if (!selectedGubn) return dbItemList;
    
    // sys_code_info에서 가져온 cd.name('원자재' 등)과 DbItem의 itemGubn 필드 값을 비교하여 매칭
    return dbItemList.filter(item => item.itemGubn === selectedGubn);
  }, [dbItemList, selectedGubn]);

  /* ========================== 품목 추가 모달 관련 상태 및 함수 end ========================== */



  /* ==================================== 그리드 컬럼 정의 및 기본 옵션 START ==================================== */
  const columnDefs = useMemo<ColDef[]>(
    (): ColDef[] => [
      { field: 'itemGrup', headerName: '구분', width: 80, sortable: true, filter: true, cellStyle: { textAlign: 'center' }, hide: isMobile },
      { field: 'itemCode', headerName: '코드', width: 110, sortable: true, filter: true, hide: isMobile },
      { field: 'atskCode', headerName: '품번', width: 110, sortable: true, filter: true, hide: isMobile },
      { field: 'itemName', headerName: '품명', flex: 2, minWidth: 120, sortable: true, filter: true },
      { field: 'ordrQnty', headerName: '발주수량', width: 90, cellStyle: { textAlign: 'right' }, hide: isMobile  },
      { field: 'apgoQnty', headerName: '총입고수량', width: 100, cellStyle: { textAlign: 'right' }, hide: isMobile  },
      { 
        field: 'needQnty', 
        headerName: isMobile ? '필요' : '필요 입고수량', 
        width: isMobile ? 75 : 110,
        flex: isMobile ? 0 : undefined,
        suppressSizeToFit: true,
        cellStyle: { textAlign: 'right', color: '#ff6b6b', fontWeight: 'bold' } 
      },
      { 
        field: 'ipgoQnty', 
        headerName: isMobile ? '금회' : '금회 납품수량', 
        width: isMobile ? 75 : 120,
        flex: isMobile ? 0 : undefined,
        suppressSizeToFit: true,
        editable: true, 
        cellEditor: 'agTextCellEditor', 
        cellStyle: { textAlign: 'right', backgroundColor: '#e8f0f7', fontWeight: 'bold' } 
      },
      { 
        field: 'prevQnty', 
        headerName: isMobile ? '이전' : '이전가입고수량', 
        width: isMobile ? 75 : 110,
        flex: isMobile ? 0 : undefined,
        suppressSizeToFit: true,
        cellStyle: { textAlign: 'right' } 
      },
      { field: 'unit', headerName: '단위', width: 60, cellStyle: { textAlign: 'left' }, hide: isMobile  }
    ],
    [isMobile]
  );
  /* ==================================== 그리드 컬럼 정의 및 기본 옵션 END ==================================== */


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
      itemGubnName: item.itemGubnName || '',
      itemGrup: item.itemGrup || '',
      itemCode: item.itemCode,
      atskCode: item.atskCode,
      itemName: item.itemName,
      ordrQnty: 0,
      apgoQnty: 0,
      needQnty: 0,
      ipgoQnty: 10,
      prevQnty: 0,
      unit: item.unit || ''
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


  /* ========================== QR/바코드 스캐너 관련 상태 및 함수 start ========================== */
  // 스캔 제출 핸들러 (QR/바코드로 발주서번호를 찍었을 때 실행)
  const handleScanSubmit = async (code: string) => {
    const cleanOrdrNumb = code.trim();
    if (!cleanOrdrNumb) return;

    try {
      // 내부에서 API 호출 -> 수량 계산(needQnty 등) -> setSelectedOrdrNo -> setRowData -> 모달 닫기까지 한 번에 처리
      await handleSelectOrdr(cleanOrdrNumb);

    } catch (error) {
      console.error("QR/바코드 스캔 처리 중 오류:", error);
      alert("발주서 정보를 불러오는 데 실패했습니다.");
    }
  };

  // 모바일 카메라 스캐너 토글 함수
  const toggleScanner = () => {
    if (!isScannerOpen) {
      setIsScannerOpen(true);

      setTimeout(() => {
        html5QrScanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        html5QrScanner.render(
          (decodedText: string) => {
            handleScanSubmit(decodedText);
            if (html5QrScanner) {
              html5QrScanner
                .clear()
                .catch((err: any) => console.error("스캐너 해제 실패:", err));
            }
            setIsScannerOpen(false);
          },
          (error: any) => {
            if (
              error &&
              typeof error === "string" &&
              error.includes("NotFoundException")
            ) {
              return;
            }
            console.warn("스캐너 내부 경고/오류:", error);
          }
        );
      }, 100);
    } else {
      if (html5QrScanner) {
        html5QrScanner
          .clear()
          .then(() => {
            html5QrScanner = null;
            setIsScannerOpen(false);
          })
          .catch((err: any) => {
            console.error("카메라 강제 종료 중 에러:", err);
            setIsScannerOpen(false);
          });
      } else {
        setIsScannerOpen(false);
      }
    }
  };
  /* ========================== QR/바코드 스캐너 관련 상태 및 함수 end ========================== */

  /* ========================== 신규버튼 이벤트 ================================ */
  const clearAll = () => {
  // 발주번호 모달창 검색 인풋 초기화
  setOrdrSearchText(''); 

  // 메인 화면 그리드 위 발주번호 인풋 초기화
  setSelectedOrdrNo(''); 

  // AG-Grid 메인 데이터 빈 배열로 초기화
  setRowData([]); 

  // 모달창의 발주 목록 검색 결과도 함께 비워야하면 추가
  // setOrdrData([]); 
};



/*=========================================================== JSX 영역 ===========================================================*/
/*=========================================================== JSX 영역 ===========================================================*/
/*=========================================================== JSX 영역 ===========================================================*/
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
              <input type="text" placeholder="검색 버튼을 눌러주세요" value={selectedOrdrNo} readOnly />
              <button type="button" className="btn-search" onClick={() => setIsOrdrModalOpen(true)}>
                🔍
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>입고 예정일시</label>
            <input type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} />
          </div>
          <div className="form-group"><label>운전자</label><input type="text" placeholder="예: 홍길동" required /></div>
          <div className="form-group"><label>운전자 연락처</label><input type="text" placeholder="예: 010-1234-5678" required /></div>
        </div>
        
        {/* 품목 명세 헤더 및 컨트롤 버튼 조합바 */}
        <div className="grid-control-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="grid-title">
            품목 명세 <span className="pc-only-text">('금회 납품수량'은 클릭하여 수정 가능)</span>
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input 
              type="text" 
              value={selectedOrdrNo} 
              readOnly 
              placeholder="발주서 미선택"
              style={{ 
                padding: '4px 8px', 
                fontSize: '13px', 
                border: '1px solid #ccc', 
                backgroundColor: '#f5f5f5', // 비활성화 느낌을 주는 배경색
                color: '#333',
                fontWeight: 'bold',
                borderRadius: '4px',
                width: '140px',
                textAlign: 'center'
              }} 
            />
          </div>


          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" className="btn-camera-scan" onClick={toggleScanner} >
              {isScannerOpen ? '카메라 닫기' : '스캔'}
            </button>
            <button type="button" className="btn-item-clear" onClick={clearAll} >
              신규
            </button>
            <button type="button" className="btn-item-add" onClick={handleOpenProductModal} >
              추가
            </button>
            <button type="button" className="btn-item-delete" onClick={handleRemoveItemFromGrid}>
              삭제
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

        {/* ================================================================= 발주서 모달 ================================================================= */}
        {isOrdrModalOpen && (
          <div className="modal-overlay" onClick={() => setIsOrdrModalOpen(false)}>
            <div className="modal-body" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>발주서(Ordr) 검색</h3>
                <button type="button" className="btn-close" onClick={() => setIsOrdrModalOpen(false)}>✕</button>
              </div>
              <div className="modal-filters-split">
                <div className="filter-side-date">
                  <input type="date" value={ordrStartDate} onChange={(e) => setOrdrStartDate(e.target.value)} />
                  <span className="date-dash">~</span>
                  <input type="date" value={ordrEndDate} onChange={(e) => setOrdrEndDate(e.target.value)} />
                </div>
                <div className="filter-side-search">
                  <input type="text" 
                         placeholder="발주번호 검색" 
                         className="modal-search-input" 
                         value={ordrSearchText} 
                         onChange={(e) => setOrdrSearchText(e.target.value)} 
                         onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleFetchOrdrList();
                            }
                          }}
                  />
                  <button type="button" className="btn-modal-query" onClick={handleFetchOrdrList}>조회</button>
                </div>
              </div>
              <div className="modal-content-area">
                <table className="modal-table">
                  <thead>
                    <tr>
                      <th className="col-ordr-no">발주번호</th>
                      <th className="col-summary">품목요약</th>
                      <th className="col-date">발주 일자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordrData.length > 0 ? (
                      ordrData.map((ordr, idx) => (
                        <tr key={idx} className="modal-tr-row" onClick={() => handleSelectOrdr(ordr.ordrNumb)}>
                          <td className="font-bold-blue col-ordr-no">{ordr.ordrNumb}</td>
                          <td className="col-summary">{ordr.itemSummary}</td>
                          <td className="text-gray col-date">{ordr.ordrDate}</td>
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

        {/* ================================================================= 품목추가 버튼 모달 ================================================================= */}
        {isItemModalOpen && (
          <div className="modal-overlay" onClick={() => setIsItemModalOpen(false)}>
            <div className="modal-body" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>추가 품목 검색</h3>
                <button type="button" className="btn-close" onClick={() => setIsItemModalOpen(false)}>✕</button>
              </div>
              <div className="modal-filters" style={{ display: 'flex', gap: '8px', width: '95%' }}>
                <select className="modal-select" style={{ width: '120px' }} value={selectedGubn} onChange={(e) => setSelectedGubn(e.target.value)}>
                  <option value="">전체</option>
                  {itemGubnCodes.map((cd) => (
                  <option key={cd.code} value={cd.code}>
                    {cd.name}
                  </option>
                ))}
                </select>
                <input type="text" 
                       placeholder="품번 또는 품명 검색" 
                       className="modal-search-input" 
                       value={itemSearchText}
                       onChange={(e) => setItemSearchText(e.target.value)}
                       onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleFetchItemList();
                        }
                       }}
                />
                <button type="button" className="btn-modal-query" onClick={handleFetchItemList}>
                  조회
                </button>
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
                        <th style={{ width: '110px' }}>구분</th>
                        <th style={{ width: '110px' }}>코드</th>
                        <th style={{ width: '110px' }}>품번</th>
                        <th>품명</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 서버에서 받아온 [dbItemList]로 매핑 */}
                      {filteredDbItemList.map((item, idx) => (
                        <tr 
                          key={idx} 
                          className="modal-tr-row" 
                          onClick={() => {
                            handleAddItemToGrid(item);
                            setIsItemModalOpen(false);
                          }}
                        >
                          {/* 파이썬 API 서버가 보내주는 데이터 필드명에 맞춰 바인딩 */}
                          <td>{item.itemGubnName || '원자재'}</td>
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
                  style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'Ordrinter', color: '#999' }}
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