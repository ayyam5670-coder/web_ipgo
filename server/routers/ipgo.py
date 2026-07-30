from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel
import os
import pyodbc
from dotenv import load_dotenv
from queries import ipgo_queries
from typing import List, Optional

ipgo_router = APIRouter(prefix="/api/ipgo", tags=["가입고 관리"])
auth_router = APIRouter(prefix="/api/auth", tags=["인증 관리"])

# .env 환경변수 로드
load_dotenv()

# DB 연결 함수 (라우터 내부에서 공통으로 사용)
def get_db_connection():
    server = os.getenv("SERVER")
    database = os.getenv("DATABASE")
    uid = os.getenv("UID")
    pwd = os.getenv("PWD")
    timeout = int(os.getenv("TIMEOUT", 30))
    driver = os.getenv("DRIVER", "ODBC Driver 17 for SQL Server")

    conn_str = (
        f"DRIVER={{{driver}}};"
        f"SERVER={server};"
        f"DATABASE={database};"
        f"UID={uid};"
        f"PWD={pwd};"
        f"Encrypt=no;"  # 필요시 보안/인증서 관련 옵션 추가
    )

    try:
        # timeout 매개변수를 지정하여 응답 지연 시 연결 대기 시간을 제어합니다.
        conn = pyodbc.connect(conn_str, timeout=timeout)
        return conn
    except Exception as e:
        print(f"[DB Connection Error] {e}")
        raise e

# ----------------------------------------------------
# 품목추가 버튼 모달용 전체 품목 리스트 조회 API
# ----------------------------------------------------
@ipgo_router.get("/items")
def get_all_items(itemGubn: str = "", searchText: str = ""):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 쿼리에 포함된 3개의 '?'에 매핑할 검색어 가공 ("%%"가 되면 전체조회)
        search_param = f"%{searchText}%"
        
        cursor.execute(ipgo_queries.SELECT_ALL_ITEMS, (search_param, search_param, search_param)) 
        rows = cursor.fetchall()
        
        item_list = []
        for row in rows:
            item_list.append({
                "itemCode": row[0],
                "atskCode": row[1],
                "itemName": row[2],
                "itemGrup": row[3],
                "itemGubn": row[4],
                "itemGubnName": row[5],
                "unit": row[6]
            })
        return item_list
        
    except Exception as e:
        print(f"❌ 전체 품목 조회 에러: {e}")
        raise HTTPException(status_code=500, detail="DB 조회 중 오류가 발생했습니다.")
    finally:
        conn.close()

# ----------------------------------------------------
# 검색용 개별 품목 조회 API / 스캔 부분은 일단 주석처리
# ----------------------------------------------------
# @router.get("/items/{item_code}")
# def get_item_by_code(item_code: str):
#     conn = get_db_connection()
#     cursor = conn.cursor()
    
#     try:
#         cursor.execute(ipgo_queries.SELECT_ITEM_BY_CODE, item_code.strip())
#         row = cursor.fetchone()
        
#         if row:
#             return {
#                 "itemCode": row[0],
#                 "atskCode": row[1],
#                 "itemName": row[2],
#                 "itemGubn": row[3],
#                 "itemGrup": row[4]
#             }
#         else:
#             raise HTTPException(status_code=404, detail="등록되지 않은 품목입니다.")
#     except Exception as e:
#         print(f"❌ 개별 품목 조회 에러: {e}")
#         raise HTTPException(status_code=500, detail="DB 조회 중 오류가 발생했습니다.")
#     finally:
#         conn.close()

@ipgo_router.get("/item/gubn")
def get_item_gubn_list():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(ipgo_queries.SELECT_ITEM_GUBN_LIST)
        rows = cursor.fetchall()
        
        gubn_list = []
        for row in rows:
            gubn_list.append({
                "code": row[0],
                "name": row[1]
            })
        return gubn_list
        
    except Exception as e:
        print(f"❌ 품목 유형 조회 에러: {e}")
        raise HTTPException(status_code=500, detail="DB 조회 중 오류가 발생했습니다.")
    finally:
        conn.close()

