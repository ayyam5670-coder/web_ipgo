import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellClickedEvent } from 'ag-grid-community';
import { ModuleRegistry, AllCommunityModule, themeAlpine } from 'ag-grid-community';
import { useReactToPrint } from 'react-to-print';
import { IpgoPrintSheet } from '../src/report/IpgoPrint';
import { ipgoApi } from '../src/api/axiosInstances';

// AG Grid 모듈 등록
ModuleRegistry.registerModules([AllCommunityModule]);

// AG Grid 커스텀 테마 설정 (컴팩트 스타일)
const myCompactTheme = themeAlpine.withParams({
  headerHeight: 32,
  rowHeight: 28,
  fontSize: '12px',
});

// 로그인된 사용자 정보 Props
interface IpgoHistoryProps {
  custCode: string;
  custName: string;
}

// 1. 메인 목록 API 응답 구조
interface IpgoHistoryMaster {
  ipgoNumb: string;    // 가입고번호
  ipgoDate: string;    // 입고예정일자
  ordrNumb: string;    // 발주번호
  saveDate: string;    // 등록일/저장일
  lastDate: string;    // 최근입고일
  itemSummary: string; // 품목 요약
  statType: 'Y' | 'N'; // 'N': 진행중, 'Y': 종결
  ordrStat: 'Y' | 'N'; // 'N': 진행중, 'Y': 종결
}

// 2. 모달 상세 목록 API 응답 구조
interface IpgoHistoryDetail {
  ipgoNumb: string;
  ipgoDate: string;
  itemCode: string;   // 품번
  itemName: string;   // 품명
  ordrQnty: number;   // 발주수량
  miQnty: number;     // 필요입고수량
  gaipQnty: number;   // 가입고수량
  unit: string;       // 단위
  statType: 'Y' | 'N';
  ordrDetl: string;   // ordr_numb
  summGaip: number;   // 누적가입고수량
}

