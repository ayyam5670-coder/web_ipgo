import React from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

interface IpgoHistoryMaster {
  ipgoNumb: string;    // 가입고번호
  ipgoDate: string;    // 입고예정일자
  ordrNumb: string;    // 발주번호
  saveDate?: string;   // 등록일/저장일
  lastDate?: string;   // 최근입고일
  itemSummary?: string;// 품목 요약
  statType?: 'Y' | 'N';
}

interface IpgoHistoryDetail {
  ipgoNumb?: string;
  ipgoDate?: string;
  itemCode?: string;    // 품번
  itemName?: string;    // 품명
  ordrQnty?: number;    // 발주수량
  miQnty?: number;      // 미입고/필요수량
  gaipQnty?: number;    // 금회/가입고 수량
  unit?: string;        // 단위
  statType?: 'Y' | 'N';
  ordrDetl?: string;
}

export interface PrintSheetGroup {
  master: IpgoHistoryMaster;
  items: IpgoHistoryDetail[];
}

interface IpgoPrintSheetProps {
  selectedData: PrintSheetGroup[] | any[];
  custName?: string;
}

export const IpgoPrintSheet = React.forwardRef<HTMLDivElement, IpgoPrintSheetProps>(
  ({ selectedData, custName }, ref) => {
    
    console.log('=== [IpgoPrintSheet] Received selectedData ===', selectedData);

    const currentDate = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
      <div ref={ref} style={{ color: '#000', backgroundColor: '#fff', width: '100%' }}>
        
        {/* 인쇄 제어용 CSS */}
        <style>{`
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }
            @page {
              size: A4 portrait;
              margin: 0;
            } 
            .page-container {
              page-break-after: always;
              break-after: page;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .page-container:last-child {
              page-break-after: auto;
              break-after: auto;
            }
          }
        `}</style>

        {selectedData?.map((group: any, index: number) => {
          // 마스터 정보 추출
          const master = group?.master || group; 

          // 가입고 번호 추출
          const targetIpgoNumb = master?.ipgoNumb || group?.ipgoNumb || '';

          // 아이템 목록 추출 (items, details, itemList, list 등 여러 필드명 대응)
          const rawItems = group?.items || group?.details || group?.itemList || group?.list || [];
          const items: IpgoHistoryDetail[] = Array.isArray(rawItems) ? rawItems : [];
          
          const TOTAL_ROWS = 15; // A4 1페이지 고정 행 수

          // 금회 가입고 수량 총합 계산
          const totalQty = items.reduce((sum, item) => {
            const qnty = item?.gaipQnty ?? (item as any)?.qty ?? (item as any)?.qnty ?? 0;
            return sum + (Number(qnty) || 0);
          }, 0);
          
          // 빈 행 개수 계산
          const emptyRowsCount = Math.max(0, TOTAL_ROWS - items.length);

          return (
            <div 
              key={index} 
              className="page-container"
              style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '15mm 15mm',
                fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif",
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                margin: '0 auto'
              }}
            >
              {/* 상단 및 본문 영역 */}
              <div>
                {/* 상단 헤더 영역 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '12px' }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '24px', letterSpacing: '2px', fontWeight: 'bold' }}>물류 가입고 내역서</h1>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#555' }}>출력일자: {currentDate}</p>
                  </div>
                  
                  {/* 바코드: 가입고번호 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {targetIpgoNumb ? (
                      <Barcode value={targetIpgoNumb} height={35} width={1.3} fontSize={10} margin={0} />
                    ) : (
                      <span style={{ fontSize: '10px', color: '#888' }}>바코드 없음</span>
                    )}
                  </div>
                </div>

                {/* 공급자 / 납품처 정보 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '12px' }}>
                  <div style={{ width: '49%', border: '1px solid #000', padding: '8px 10px', boxSizing: 'border-box' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px dashed #ccc', paddingBottom: '2px' }}>[공급업체]</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '4px' }}>
                      {custName || '(주) 공급업체'}
                    </div>
                  </div>
                  <div style={{ width: '49%', border: '1px solid #000', padding: '8px 10px', boxSizing: 'border-box' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px dashed #ccc', paddingBottom: '2px' }}>[납품처]</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '4px' }}>(주) SH테크</div>
                    <div>발주번호 : {master?.ordrNumb || '-'}</div>
                    <div>입고예정일 : {master?.ipgoDate || '-'}</div>
                    <div>가입고번호 : {targetIpgoNumb || '-'}</div>
                  </div>
                </div>

                {/* 상세 품목 내역 테이블 */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', fontSize: '11px', tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '6%', border: '1px solid #000', padding: '6px 4px', backgroundColor: '#f2f2f2', textAlign: 'center' }}>No</th>
                      <th style={{ width: '22%', border: '1px solid #000', padding: '6px 4px', backgroundColor: '#f2f2f2', textAlign: 'center' }}>품목코드</th>
                      <th style={{ width: '42%', border: '1px solid #000', padding: '6px 4px', backgroundColor: '#f2f2f2', textAlign: 'center' }}>품명</th>
                      <th style={{ width: '18%', border: '1px solid #000', padding: '6px 4px', backgroundColor: '#f2f2f2', textAlign: 'center' }}>금회 납품수량</th>
                      <th style={{ width: '12%', border: '1px solid #000', padding: '6px 4px', backgroundColor: '#f2f2f2', textAlign: 'center' }}>단위</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 실제 아이템 목록 바인딩 */}
                    {items.length > 0 ? (
                      items.map((item: any, itemIdx: number) => {
                        const code = item?.itemCode || item?.cdItem || '-';
                        const name = item?.itemName || item?.nmItem || '-';
                        const qty = item?.gaipQnty ?? item?.qty ?? item?.qnty ?? 0;
                        const unit = item?.unit || item?.stndUnit || 'EA';

                        return (
                          <tr key={itemIdx}>
                            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{itemIdx + 1}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{code}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {name}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', fontWeight: 'bold' }}>
                              {(Number(qty) || 0).toLocaleString()}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{unit}</td>
                          </tr>
                        );
                      })
                    ) : null}

                    {/* 남은 영역을 채우는 빈 행 생성 */}
                    {Array.from({ length: emptyRowsCount }).map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{items.length + i + 1}</td>
                        <td style={{ border: '1px solid #000', padding: '5px 4px' }}>&nbsp;</td>
                        <td style={{ border: '1px solid #000', padding: '5px 4px' }}>&nbsp;</td>
                        <td style={{ border: '1px solid #000', padding: '5px 4px' }}>&nbsp;</td>
                        <td style={{ border: '1px solid #000', padding: '5px 4px' }}>&nbsp;</td>
                      </tr>
                    ))}

                    {/* 합계 행 */}
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#faf8f5' }}>
                      <td colSpan={3} style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center' }}>합 계</td>
                      <td style={{ border: '1px solid #000', padding: '6px 6px', textAlign: 'right' }}>{totalQty.toLocaleString()}</td>
                      <td style={{ border: '1px solid #000', padding: '6px 4px' }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. 하단 서명 및 QR 코드 안내 */}
              <div style={{ 
                marginTop: '20px',
                paddingTop: '10px',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-end'
              }}>
                <div style={{ fontSize: '10px', color: '#555', lineHeight: '1.5' }}>
                  * 본 명세서는 SH테크 자재관리 포탈 시스템에서 출력되었습니다.
                </div>
                {/* QR 코드 */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', marginBottom: '3px', fontWeight: 'bold' }}>가입고번호 QR</div>
                  {targetIpgoNumb ? (
                    <QRCodeSVG value={targetIpgoNumb} size={55} />
                  ) : (
                    <div style={{ width: 55, height: 55, border: '1px solid #ccc', fontSize: '8px' }}>QR 없음</div>
                  )}
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