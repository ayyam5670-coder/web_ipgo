import React from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

interface PrintItem {
  ipgoNo: string;
  ordrNo: string;
  itemCode: string;
  itemName: string;
  spec: string;
  qty: number;
  unit: string;
  ipgoDate: string;
  ordrDate: string;
}

interface IpgoPrintSheetProps {
  selectedData: PrintItem[];
}

export const IpgoPrintSheet = React.forwardRef<HTMLDivElement, IpgoPrintSheetProps>(
  ({ selectedData }, ref) => {
    
    const currentDate = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
      /* 최상단 컨테이너: 외부 여백을 일절 주지 않아 2페이지부터 밀리는 현상을 방지 */
      <div ref={ref} style={{ color: '#000', backgroundColor: '#fff', width: '100%' }}>
        
        {/* 브라우저 인쇄 엔진 제어용 최소한의 미디어 쿼리만 남김 */}
        <style>{`
          @media print {
            body { background: none; }
            @page { size: A4; margin: 0mm; } 
            .page-break { page-break-after: always; break-after: page; }
            .page-break:last-child { page-break-after: avoid; break-after: avoid; }
          }
        `}</style>

        {selectedData.map((item, index) => {
          const TOTAL_ROWS = 20; 
          const totalQty = item.qty || 0; 

          return (
            /* 각 A4 한 장을 담당하는 독립 박스 (인라인 스타일로 규격 고정) */
            <div 
              key={index} 
              className="page-break"
              style={{
                width: '100%',
                height: '296mm',
                padding: '20mm 18mm',
                fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif",
                position: 'relative',
                boxSizing: 'border-box'
              }}
            >
              
              {/* 1. 상단 헤더 영역 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '15px' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '26px', letterSpacing: '2px', fontWeight: 'bold' }}>물류 가입고 내역서</h1>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#555' }}>출력일자: {currentDate}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Barcode value={item.ipgoNo || 'N/A'} height={40} width={1.4} fontSize={10} margin={0} />
                </div>
              </div>

              {/* 2. 공급자 / 공급받는자 기본 정보 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '13px' }}>
                <div style={{ width: '49%', border: '1px solid #000', padding: '10px', boxSizing: 'border-box' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px dashed #ccc', paddingBottom: '4px' }}>[공급업체]</div>
                  <div>(주) 부품회사</div>
                  <div>대표자: 홍길동</div>
                  <div>전화번호: 02-1234-5678</div>
                </div>
                <div style={{ width: '49%', border: '1px solid #000', padding: '10px', boxSizing: 'border-box' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px dashed #ccc', paddingBottom: '4px' }}>[납품처]</div>
                  <div>SH테크 본사 물류창고</div>
                  <div>발주번호 : {item.ordrNo || 'N/A'} <span style={{ marginLeft: '60px' }}>발주일 : {item.ordrDate || '2026-06-30'}</span></div>
                  <div>가입고번호 : {item.ipgoNo || 'N/A'}</div>
                </div>
              </div>

              {/* 3. 품목 내역 테이블 (인라인으로 완벽 통제) */}
              <table style={{ width:'100%', borderCollapse: 'collapse', marginTop: '20px', fontSize: '12px', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '6%', border: '1px solid #000', padding: '5px 8px', backgroundColor: '#f2f2f2' }}>No</th>
                    <th style={{ width: '24%', border: '1px solid #000', padding: '5px 8px', backgroundColor: '#f2f2f2' }}>품목코드</th>
                    <th style={{ width: '44%', border: '1px solid #000', padding: '5px 8px', backgroundColor: '#f2f2f2' }}>품목명</th>
                    <th style={{ width: '16%', border: '1px solid #000', padding: '5px 8px', backgroundColor: '#f2f2f2' }}>수량</th>
                    <th style={{ width: '10%', border: '1px solid #000', padding: '5px 8px', backgroundColor: '#f2f2f2' }}>단위</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 실제 데이터 1번 행 */}
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center' }}>1</td>
                    <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center' }}>{item.itemCode}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'left' }}>{item.itemName}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>{item.qty?.toLocaleString()}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center' }}>{item.unit || 'EA'}</td>
                  </tr>

                  {/* 공백 빈 행들 생성 */}
                  {Array.from({ length: TOTAL_ROWS - 1 }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center' }}>{i + 2}</td>
                      <td style={{ border: '1px solid #000', padding: '5px 8px' }}>&nbsp;</td>
                      <td style={{ border: '1px solid #000', padding: '5px 8px' }}>&nbsp;</td>
                      <td style={{ border: '1px solid #000', padding: '5px 8px' }}>&nbsp;</td>
                      <td style={{ border: '1px solid #000', padding: '5px 8px' }}>&nbsp;</td>
                    </tr>
                  ))}

                  {/* 합계 행 */}
                  <tr style={{ fontWeight: 'bold', backgroundColor: '#faf8f5' }}>
                    <td colSpan={3} style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>합 계</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right' }}>{totalQty.toLocaleString()}</td>
                    <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                  </tr>
                </tbody>
              </table>


              {/* 4. 하단 서명 및 QR 코드 안내 */}
              <div style={{ 
                marginTop: '40px',       /* 테이블 합계 행과 하단 영역 사이에 40px */
                padding: '0 5px',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-end'
              }}>
                <div style={{ fontSize: '11px', color: '#333', lineHeight: '1.6' }}>
                  * 본 명세서는 SH테크 자재관리 포탈 시스템에서 출력되었습니다.
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', marginBottom: '4px', fontWeight: 'bold' }}>모바일 조회 QR</div>
                  <QRCodeSVG value={`https://srm.shtech.com/check/ipgo?no=${item.ipgoNo}`} size={60} />
                </div>
              </div>

            </div>
          );
        })}
      </div>
    );
  }
);

IpgoPrintSheet.displayName = 'IpgoPrintSheet';