export default function IpgoHistory({ custCode, custName }: IpgoHistoryProps) {
  const mainGridRef = useRef<AgGridReact>(null);
  const modalGridRef = useRef<AgGridReact>(null); // 모달 그리드 저장용 Ref
  const printComponentRef = useRef<HTMLDivElement>(null);

  // 로딩 및 데이터 상태 관리
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [masterRowData, setMasterRowData] = useState<IpgoHistoryMaster[]>([]);
  const [modalRowData, setModalRowData] = useState<IpgoHistoryDetail[]>([]);

  // 모달 상단 셀렉트박스용 상태값 ('ALL' | 'N' | 'Y')
  const [modalStatusFilter, setModalStatusFilter] = useState<string>('ALL');

  // 인쇄 데이터 관리
  const [printData, setPrintData] = useState<any[]>([]);

  // react-to-print 설정
  const handlePrintTrigger = useReactToPrint({
    contentRef: printComponentRef,
    documentTitle: '가입고_등록_내역서',
  });

  // 검색 조건 상태
  const getPastDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getPastDate(30));
  const [endDate, setEndDate] = useState(getPastDate(0));
  const [searchText, setSearchText] = useState('');
  const [searchStatus, setSearchStatus] = useState('전체');

  // 모달 제어 및 수정 모드 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // 수정 모드 여부
  const [selectedIpgoNumb, setselectedIpgoNumb] = useState('');

  // 메인 마스터 목록 조회
  const fetchMasterList = useCallback(async () => {
    setLoading(true);
    try {
      let statTypeParam = '';
      if (searchStatus === '진행중' || searchStatus === 'N') statTypeParam = 'N';
      else if (searchStatus === '종결' || searchStatus === 'Y') statTypeParam = 'Y';

      const response = await ipgoApi.get('/menu/gaipHistory', {
        params: {
          startDate,
          endDate,
          searchText,
          statType: statTypeParam,
        },
      });

      setMasterRowData(response.data);
    } catch (error) {
      console.error('❌ 가입고 내역 조회 실패:', error);
      alert('가입고 내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, searchText, searchStatus]);

  useEffect(() => {
    fetchMasterList();
  }, [startDate, endDate, searchStatus]);

  // 모달 상세 품목 목록 조회
  const fetchDetailItems = async (gaip_numb: string) => {
    setModalLoading(true);
    setModalStatusFilter('ALL'); // 모달이 열릴 때 필터를 '전체'로 초기화
    try {
      const response = await ipgoApi.get(`/gaip/${gaip_numb}/items`);
      setModalRowData(response.data);
    } catch (error) {
      console.error('❌ 가입고 상세 품목 조회 실패:', error);
      alert('가입고 상세 내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setModalLoading(false);
    }
  };

  // 모달 상태 필터링된 데이터
  const filteredModalRowData = useMemo(() => {
    if (modalStatusFilter === 'ALL') return modalRowData;
    return modalRowData.filter((item) => item.statType === modalStatusFilter);
  }, [modalRowData, modalStatusFilter]);

  // '품목요약' 클릭 시 (단순 조회 모달)
  const onCellClicked = (event: CellClickedEvent<IpgoHistoryMaster>) => {
    if (event.colDef?.field === 'itemSummary' && event.data) {
      const targetIpgoNo = event.data.ipgoNumb;
      setselectedIpgoNumb(targetIpgoNo);
      setIsEditMode(false); // 단순 조회 모드
      setIsModalOpen(true);
      fetchDetailItems(targetIpgoNo);
    }
  };

  // 수정버튼 이벤트 (체크박스 선택 후 수정 버튼)
  const handleOpenEditModal = () => {
    const selectedNodes = mainGridRef.current?.api?.getSelectedNodes();
    const selectedMasters =
      selectedNodes
        ?.map((node: any) => node.data)
        .filter((data: any) => data !== undefined && data !== null) || [];

    if (selectedMasters.length === 0) {
      alert('수정할 가입고 내역을 목록에서 1건 선택해 주세요.');
      return;
    }

    if (selectedMasters.length > 1) {
      alert('수정 작업은 한 번에 1건씩만 가능합니다. 1건만 선택해 주세요.');
      return;
    }

    const targetMaster = selectedMasters[0];
    setselectedIpgoNumb(targetMaster.ipgoNumb);
    setIsEditMode(true); // 수정 모드 활성화
    setIsModalOpen(true);
    fetchDetailItems(targetMaster.ipgoNumb);
  };


  // 모달 내 선택된 항목들의 진행상태 일괄 변경 핸들러
  const handleBulkStatusChange = (newStatus: 'N' | 'Y') => {
    if (!modalGridRef.current?.api) return;

    const selectedNodes = modalGridRef.current.api.getSelectedNodes();
    if (selectedNodes.length === 0) {
      alert('상태를 변경할 항목을 선택해 주세요.');
      return;
    }

    const statusText = newStatus === 'N' ? '진행중' : '종결';
    if (!confirm(`선택한 ${selectedNodes.length}개 항목의 상태를 [${statusText}](으)로 변경하시겠습니까?`)) {
      return;
    }

    // 선택된 노드들의 statType 값을 일괄 변경 (화면 그리드 즉시 반영)
    selectedNodes.forEach((node) => {
      node.setDataValue('statType', newStatus);
    });
  };


  // 수정 모달창의 저장버튼 이벤트
  const handleSaveDetail = async () => {
    if (!modalGridRef.current?.api) return;

    // 편집 중인 셀이 있다면 편집 완료 처리
    modalGridRef.current.api.stopEditing();

    // 현재 모달 그리드의 수정된 전체 데이터 추출
    const updatedItems: IpgoHistoryDetail[] = [];
    modalGridRef.current.api.forEachNode((node) => {
      if (node.data) updatedItems.push(node.data);
    });

    if (updatedItems.length === 0) {
      alert('저장할 항목이 없습니다.');
      return;
    }

    if (!confirm(`가입고번호 [${selectedIpgoNumb}] 내역을 저장하시겠습니까?`)) {
      return;
    }

    setSaveLoading(true);
    try {
      await ipgoApi.put(`/gaip/${selectedIpgoNumb}/items`, {
        ipgoNumb: selectedIpgoNumb,
        items: updatedItems,
      });

      alert('성공적으로 저장되었습니다.');
      setIsModalOpen(false);
      fetchMasterList(); // 메인 리스트 갱신
    } catch (error) {
      console.error('❌ 가입고 상세 수정 저장 실패:', error);
      alert('저장 도중 오류가 발생했습니다.');
    } finally {
      setSaveLoading(false);
    }
  };

  // 선택된 항목 인쇄 핸들러
  const handlePrintHistory = async () => {
    const selectedNodes = mainGridRef.current?.api?.getSelectedNodes();
    const selectedMasters =
      selectedNodes
        ?.map((node: any) => node.data)
        .filter((data: any) => data !== undefined && data !== null) || [];

    if (selectedMasters.length === 0) {
      alert('인쇄할 가입고 내역을 목록에서 최소 1건 이상 선택해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const formattedPrintData = await Promise.all(
        selectedMasters.map(async (master: IpgoHistoryMaster) => {
          try {
            if (isModalOpen && selectedIpgoNumb === master.ipgoNumb && modalRowData.length > 0) {
              return { master, items: modalRowData };
            }
            const response = await ipgoApi.get(`/gaip/${master.ipgoNumb}/items`);
            return { master, items: response.data || [] };
          } catch (err) {
            console.error(`가입고번호 [${master.ipgoNumb}] 상세 조회 실패:`, err);
            return { master, items: [] };
          }
        })
      );

      setPrintData(formattedPrintData);
      setTimeout(() => {
        handlePrintTrigger();
      }, 150);
    } catch (error) {
      console.error('인쇄 데이터 생성 중 오류 발생:', error);
      alert('인쇄 데이터를 불러오는 도중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 메인 그리드 컬럼 정의
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
    {
      field: 'ordrStat',
      headerName: '발주진행상태',
      width: 110,
      valueGetter: (params) => (params.data?.statType === 'N' ? '진행중' : '종결'),
      cellStyle: (params) => {
        if (params.value === '종결') return { color: '#888', fontWeight: 'bold', textAlign: 'center' };
        return { color: '#2e7d32', fontWeight: 'bold', textAlign: 'center' };
      },
    },
  ]);

  // 모달 그리드 컬럼 정의 (자체 AG Grid 필터 속성 제거됨)
  const modalColumnDefs: ColDef<IpgoHistoryDetail>[] = [
    { field: 'itemCode', headerName: '품번', width: 130 },
    { field: 'itemName', headerName: '품명', flex: 1, minWidth: 150 },
    { field: 'ordrQnty', headerName: '발주수량', width: 90, cellStyle: { textAlign: 'right' } },
    { field: 'miQnty', headerName: '필요 입고수량', width: 110, cellStyle: { textAlign: 'right', color: '#ff6b6b', fontWeight: 'bold' } },
    {
      field: 'gaipQnty',
      headerName: '가입고수량',
      width: 100,
      editable: isEditMode, // 수정 모드일 때만 편집 허용
      cellDataType: 'number',
      cellStyle: (params) => ({
        textAlign: 'right',
        fontWeight: 'bold',
        backgroundColor: isEditMode ? '#fff3bf' : 'transparent', // 수정 가능함 강조 표시
      }),
    },
    { field: 'summGaip', headerName: '누적 가입고수량', width: 120, cellStyle: { textAlign: 'right', fontWeight: 'bold' } },
    { field: 'unit', headerName: '단위', width: 60, cellStyle: { textAlign: 'center' } },
    {
      field: 'statType',
      headerName: '상태',
      width: 90,
      editable: isEditMode, // 수정 모드일 때 선택 변경 가능
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['N', 'Y'],
      },
      valueFormatter: (params) => (params.value === 'N' ? '진행중' : '종결'),
      cellStyle: (params) => {
        const bg = isEditMode ? '#fff3bf' : 'transparent';
        if (params.value === 'Y' || params.value === '종결') {
          return { color: '#888', fontWeight: 'bold', textAlign: 'center', backgroundColor: bg };
        }
        return { color: '#2e7d32', fontWeight: 'bold', textAlign: 'center', backgroundColor: bg };
      },
    },
    { field: 'ordrDetl', headerName: '주문번호상세', hide: true },
  ];

  return (
    <div className="page-panel">
      {/* 헤더 영역 */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>
          가입고 내역 현황
        </h2>
        <div style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>
          소속 업체: <span style={{ color: '#2b8a3e', fontWeight: 'bold' }}>{custName}</span>
        </div>
      </div>

      {/* 상단 검색 필터바 및 버튼 그룹 */}
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #e9ecef', alignItems: 'center' }}>
        {/* 입고일 범위 */}
        <div className="date-filter-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>입고일</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} 
          />
          <span style={{ fontSize: '13px', color: '#868e96' }}>~</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} 
          />
        </div>

        {/* 검색어 */}
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
          <select 
            value={searchStatus} 
            onChange={(e) => setSearchStatus(e.target.value)} 
            style={{ height: '32px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '13px', backgroundColor: '#fff' }}
          >
            <option value="전체">전체</option>
            <option value="N">진행중</option>
            <option value="Y">종결</option>
          </select>
        </div>

        {/* 우측 버튼 영역 (조회 & 수정 버튼) */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            onClick={fetchMasterList}
            style={{ height: '32px', padding: '0 16px', backgroundColor: '#228be6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            🔍 조회
          </button>
          <button 
            type="button" 
            onClick={handleOpenEditModal}
            style={{ height: '32px', padding: '0 16px', backgroundColor: '#f59f00', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            ✏️ 수정
          </button>
        </div>
      </div>

      {/* 중앙 마스터 내역 그리드 영역 */}
      <div style={{ height: 'calc(100vh - 230px)', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div className="grid-notice-text" style={{ fontSize: '11px', color: '#868e96' }}>
            * '품목요약'을 클릭하면 상세보기가 열리며, 수정 시에는 항목 선택 후 상단 <b>[✏️ 수정]</b> 버튼을 눌러주세요.
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
      
      {/* 인쇄용 영역 */}
      <div style={{ display: 'none' }}>
        <IpgoPrintSheet ref={printComponentRef} selectedData={printData} custName={custName} />
      </div>

      {/* 상세 품목 목록 & 수정 모달 팝업 */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-body" style={{ maxWidth: '960px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>
                가입고 상세 품목 명세 [{selectedIpgoNumb}] {isEditMode && <span style={{ color: '#e67700', fontSize: '14px' }}>(수정 모드)</span>}
              </h3>
              <button type="button" className="btn-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <div className="modal-content-area" style={{ padding: '15px' }}>
              {/* 모달 상단 컨트롤 바 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  {isEditMode && (
                    <span style={{ fontSize: '12px', color: '#d9480f', backgroundColor: '#fff9db', padding: '4px 8px', borderRadius: '4px' }}>
                      * 체크박스 선택 후 일괄 변경하거나, 셀을 직접 클릭하여 수정할 수 있습니다.
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* 수정 모드일 때만 일괄 변경 버튼 노출 */}
                  {isEditMode && (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', backgroundColor: '#f1f3f5', padding: '2px 6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#495057' }}>선택항목:</span>
                      <button
                        type="button"
                        onClick={() => handleBulkStatusChange('N')}
                        style={{ height: '24px', padding: '0 8px', fontSize: '11px', backgroundColor: '#2b8a3e', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        진행중
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkStatusChange('Y')}
                        style={{ height: '24px', padding: '0 8px', fontSize: '11px', backgroundColor: '#495057', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        종결
                      </button>
                    </div>
                  )}

                  {/* 진행상태 셀렉트박스 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>조회구분</label>
                    <select
                      value={modalStatusFilter}
                      onChange={(e) => setModalStatusFilter(e.target.value)}
                      style={{ height: '28px', border: '1px solid #ced4da', borderRadius: '4px', padding: '0 8px', fontSize: '12px', backgroundColor: '#fff' }}
                    >
                      <option value="ALL">전체</option>
                      <option value="N">진행중</option>
                      <option value="Y">종결</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 모달 AG Grid 영역 */}
              <div style={{ height: '350px', width: '100%' }}>
                <AgGridReact
                  ref={modalGridRef}
                  rowData={filteredModalRowData}
                  columnDefs={modalColumnDefs}
                  theme={themeAlpine}
                  loading={modalLoading}
                  singleClickEdit={true}
                  // 모달 그리드에 멀티 체크박스(헤더 전체선택 포함) 추가
                  rowSelection={{ mode: 'multiRow', headerCheckbox: true }}
                />
              </div>

              {/* 모달 하단 저장/닫기 버튼 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '15px' }}>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={handleSaveDetail}
                    disabled={saveLoading}
                    style={{ height: '32px', padding: '0 20px', backgroundColor: '#2b8a3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                  >
                    {saveLoading ? '저장 중...' : '💾 저장'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ height: '32px', padding: '0 16px', backgroundColor: '#868e96', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}