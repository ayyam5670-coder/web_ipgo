# 품목추가 버튼 모달 - 품목 리스트 전체 조회
SELECT_ALL_ITEMS = """
    SELECT item_code
           , atsk_code AS atskCode
           , item_name AS itemName
           , item_grup AS itemGrup
           , A.item_gubn AS itemGubn
           , B.name AS itemGubnName
           , A.qnty_code AS unit
    FROM   be_item_info A
    LEFT JOIN (
                SELECT code, name
                FROM sys_code_info
                WHERE grup_code = 'item_gubn'
    ) as B ON A.item_gubn = B.code 
    where (
            item_code LIKE ? 
            OR atsk_code LIKE ? 
            OR item_name LIKE ?
            )
    AND A.item_gubn like '2%' 
    ORDER BY item_gubn
"""

# item_code와 atsk_code로 품목 조회
SELECT_ITEM_BY_CODE = """
    SELECT item_code, atsk_code, item_name, item_gubn, item_grup
    FROM   be_item_info
    WHERE (item_code = ? OR atsk_code = ?)
"""

# 셀렉트박스 품목 유형
SELECT_ITEM_GUBN_LIST = """
    SELECT code, name
    FROM sys_code_info
    WHERE grup_code = 'item_gubn'
    AND code like '2%'
    ORDER BY code
"""

# 가입고 내역 메뉴 메인 그리드 조회 쿼리
SELECT_GAIP_HISTOTY_MAIN_LIST = """
        SELECT A.ipgo_numb                                      AS ipgoNumb
                , A.ipgo_date                                   AS ipgoDate      -- 입고예정일자
                , B.ordr_numb
                , REPLACE(CONVERT(VARCHAR(10), A.in_date, 120), '-', '')                   AS saveDate 
                , REPLACE(CONVERT(VARCHAR(10), B.last_up_date, 120), '-', '')              AS lastDate
                , CASE WHEN B.total_count > 1 
                THEN ISNULL(C.item_name, B.first_item_code) + ' 외 ' + CAST((B.total_count - 1) AS VARCHAR) + '건' 
                ELSE ISNULL(C.item_name, B.first_item_code)
                END                                              AS itemSummary
                , B.calculated_stat_type                         AS statType
                , D.ordr_stat
        FROM mt_gaip_mast AS A
        LEFT JOIN (
                        SELECT ipgo_numb
                                , B.ordr_numb
                                , MAX(CASE WHEN rn = 1 THEN item_code END) AS first_item_code
                                , COUNT(*)                                 AS total_count
                                , MAX(up_date)                             AS last_up_date
                                , CASE WHEN SUM(CASE WHEN stat_type = 'N' THEN 1 ELSE 0 END) > 0 
                                        THEN 'N' ELSE 'Y' END                   AS calculated_stat_type
                        FROM (
                                SELECT ipgo_numb
                                        , ordr_numb
                                        , item_code
                                        , up_date
                                        , stat_type
                                        , ROW_NUMBER() OVER (PARTITION BY ipgo_numb ORDER BY sqen_numb) AS rn
                                FROM   mt_gaip_detl
                        ) AS A
                        LEFT JOIN (
                                        SELECT ordr_numb, sqen_numb
                                        FROM	  MT_ORDR_DETL
                        ) AS B ON A.ordr_numb = B.ordr_numb + B.sqen_numb
                        GROUP BY ipgo_numb, B.ordr_numb
        ) AS B ON A.ipgo_numb = B.ipgo_numb
        LEFT JOIN be_item_info AS C ON RTRIM(LTRIM(B.first_item_code)) = RTRIM(LTRIM(C.item_code))
        LEFT JOIN (
                        SELECT ordr_numb, CASE WHEN SUM(CASE WHEN stat_type = 'N' THEN 1 ELSE 0 END) > 0 
                                                THEN 'N' ELSE 'Y' END                   AS ORDR_STAT
                        FROM mt_ordr_detl
                        GROUP BY ordr_numb
        )AS  D ON B.ordr_numb = D.ordr_numb
        WHERE   A.cust_code = ?
                AND (A.ipgo_date BETWEEN ? AND ?)
                AND B.calculated_stat_type LIKE ?
                AND (A.ipgo_numb LIKE ? OR B.ordr_numb LIKE ? OR C.item_name LIKE ?)
        ORDER BY A.ipgo_numb DESC
"""