# ----------------------------------------------------
# 발주서 모달창용 마스터 리스트 조회 API
# ----------------------------------------------------
@ipgo_router.get("/ordr")
def get_ordr_master_list(
        startDate: str, 
        endDate: str, 
        cust_code: str,
        searchText: str = ""):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # LIKE 절에 사용할 검색어 가공
        search_param = f"%{searchText}%"
        
        # 쿼리의 ? 순서와 개수(4개)에 정확히 맞춰서 튜플로 전달
        cursor.execute(
            ipgo_queries.SELECT_ORDR_MASTER_LIST, 
            (
                cust_code,
                startDate, 
                endDate, 
                search_param, 
                search_param, 
                search_param
             )
        )
        rows = cursor.fetchall()
        
        ordr_list = []
        for row in rows:
            # 인터페이스 Key명과 일치
            ordr_list.append({
                "ordrNumb": row[0],
                "itemSummary": row[1],
                "ordrDate": row[2],
            })
            
        return ordr_list
        
    except Exception as e:
        print(f"❌ 발주 마스터 조회 에러: {e}")
        raise HTTPException(status_code=500, detail="발주 목록을 조회하는 중 에러가 발생했습니다.")
    finally:
        conn.close()

# ----------------------------------------------------
# 발주서 선택 시 해당 발주의 상세 품목 리스트 조회 API
# ----------------------------------------------------
@ipgo_router.get("/ordr/{ordr_numb}/items")
def get_ordr_detail_items(cust_code: str, ordr_numb: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            ipgo_queries.SELECT_ORDR_DETL_ITEMS,
            (
                cust_code,
                ordr_numb.strip()
            )
              
        )
        rows = cursor.fetchall()
        
        detail_items = []
        for row in rows:
            detail_items.append({
                "ordrNumb": row[0],
                "ordrDate": row[1],
                "itemCode": row[2],
                "statType" : row[3],
                "atskCode": row[4],
                "itemName": row[5],
                "itemGrup": row[6],
                "ordrQnty": row[7],     # 발주수량
                "apgoQnty": row[8],     # 총입고수량
                "miQnty": row[9],       # 미입고수량
                "summGaip": row[10],    # 누적 가입고수량
                "unit": row[11],        # 단위
                "ordrDetl": row[12],    # ordr_numb
            })
        return detail_items
        
    except Exception as e:
        print(f"❌ 발주 상세 품목 조회 에러: {e}")
        raise HTTPException(status_code=500, detail="발주 상세 내역을 조회하는 중 오류가 발생했습니다.")
    finally:
        conn.close()



