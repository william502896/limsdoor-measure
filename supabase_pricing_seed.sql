-- Auto-generated pricing seed from misotech-pricing.json

DO $$
DECLARE
  -- IDs to link tables
  v_company_id uuid := '00000000-0000-0000-0000-000000000000'; -- REPLACE WITH REAL ID
  v_prod_id uuid;
  v_var_id uuid;
BEGIN

  -- Product: 1S_MANUAL
  INSERT INTO price_products (company_id, product_type, title, base_height_mm) VALUES (v_company_id, '1S_MANUAL', '1S 도어 (원슬라이딩/여닫이 1S)', 2400) RETURNING id INTO v_prod_id;
    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, 'FLUORO', '불소도장(메탈블랙/화이트)') RETURNING id INTO v_var_id;
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1100, 2400, 'CLEAR_BRONZE_AQUA', 270000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1300, 2400, 'SATIN', 290000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1450, 2400, 'WIRE_MESH', 380000);
    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, 'ANOD', '아노다이징도장(샴페인골드)') RETURNING id INTO v_var_id;
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1100, 2400, 'CLEAR_BRONZE_AQUA', 280000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1300, 2400, 'SATIN', 300000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1450, 2400, 'WIRE_MESH', 390000);

  -- Product: FIX
  INSERT INTO price_products (company_id, product_type, title, base_height_mm) VALUES (v_company_id, 'FIX', 'FIX 도어', 2400) RETURNING id INTO v_prod_id;
    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, 'FLUORO', '불소도장(메탈블랙/화이트)') RETURNING id INTO v_var_id;
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 800, 2400, 'CLEAR_BRONZE_AQUA', 190000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1100, 2400, 'SATIN', 210000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1300, 2400, 'WIRE_MESH', 280000);
    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, 'ANOD', '아노다이징도장(샴페인골드)') RETURNING id INTO v_var_id;
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 800, 2400, 'CLEAR_BRONZE_AQUA', 200000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1100, 2400, 'SATIN', 220000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1300, 2400, 'WIRE_MESH', 290000);

  -- Product: 1S_AUTO
  INSERT INTO price_products (company_id, product_type, title, base_height_mm) VALUES (v_company_id, '1S_AUTO', '1S 자동문', 2400) RETURNING id INTO v_prod_id;
    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, 'FLUORO', '불소도장(모던블랙/화이트)') RETURNING id INTO v_var_id;
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1100, 2400, 'CLEAR_BRONZE_AQUA', 670000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1250, 2400, 'SATIN', 700000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1350, 2400, 'WIRE_MESH', 780000);
    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, 'ANOD', '아노다이징도장(샴페인골드)') RETURNING id INTO v_var_id;
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1100, 2400, 'CLEAR_BRONZE_AQUA', 690000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1250, 2400, 'SATIN', 720000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1350, 2400, 'WIRE_MESH', 800000);

  -- Product: 3T_MANUAL
  INSERT INTO price_products (company_id, product_type, title, base_height_mm) VALUES (v_company_id, '3T_MANUAL', '3연동(18바)', 2400) RETURNING id INTO v_prod_id;
    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, 'FLUORO', '불소도장(모던블랙/화이트)') RETURNING id INTO v_var_id;
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1300, 2400, 'CLEAR_BRONZE_AQUA', 400000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1500, 2400, 'SATIN', 430000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1700, 2400, 'WIRE_MESH', 530000);
    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, 'ANOD', '아노다이징도장(샴페인골드)') RETURNING id INTO v_var_id;
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1300, 2400, 'CLEAR_BRONZE_AQUA', 420000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1500, 2400, 'SATIN', 450000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1700, 2400, 'WIRE_MESH', 540000);

  -- Product: 3T_AUTO
  INSERT INTO price_products (company_id, product_type, title, base_height_mm) VALUES (v_company_id, '3T_AUTO', '3연동 자동', 2400) RETURNING id INTO v_prod_id;
    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, 'FLUORO', '불소도장(모던블랙/화이트)') RETURNING id INTO v_var_id;
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1300, 2400, 'CLEAR_BRONZE_AQUA', 850000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1500, 2400, 'SATIN', 880000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1700, 2400, 'WIRE_MESH', 970000);
    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, 'ANOD', '아노다이징도장(샴페인골드)') RETURNING id INTO v_var_id;
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1300, 2400, 'CLEAR_BRONZE_AQUA', 880000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1500, 2400, 'SATIN', 910000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1700, 2400, 'WIRE_MESH', 1000000);

  -- Product: SEMI_SWING
  INSERT INTO price_products (company_id, product_type, title, base_height_mm) VALUES (v_company_id, 'SEMI_SWING', '반자동 스윙도어', 2400) RETURNING id INTO v_prod_id;
    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, 'FLUORO', '불소도장(화이트)') RETURNING id INTO v_var_id;
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1200, 2400, 'CLEAR_BRONZE_AQUA', 490000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1400, 2400, 'CLEAR_BRONZE_AQUA', 520000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1500, 2400, 'CLEAR_BRONZE_AQUA', 550000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1000, 2400, 'CLEAR_BRONZE_AQUA', 360000);
    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, 'ANOD', '아노다이징도장(모던블랙/샴페인골드)') RETURNING id INTO v_var_id;
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1200, 2400, 'CLEAR_BRONZE_AQUA', 520000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1400, 2400, 'CLEAR_BRONZE_AQUA', 550000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1500, 2400, 'CLEAR_BRONZE_AQUA', 580000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1000, 2400, 'CLEAR_BRONZE_AQUA', 380000);

  -- Product: HOPE_SWING
  INSERT INTO price_products (company_id, product_type, title, base_height_mm) VALUES (v_company_id, 'HOPE_SWING', '호페 여닫이도어', 2400) RETURNING id INTO v_prod_id;
    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, 'FLUORO', '불소도장(메탈블랙/화이트)') RETURNING id INTO v_var_id;
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1100, 2400, 'CLEAR_BRONZE_AQUA', 470000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1300, 2400, 'CLEAR_BRONZE_AQUA', 500000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1000, 2400, 'CLEAR_BRONZE_AQUA', 390000);
    INSERT INTO price_variants (company_id, product_id, coating, coating_label) VALUES (v_company_id, v_prod_id, 'ANOD', '아노다이징도장(샴페인골드)') RETURNING id INTO v_var_id;
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1100, 2400, 'CLEAR_BRONZE_AQUA', 500000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1300, 2400, 'CLEAR_BRONZE_AQUA', 530000);
      INSERT INTO price_size_prices (company_id, variant_id, width_mm, height_mm, glass_group, price) VALUES (v_company_id, v_var_id, 1000, 2400, 'CLEAR_BRONZE_AQUA', 420000);

  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'RULE', 'HEIGHT_OVER_2400', '높이 2400 이상', 'once', 10000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'RULE', 'VERTICAL_DIVISION', '세로분할', 'once', 10000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'MIDBAR_22_FLUORO_PER_M', '중간바_22 (불소)', 'm', 6700, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'ADHESIVEBAR_22_FLUORO_2P5M', '접착바_22 (불소)', '2.5m', 6500, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'MIDBAR_22_ANOD_PER_M', '중간바_22 (아노)', 'm', 7100, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'ADHESIVEBAR_22_ANOD_2P5M', '접착바_22 (아노)', '2.5m', 7000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'MIDBAR_18_FLUORO_PER_M', '중간바_18 (불소)', 'm', 5000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'ADHESIVEBAR_18_FLUORO_2P5M', '접착바_18 (불소)', '2.5m', 5000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'MIDBAR_18_ANOD_PER_M', '중간바_18 (아노)', 'm', 5500, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'ADHESIVEBAR_18_ANOD_2P5M', '접착바_18 (아노)', '2.5m', 5500, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'PART_10x20_FLUORO_EA', '10*20 (불소)', 'ea', 5000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'PART_20x30_FLUORO_EA', '20*30 (불소)', 'ea', 9000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'PART_10x20_ANOD_EA', '10*20 (아노)', 'ea', 5500, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'PART_20x30_ANOD_EA', '20*30 (아노)', 'ea', 9500, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'GAP_FILLER_L', '마감재용_이틈새 (大)', 'ea', 4000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'GAP_FILLER_S', '마감재용_이틈새 (小)', 'ea', 3000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', '1S_SIDEFRAME_38x20_FLUORO_PER_M', '1S_측면문틀 38*20 (불소)', 'm', 5000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', '1S_SIDEFRAME_38x20_ANOD_PER_M', '1S_측면문틀 38*20 (아노)', 'm', 5500, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'THREE_T_MOLD_30x10_FLUORO_EA', '3전 마감재(2.5M) 30*10 (불소)', 'ea', 3500, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'THREE_T_MOLD_30x10_ANOD_EA', '3전 마감재(2.5M) 30*10 (아노)', 'ea', 4500, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'SIX_T_MOLD_60x2P5_FLUORO_EA', '6전 마감재(2.5M) 60*2.5 (불소)', 'ea', 12000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'SIX_T_MOLD_60x2P5_ANOD_EA', '6전 마감재(2.5M) 60*2.5 (아노)', 'ea', 13000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'PILLAR_3T_PLUS_FIX_128x49_FLUORO_SET', '3연동+픽스_기둥바 128*49 (불소 세트)', 'set', 65800, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'PILLAR_3T_PLUS_FIX_128x49_ANOD_SET', '3연동+픽스_기둥바 128*49 (아노 세트)', 'set', 70000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'PILLAR_1S_PLUS_1F_50x47_FLUORO_SET', '1S+1F_기둥바 50*47 (불소 세트)', 'set', 40800, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'PILLAR_1S_PLUS_1F_50x47_ANOD_SET', '1S+1F_기둥바 50*47 (아노 세트)', 'set', 43400, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'H_BAR_35x20_FLUORO_EA', 'H 바 35*20 (불소)', 'ea', 10000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'H_BAR_35x20_ANOD_EA', 'H 바 35*20 (아노)', 'ea', 10500, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'PILLAR_2S_88x49_FLUORO_SET', '2S_기둥바 88*49 (불소 세트)', 'set', 59200, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'PILLAR_2S_88x49_ANOD_SET', '2S_기둥바 88*49 (아노 세트)', 'set', 61800, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'SEMI_SWING_BOTTOM_FRAME_49x6_FLUORO_PER_M', '하부문틀(싯기) 49*6 (불소)', 'm', 5500, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'MATERIAL', 'SEMI_SWING_BOTTOM_FRAME_49x6_ANOD_PER_M', '하부문틀(싯기) 49*6 (아노)', 'm', 6000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'HANDLE', 'HANDLE_OLD_450', '구형(450)', 'ea', 35000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'HANDLE', 'HANDLE_NEW_350', '신형(350)', 'ea', 25000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'HANDLE', 'HANDLE_NEW_600', '신형(600)', 'ea', 35000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'HANDLE', 'HANDLE_NEW_800', '신형(800)', 'ea', 45000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'HANDLE', 'HANDLE_HALF_MOON', '반달(원형)', 'ea', 30000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'HANDLE', 'HOPE_HANDLE_CHINA', '호페손잡이 중국', 'ea', 40000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'HANDLE', 'HOPE_HANDLE_GERMANY', '호페손잡이 독일', 'ea', 60000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'HARDWARE', 'TOP_SENSOR', '상부센서', 'ea', 30000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'HARDWARE', 'WIRELESS_SWITCH', '무선스위치', 'ea', 22000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'HARDWARE', 'AUTO_1S_TDU', '자동 1S TDU', 'ea', 260000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'HARDWARE', 'AUTO_3T_TDU', '자동 3T TDU', 'ea', 290000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'HARDWARE', 'DAMPER_EA', '댐퍼', 'ea', 20000, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'POMAX', 'ARCH_1S_TOP_OUTDOOR_80MM', '1S 상부아치(여닫이 외도어) (가운데 두께 80mm)', 'ea', 0, '{"pricing":[{"max_width_mm":1000,"price":80000,"unit":"set(2pcs)"},{"max_width_mm":1300,"price":100000,"unit":"set(2pcs)"},{"max_width_mm":1450,"price":120000,"unit":"set(2pcs)"}]}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'POMAX', 'ARCH_DOUBLE_TOP_SEMI_HOPE_60MM', '여닫이 양개 상부아치(반자동,호페) (가운데 두께 60mm)', 'ea', 0, '{"pricing":[{"max_width_mm":1100,"price":70000,"unit":"set(4pcs)"},{"max_width_mm":1300,"price":80000,"unit":"set(4pcs)"},{"max_width_mm":1500,"price":100000,"unit":"set(4pcs)"},{"max_width_mm":1700,"price":120000,"unit":"set(4pcs)"}]}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'POMAX', 'ARCH_3T_TOP_30MM', '3연동 상부아치 (가운데 두께 30mm)', 'ea', 0, '{"pricing":[{"max_width_mm":1100,"price":60000,"unit":"set(6pcs)"},{"max_width_mm":1300,"price":80000,"unit":"set(6pcs)"},{"max_width_mm":1500,"price":100000,"unit":"set(6pcs)"},{"max_width_mm":2000,"price":120000,"unit":"set(6pcs)"}]}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'POMAX', 'BOTTOM_PANEL_H500', '하부고시판(높이 500 기준)', 'ea', 0, '{"pricing":[{"max_width_mm":800,"price":60000,"unit":"set(2pcs)"},{"max_width_mm":1000,"price":90000,"unit":"set(2pcs)"},{"max_width_mm":1200,"price":120000,"unit":"set(2pcs)"},{"max_width_mm":1450,"price":150000,"unit":"set(2pcs)"}]}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'POMAX', 'CORNER_ARCH', '모서리아치', 'ea', 0, '{"pricing":[{"max_width_mm":300,"price":25000,"unit":"set(2pcs)"},{"max_width_mm":700,"price":35000,"unit":"set(2pcs)"},{"max_width_mm":1000,"price":45000,"unit":"set(2pcs)"}]}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'POMAX', 'THIN_STRIP_ARCH_W22', '얇은 띠 아치(폭 22mm)', 'ea', 0, '{"pricing":[{"max_width_mm":1000,"price":70000,"unit":"set(2pcs)"},{"max_width_mm":1300,"price":90000,"unit":"set(2pcs)"},{"max_width_mm":1450,"price":110000,"unit":"set(2pcs)"}]}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'POMAX', 'DIVIDING_STRIP_23x2400', '접착바(디바이딩 띠) 23*2400', 'ea', 4500, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'POMAX', 'VERTICAL_BIG_ARCH', '세로 큰 아치 (최대 1200*2400)', 'ea', 0, '{"pricing":[{"max_width_mm":1200,"price":220000,"unit":"set(2pcs)"}]}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'POMAX', 'VERTICAL_THIN_ARCH_STRIP_W22', '세로 얇은 아치 띠(폭 22mm) (최대 1200*2400)', 'ea', 0, '{"pricing":[{"max_width_mm":1200,"price":210000,"unit":"set(2pcs)"}]}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'SLIDING', 'SLIDING_HW_BASE', '연동철물 (폭 연동)', 'set', 0, '{"ranges":[{"max":1500,"price":29000},{"max":1700,"price":31000},{"max":1900,"price":33000}]}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'SLIDING', 'PIVOT', '피봇', 'ea', undefined, '{}');
  INSERT INTO price_addons (company_id, category, code, label, unit, price, meta) VALUES (v_company_id, 'SLIDING', 'OVER_1900_PER_200', '1900초과 (200mm당)', 'section', undefined, '{}');
END $$;