# 가입고 내역 메뉴 화면 모달창 상세 데이터 조회 쿼리
SELECT_GAIP_HISTORY_DETL_ITEMS = """
        SELECT A.ipgo_numb
             , A.ipgo_date
             , B.item_code
             , B.gaip_qnty
             , B.stat_type AS statType
             , C.item_name
             , ISNULL(C.name,C.qnty_code) AS unit
             , D.ordr_qnty
             , D.mi_qnty
             , D.ordr_numb AS ordrDetl
             , E.summ_gaip
        FROM mt_gaip_mast AS A
        LEFT JOIN (
                SELECT ipgo_numb, sqen_numb, ordr_numb, item_code, gaip_qnty, stat_type
                FROM mt_gaip_detl
        ) AS B ON A.ipgo_numb = B.ipgo_numb
        LEFT JOIN (
                SELECT item_code, item_name, qnty_code, name
                FROM be_item_info AS A
                LEFT JOIN (
                                SELECT code, name
                                FROM SYS_CODE_INFO
                                WHERE GRUP_CODE = 'QNTY_CODE'
                ) AS B ON A.qnty_code = B.code
                WHERE item_gubn LIKE '2%'
        ) AS C ON B.item_code = C.item_code
        LEFT JOIN (
                SELECT A.ordr_numb, A.item_code, A.ordr_qnty, B.ipgo_qnty,
                       A.ordr_qnty - ISNULL(B.ipgo_qnty, 0) AS mi_qnty
                FROM (
                        SELECT ordr_numb + sqen_numb AS ordr_numb, item_code, SUM(ISNULL(item_qnty, 0)) AS ordr_qnty
                        FROM mt_ordr_detl
                        GROUP BY ordr_numb + sqen_numb, item_code
                ) AS A
                LEFT JOIN (
                        SELECT ordr_numb, item_code, SUM(ISNULL(item_qnty, 0)) AS ipgo_qnty 
                        FROM mt_ipgo_detl
                        GROUP BY ordr_numb, item_code
                ) AS B ON A.ordr_numb = B.ordr_numb AND A.item_code = B.item_code
        ) AS D ON B.ordr_numb = D.ordr_numb
        LEFT JOIN (
                        SELECT ordr_numb,
                                item_code,
                                SUM(ISNULL(gaip_qnty,0)) AS summ_gaip
                        FROM mt_gaip_detl
                        WHERE stat_type = 'N'
                        GROUP BY ordr_numb, item_code
        ) AS E ON B.ordr_numb = E.ordr_numb AND B.item_code = E.item_code

        WHERE A.cust_code = ?
          AND A.ipgo_numb LIKE ?
"""

# 가입고 내역 메뉴 화면 수정 쿼리
UPDATE_GAIP_DETL_ITEM = """
        UPDATE mt_gaip_detl
        SET     gaip_qnty = ?,
                stat_type = ?
        WHERE ipgo_numb = ?
        AND item_code = ?
"""



# 가입고 정보 저장 프로시저 실행 쿼리
EXEC_SP_GAIP_INFO_INSERT = """
    DECLARE @out_IPGO_NUMB NVARCHAR(50) = ?;
    
    EXEC SP_MT_GAIP_INFO_INSERT
        @v_IPGO_NUMB = @out_IPGO_NUMB OUTPUT,
        @v_IPGO_DATE = ?,
        @v_CUST_CODE = ?,
        @v_USER_NAME = ?,
        @v_TELE_NUMB = ?,
        @v_STOR_CODE = ?,
        @v_MEMO_XXXX = ?,
        @v_ORDR_NUMB = ?,
        @v_ITEM_CODE = ?,
        @v_ORDR_DETL = ?,
        @v_GAIP_QNTY = ?,
        @v_STAT_TYPE = ?,
        @v_USER_IPPP = ?;

    SELECT @out_IPGO_NUMB AS IPGO_NUMB;
"""



