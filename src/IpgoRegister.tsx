import { useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ValidationModule } from 'ag-grid-community';
import type { ColDef, RowSelectionOptions } from 'ag-grid-community'; // 🔥 RowSelectionOptions 타입 추가

ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface IpgoRegisterProps {
  setActivePage: (page: string) => void;
}

interface BomItem {
  checkbox: boolean;
  partNo: string;
  partName: string;
  orderQty: number;
  prevIpgoQty: number;
  actualIpgoQty: number;
  requiredQty: number;
  currentQty: number;
  unit: string;
}

export default function IpgoRegister({ setActivePage }: IpgoRegisterProps) {
  const [rowData] = useState<BomItem[]>([
    { checkbox: true, partNo: 'BRK-FRONT-01', partName: '브레이크 패드 (앞)', orderQty: 2000, prevIpgoQty: 500, actualIpgoQty: 500, requiredQty: 1500, currentQty: 500, unit: 'EA' },
    { checkbox: true, partNo: 'BOLT-M08-L20', partName: '조립용 플랜지 볼트', orderQty: 5000, prevIpgoQty: 2000, actualIpgoQty: 1500, requiredQty: 3500, currentQty: 2000, unit: 'EA' },
    { checkbox: false, partNo: 'SST-GUIDE-R', partName: '가이드 레일 (우)', orderQty: 1000, prevIpgoQty: 0, actualIpgoQty: 0, requiredQty: 1000, currentQty: 0, unit: 'EA' }
  ]);

  // 그리드 컬럼
  const [columnDefs] = useState<ColDef[]>([
    { field: 'partNo', headerName: '품번', width: 120, sortable: true, filter: true },
    { field: 'partName', headerName: '품명', width: 250, sortable: true, filter: true },
    { field: 'orderQty', headerName: '주문수량', width: 90, cellStyle: { textAlign: 'right' } },
    { field: 'prevIpgoQty', headerName: '이전 가입고 수량', width: 130, cellStyle: { textAlign: 'right' } },
    { field: 'actualIpgoQty', headerName: '실제 입고수량', width: 120, cellStyle: { textAlign: 'right' } },
    { field: 'requiredQty', headerName: '필요 입고수량', width: 120, cellStyle: { textAlign: 'right', color: '#ff6b6b', fontWeight: 'bold' } },
    { 
      field: 'currentQty', 
      headerName: '금회 납품수량', 
      width: 120, 
      editable: true, 
      cellEditor: 'agTextCellEditor', 
      cellStyle: { textAlign: 'right', backgroundColor: '#e8f0f7', fontWeight: 'bold' } 
    },
    { field: 'unit', headerName: '단위', width: 60 }
  ]);

 const defaultColDef = useMemo<ColDef>(() => ({
  resizable: true,
  // 🔥 셀 내부의 기본 폰트 크기와 패딩(여백)을 줄여서 콤팩트하게 만듭니다.
  cellStyle: { fontSize: '12px', paddingLeft: '8px', paddingRight: '8px' }
}), []);

  // 🔥 [해결] As of v32.2 Deprecated 경고 해결을 위한 신규 다중 선택 옵션 객체 정의
  const rowSelection = useMemo<RowSelectionOptions>(() => ({
    mode: 'multiRow',       // 구 rowSelection="multiple" 대동맥 대체
    checkboxes: true,       // 구 컬럼 checkboxSelection 대체 (첫 컬럼에 자동 배치)
    headerCheckbox: true    // 구 컬럼 headerCheckboxSelection 대체
  }), []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('가입고 등록이 완료되었습니다.\n내역 화면으로 이동합니다.'); 
    setActivePage('history');
  };

  return (
    <div className="page-panel active">
      <div className="section-header"><h1 className="section-title">가입고(Ipgo) 등록</h1></div>
      
      <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="form-grid">
          <div className="form-group"><label>업체명</label><input type="text" value="(주)한국정밀" readOnly style={{ background: '#f5f5f5', color: '#888' }} /></div>
          <div className="form-group"><label>운전자</label><input type="text" placeholder="예: 홍길동" required /></div>
          <div className="form-group"><label>운전자 연락처</label><input type="text" placeholder="예: 010-1234-5678" required /></div>
          <div className="form-group"><label>주문번호</label><input type="text" placeholder="예: ORD-20260626-001" required /></div>
          <div className="form-group"><label>입고 예정일시</label><input type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} required /></div>
        </div>
        
        <h3 style={{ fontSize: '14px', margin: '15px 0 8px 0', color: '#333' }}>
          품목 명세 ('금회 납품수량'은 더블클릭하여 수정 가능)
        </h3>
        
        
        <div className="ag-theme-alpine" style={{ flex: 1, minHeight: 250, width: '100%', marginBottom: 12 }}>
            <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                theme="legacy"
                rowSelection={rowSelection}
                onCellValueChanged={(params) => console.log('데이터 수정됨:', params.data)}
                headerHeight={28}
                rowHeight={26}
            />
        </div>

        <div className="btn-container">
          <button type="submit" className="btn-submit">가입고 전송 (Ipgo 등록)</button>
        </div>
      </form>
    </div>
  );
}