# ----------------------------------------------------
# 가입고 내역 메뉴 메인 리스트 조회 API
# ----------------------------------------------------
@ipgo_router.get("/menu/gaipHistory")
def get_gaip_history_masters(
    startDate: str, 
    endDate: str, 
    cust_code: str,
    searchText: str = "", 
    statType: str = ""
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        search_param = f"%{searchText}%"
        stat_param = "%" if not statType or statType == "전체" else f"%{statType}%" 
        
        cursor.execute(
            ipgo_queries.SELECT_GAIP_HISTOTY_MAIN_LIST,
            (
                cust_code,
                startDate,
                endDate,
                stat_param,
                search_param,
                search_param,
                search_param
            )
        )
        rows = cursor.fetchall()

        gaip_histories = []
        for row in rows:
            gaip_histories.append({
                "ipgoNumb": row[0],     # AS ipgoNumb (가입고번호)
                "ipgoDate": row[1],     # AS ipgoDate (입고예정일자)
                "ordrNumb": row[2],     # AS ordrNumb (발주번호)
                "saveDate": row[3],     # AS saveDate (등록일/저장일)
                "lastDate": row[4],     # AS lastDate (최근입고일)
                "itemSummary": row[5],  # AS itemSummary (품목 요약)
                "statType": row[6],     # AS statType ('N' | 'Y')
                "ordrStat": row[7],     # 발주 진행상태
            })

        return gaip_histories

    except Exception as e:
        print(f"❌ 가입고 내역 메인 조회 에러: {e}")
        raise HTTPException(status_code=500, detail="가입고 내역을 조회하는 중 에러가 발생했습니다.")
    finally:
        conn.close()


# ----------------------------------------------------
# 가입고 내역 상세 품목 모달 조회 API
# ----------------------------------------------------
@ipgo_router.get("/gaip/{gaip_numb}/items")
def get_gaip_history_detail_items(cust_code: str, gaip_numb: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        search_ipgo_numb = f"%{gaip_numb.strip()}%"
        
        cursor.execute(
            ipgo_queries.SELECT_GAIP_HISTORY_DETL_ITEMS, 
            cust_code, search_ipgo_numb
        )
        rows = cursor.fetchall()
        
        detail_items = []
        for row in rows:
            detail_items.append({
                "ipgoNumb": row[0],   # A.ipgo_numb
                "ipgoDate": row[1],   # A.ipgo_date
                "itemCode": row[2],   # B.item_code
                "gaipQnty": row[3],   # B.gaip_qnty (금회/가입고 수량)
                "statType": row[4],   # B.stat_type AS statType
                "itemName": row[5],   # C.item_name
                "unit": row[6],       # C.qnty_code AS unit
                "ordrQnty": row[7],   # D.ordr_qnty (발주 수량)
                "miQnty": row[8],     # D.mi_qnty (미입고 수량 / 필요 수량)
                "ordrDetl": row[9],   # ordr_numb
                "summGaip": row[10],    # 누적가입고수량
            })
        return detail_items
        
    except Exception as e:
        print(f"❌ 가입고 상세 품목 조회 에러: {e}")
        raise HTTPException(status_code=500, detail="가입고 상세 내역을 조회하는 중 오류가 발생했습니다.")
    finally:
        conn.close()


# ----------------------------------------
# 가입고 상세 수정 요청 모델
# ----------------------------------------
class GaipDetailUpdateItem(BaseModel):
    itemCode: str
    gaipQnty: float
    statType: str  # '진행'('N') 또는 '종결'('Y') 등 프론트엔드에서 전달되는 값

class GaipDetailUpdateRequest(BaseModel):
    items: List[GaipDetailUpdateItem]


# ----------------------------------------------------
# 가입고 상세 품목 수정 (수량 및 상태 변경) API
# ----------------------------------------------------
@ipgo_router.put("/gaip/{gaip_numb}/items")
def update_gaip_history_detail_items(
    gaip_numb: str, 
    payload: GaipDetailUpdateRequest,
    cust_code: Optional[str] = None
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="수정할 품목 데이터가 없습니다.")

    conn = get_db_connection()
    cursor = conn.cursor()
    updated_count = 0

    try:
        # Pydantic items 리스트를 순회하며 개별 UPDATE 실행
        for item in payload.items:
            cursor.execute(
                ipgo_queries.UPDATE_GAIP_DETL_ITEM,
                (
                    item.gaipQnty,
                    item.statType,
                    gaip_numb.strip(),
                    item.itemCode.strip()
                )
            )
            updated_count += cursor.rowcount

        # 모든 품목 업데이트 완료 후 커밋
        conn.commit()

        return {
            "success": True,
            "message": f"총 {updated_count}건의 가입고 내역이 수정되었습니다.",
            "updatedCount": updated_count
        }

    except Exception as e:
        conn.rollback()  # 예외 발생 시 트랜잭션 롤백
        print(f"❌ 가입고 상세 품목 수정 에러: {e}")
        raise HTTPException(status_code=500, detail="가입고 내역 수정 처리 중 오류가 발생했습니다.")
    finally:
        conn.close()



# ----------------------------------------
# 가입고 등록 라우터 = 프로시저 연결
# ----------------------------------------

class GaipgoDetailItem(BaseModel):
    itemCode: str
    ordrDetl: str  # ordr_numb = ordr_numa + sqen_numb (ordrDetl)
    gaipQnty: float
    memoXxxx: Optional[str] = ""

class GaipgoCreateRequest(BaseModel):
    ipgoDate: str
    custCode: str
    userName: str
    ordrNumb: str
    teleNumb: Optional[str] = ""
    storCode: Optional[str] = "E010"
    memoXxxx: Optional[str] = ""
    statType: Optional[str] = "Y"
    items: List[GaipgoDetailItem]


# ----------------------------------------
# 가입고 등록 API
# ----------------------------------------
@ipgo_router.post("/create")
def create_gaipgo_info(payload: GaipgoCreateRequest, request: Request):
    if not payload.items:
        raise HTTPException(status_code=400, detail="등록할 품목 목록이 없습니다.")

    client_ip = request.headers.get("x-forwarded-for")

    # 접속자 IP 추적
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    else:
        # 2. request.client가 None이 아닐 때만 host에 접근
        if request.client and hasattr(request.client, "host"):
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"  # 감지 실패 시 기본 IP (또는 빈값 "")

    conn = get_db_connection()
    cursor = conn.cursor()

    generated_ipgo_numb = ""  # 첫번째 품목 저장 시 생성된 IPGO_NUMB를 백엔드에서 유지
    inserted_count = 0

    try:
        # 품목 목록(items) 수만큼 반복 실행
        for index, item in enumerate(payload.items):

            # 두 번째 품목(index > 0)부터는 첫 번째 실행에서 만들어진 가입고 번호를 넘겨줌
            current_ipgo_param = generated_ipgo_numb if index > 0 else ""

            params = (
                current_ipgo_param,                 # @v_IPGO_NUMB (첫 번째 호출 시 빈값)
                payload.ipgoDate,                   # @v_IPGO_DATE
                payload.custCode,                   # @v_CUST_CODE
                payload.userName,                   # @v_USER_NAME
                payload.teleNumb or "",             # @v_TELE_NUMB
                payload.storCode or "E010",          # @v_STOR_CODE
                payload.memoXxxx or "",             # @v_MEMO_XXXX
                payload.ordrNumb.strip(),           # @v_ORDR_NUMB
                item.itemCode,                      # @v_ITEM_CODE
                item.ordrDetl,                      # @v_ORDR_DETL (조회 결과의 ordrDetl)
                item.gaipQnty,                      # @v_GAIP_QNTY
                payload.statType or "Y",             # @v_STAT_TYPE
                client_ip
            )

            # ipgo_queries.py 상수의 SQL 실행
            cursor.execute(ipgo_queries.EXEC_SP_GAIP_INFO_INSERT, params)
            row = cursor.fetchone()

            if row and row[0]:
                # 채번된 가입고 번호 획득 (예: P2607270001)
                generated_ipgo_numb = row[0]

            inserted_count += 1

        # 전체 디테일 항목 저장이 무사히 끝나면 커밋
        conn.commit()

        return {
            "success": True,
            "message": "가입고 등록이 완료되었습니다.",
            "ipgoNumb": generated_ipgo_numb,
            "insertedCount": inserted_count
        }

    except Exception as e:
        conn.rollback()  # 예외 발생 시 전체 트랜잭션 롤백
        print(f"❌ 가입고 등록 처리 에러: {e}")
        raise HTTPException(status_code=500, detail="가입고 등록 처리 중 오류가 발생했습니다.")
    finally:
        conn.close()


# ----------------------------------------------------
# 발주 내역 메뉴 메인 리스트 조회 API
# ----------------------------------------------------
@ipgo_router.get("/menu/ordrHistory")
def get_order_menu_masters(
        startDate: str, 
        endDate: str, 
        cust_code: str,
        searchText: str = "", 
        statType: str = ""):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        search_param = f"%{searchText}%"
        stat_param = f"%{statType}%" 
        
        cursor.execute(
            ipgo_queries.SELECT_ORDR_MENU_MAIN_LIST,
            (
                cust_code,
                startDate,
                endDate,
                stat_param,
                search_param,
                search_param
            )
        )
        rows = cursor.fetchall()

        ordr_menus = []
        for row in rows:
            ordr_menus.append({
                "ordrNumb": row[0],
                "ordrDate": row[1],
                "deryDate": row[2],
                "itemSummary": row[3],
                "statType": row[4],
            })

        return ordr_menus

    except Exception as e:
        print(f"❌ 발주 내역 조회 에러: {e}")
        raise HTTPException(status_code=500, detail="발주 내역을 조회하는 중 에러가 발생했습니다.")
    finally:
        conn.close()


# ================================================================ 로그인 관련 라우터
# Request Body 스키마
class LoginRequest(BaseModel):
    custCode: str
    password: str

@auth_router.post("/login")
def login(req: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # pyodbc 파라미터 순서: (비밀번호, 유저코드) -> MATCHED_USER_LOGIN의 ? 순서와 일치
        cursor.execute(ipgo_queries.MATCHED_USER_LOGIN, (req.password, req.custCode))
        row = cursor.fetchone()
        
        # 1. 유저 코드가 존재하지 않는 경우
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="존재하지 않는 협력사 코드입니다."
            )
        
        custCode = row[0]
        custName = row[1]
        is_matched = row[2]  # PWDCOMPARE 결과 (1: 일치, 0: 불일치)
        
        # 2. 비밀번호 불일치
        if is_matched != 1:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="비밀번호가 일치하지 않습니다."
            )
            
        # 3. 인증 성공 시 유저 정보 반환
        return {
            "success": True,
            "message": "로그인 성공",
            "cust_code": custCode,
            "cust_name": custName
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"❌ 로그인 처리 에러: {e}")
        raise HTTPException(status_code=500, detail="로그인 처리 중 오류가 발생했습니다.")
    finally:
        conn.close()