# 발주서 모달용 마스터 목록 조회 쿼리
SELECT_ORDR_MASTER_LIST = """
        SELECT A.ordr_numb as ordrNumb
                , CASE 
                        WHEN B.total_count > 1 
                                THEN ISNULL(C.item_name, B.first_item_code) + '     외 ' + CAST((B.total_count - 1) AS VARCHAR) + '건' 
                        ELSE ISNULL(C.item_name, B.first_item_code)
                END as itemSummary
                , A.ordr_date as ordrDate
        FROM   mt_ordr_mast AS A
        LEFT JOIN (
                SELECT ordr_numb
                , MAX(CASE WHEN rn = 1 THEN item_code END) as first_item_code
                , COUNT(*) as total_count
                FROM (
                        SELECT ordr_numb
                                , item_code
                                , ROW_NUMBER() OVER (PARTITION BY ordr_numb ORDER BY sqen_numb) as rn
                                FROM mt_ordr_detl
                                -- WHERE stat_type = 'Y'
                ) AS SubD
                GROUP BY ordr_numb
        ) AS B ON A.ordr_numb = B.ordr_numb
        LEFT JOIN be_item_info AS C ON RTRIM(LTRIM(B.first_item_code)) = RTRIM(LTRIM(C.item_code))
        WHERE A.cust_code = ?
          AND (A.ordr_date BETWEEN ? AND ?)
          AND ( A.ordr_numb LIKE ?
              OR A.ordr_numb IN (
                                SELECT DISTINCT A.ordr_numb
                                FROM mt_ordr_detl AS A
                                LEFT JOIN be_item_info AS B ON RTRIM(LTRIM(A.item_code)) = RTRIM(LTRIM(B.item_code))
                                WHERE (
                                        B.item_name LIKE ?
                                        OR A.item_code LIKE ?
                                )
            )
        )
        ORDER BY A.ordr_numb DESC
"""

