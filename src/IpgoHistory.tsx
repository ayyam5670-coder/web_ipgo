import { useState } from 'react';

interface PlayItem {
  partNo: string;
  partName: string;
  qty: string;
  unit: string;
}

export default function AsnHistory() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedOrderNo, setSelectedOrderNo] = useState<string>('');
  const [modalItems, setModalItems] = useState<PlayItem[]>([]);

  const sampleDetails: Record<string, PlayItem[]> = {
    'ORD-20260626-001': [
      { partNo: 'BRK-FRONT-01', partName: '브레이크 패드 (앞)', qty: '500', unit: 'EA' },
      { partNo: 'BOLT-M08-L20', partName: '조립용 플랜지 볼트', qty: '2,000', unit: 'EA' }
    ],
    'ORD-20260625-042': [
      { partNo: 'BRK-FRONT-01', partName: '브레이크 패드 (앞)', qty: '1,000', unit: 'EA' }
    ]
  };

  const openDetails = (orderNo: string) => {
    setSelectedOrderNo(orderNo);
    setModalItems(sampleDetails[orderNo] || []);
    setIsModalOpen(true);
  };

  return (
    <div className="page-panel active">
      <div className="section-header"><h1 className="section-title">가입고 등록 내역 현황</h1></div>
      <p style={{ fontSize: '15px', color: '#666', marginBottom: '25px' }}>우리 회사에서 등록한 최근 가입고 신청 목록과 내부 MES 처리 상태입니다.</p>
      
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>주문번호</th><th>등록일자</th><th>입고예정일</th><th>품목건수</th><th>총 수량</th><th>진행 상태</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>ORD-20260626-001</strong></td>
              <td>2026-06-26</td>
              <td>2026-06-26 17:00</td>
              <td><span className="clickable-count" onClick={() => openDetails('ORD-20260626-001')}>2건</span></td>
              <td>2,500 EA</td>
              <td><span className="badge badge-ready">대기 (정문미통과)</span></td>
            </tr>
            <tr>
              <td><strong>ORD-20260625-042</strong></td>
              <td>2026-06-25</td>
              <td>2026-06-25 10:30</td>
              <td><span className="clickable-count" onClick={() => openDetails('ORD-20260625-042')}>1건</span></td>
              <td>1,000 EA</td>
              <td><span className="badge badge-complete">입고완료 (MES반영)</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 모달 팝업 */}
      {isModalOpen && (
        <div id="detailModal" className="modal" style={{ display: 'flex' }} onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>가입고 품목 명세 상세조회 [주문번호: {selectedOrderNo}]</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', marginBottom: '15px', color: '#555' }}>선택하신 주문번호의 세부 납품 품목 내역입니다.</p>
              <div className="table-wrap" style={{ marginBottom: 0 }}>
                <table>
                  <thead>
                    <tr><th>품번 (Part No.)</th><th>품명 (Part Name)</th><th>납품 수량</th><th>단위</th></tr>
                  </thead>
                  <tbody>
                    {modalItems.map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{item.partNo}</strong></td>
                        <td>{item.partName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e3d59' }}>{item.qty}</td>
                        <td>{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-close-modal" onClick={() => setIsModalOpen(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}