# 발주서 모달에서 선택한 리스트 조회하여 그리드에 뿌려줄 쿼리
SELECT_ORDR_DETL_ITEMS = """
        SELECT          A.ordr_numb
                        , A.ordr_date
			, B.item_code
                        , B.stat_type AS statType
			, C.atsk_code
                        , C.item_name
                        , C.item_grup
			-- , D.ipgo_qnty
                        , E.ordr_qnty
			, E.ipgo_qnty AS apgo_qnty
                        , E.mi_qnty
			, F.summ_gaip
                        , ISNULL(C.name, C.qnty_code) AS unit
                        , E.ordr_numb AS ordrDetl
        FROM mt_ordr_mast AS A
        LEFT JOIN (
                        SELECT ordr_numb, sqen_numb, item_code, stat_type
                        FROM mt_ordr_detl
        ) AS B ON A.ordr_numb = B.ordr_numb
        LEFT JOIN (
                        SELECT item_code, atsk_code, item_grup, item_name, qnty_code, name
                        FROM be_item_info AS A
                        LEFT JOIN (
                                        SELECT code, name
                                        FROM SYS_CODE_INFO
                                        WHERE GRUP_CODE = 'QNTY_CODE'
                        ) AS B ON A.qnty_code = B.code
                        WHERE A.item_gubn LIKE '2%'
        ) AS C ON B.item_code = C.item_code

        LEFT JOIN (
                        SELECT ordr_numb, item_code, item_qnty, ipgo_qnty, ipgo_numb
                        FROM mt_ipgo_detl
        ) AS D ON A.ordr_numb + B.sqen_numb = D.ordr_numb

        LEFT JOIN (
                        SELECT ipgo_numb, ipgo_type
                        FROM mt_ipgo_mast
        ) AS DD ON D.ipgo_numb = DD.ipgo_numb

        LEFT JOIN (
                        select	A.ordr_numb, A.item_code, A.ordr_qnty, ISNULL(B.ipgo_qnty,0) As ipgo_qnty,
                                A.ordr_qnty - ISNULL(B.ipgo_qnty,0) AS mi_qnty
                        from 
                                (
                                        select	ordr_numb + sqen_numb AS ordr_numb, item_code, SUM(ISNULL(item_qnty, 0)) as ordr_qnty
                                        from mt_ordr_detl
                                        group by ordr_numb + sqen_numb, item_code
                                ) as A
                                left join (
                                                select ordr_numb, item_code, SUM(ISNULL(item_qnty, 0)) as ipgo_qnty 
                                                from mt_ipgo_detl
                                                group by ordr_numb, item_code
                                ) as B on A.ordr_numb = B.ordr_numb and A.item_code = B.item_code
        ) AS E ON A.ordr_numb + B.sqen_numb = E.ordr_numb
        LEFT JOIN (
                        SELECT ordr_numb,
                                item_code,
                                SUM(ISNULL(gaip_qnty,0)) AS summ_gaip
                        FROM mt_gaip_detl
                        WHERE stat_type = 'N'
                        GROUP BY ordr_numb, item_code
        ) AS F ON A.ordr_numb + B.sqen_numb = F.ordr_numb AND B.item_code = F.item_code

        WHERE A.cust_code = ?
          AND A.ordr_numb LIKE ?
"""

# 발주 내역 메뉴 메인 리스트 조회
SELECT_ORDR_MENU_MAIN_LIST = """
        SELECT A.ordr_numb as ordrNumb
             , A.ordr_date as ordrDate
             , B.dery_date as deryDate
             , CASE WHEN B.total_count > 1
                    THEN ISNULL(C.item_name, B.first_item_code) + ' 외 ' + CAST((B.total_count - 1) AS VARCHAR) + '건'
                    ELSE ISNULL(C.item_name, B.first_item_code)
               END as itemSummary
             , B.calculated_stat_type as statType
        FROM   mt_ordr_mast AS A
        LEFT JOIN (
                SELECT ordr_numb
                     , MAX(CASE WHEN rn = 1 THEN item_code END) as first_item_code
                     , COUNT(*) as total_count
                     , MAX(CASE WHEN rn = 1 THEN dery_date END) as dery_date
                     
                     , CASE WHEN SUM(CASE WHEN stat_type = 'N' THEN 1 ELSE 0 END) > 0 
                            THEN 'N' 
                            ELSE 'Y' 
                       END as calculated_stat_type
                FROM (
                        SELECT ordr_numb, item_code
                             , ROW_NUMBER() OVER (PARTITION BY ordr_numb ORDER BY sqen_numb) as rn
                             , dery_date
                             , stat_type
                        FROM   mt_ordr_detl
                ) AS SubD
                GROUP BY ordr_numb
        ) AS B ON A.ordr_numb = B.ordr_numb
        LEFT JOIN be_item_info AS C ON RTRIM(LTRIM(B.first_item_code)) = RTRIM(LTRIM(C.item_code))
        
        WHERE A.cust_code = ?
          AND (A.ordr_date BETWEEN ? AND ?)
          AND B.calculated_stat_type LIKE ?
          AND (A.ordr_numb LIKE ? OR C.item_name LIKE ?)
        ORDER BY A.ordr_numb DESC
"""

# PWDCOMPARE를 활용한 유저 검증 쿼리
MATCHED_USER_LOGIN = """
        SELECT 
                user_code AS custCode,
                user_name AS custName,
                PWDCOMPARE(?, USER_PASS) AS is_matched
        FROM be_user_info
        WHERE UPPER(USER_CODE) = UPPER(?)
"""