-- =====================================================================
-- DATOS DE PRUEBA — catálogo ficticio hasta conectar Nexus.
-- Bodegas y precios inventados. Borrar antes de cargar el catálogo real:
--   delete from public.wines where nexus_id like 'PRUEBA-%';
-- =====================================================================
insert into public.wines (nexus_id, name, winery, varietal, vintage, region, price, in_stock) values
  ('PRUEBA-001', 'Malbec Reserva',          'Finca Los Álamos',   'Malbec',             2021, 'Valle de Uco, Mendoza', 18500, true),
  ('PRUEBA-002', 'Malbec Clásico',          'Bodega Tres Cerros', 'Malbec',             2022, 'Luján de Cuyo, Mendoza', 9800, true),
  ('PRUEBA-003', 'Gran Malbec',             'Altos del Río',      'Malbec',             2019, 'Gualtallary, Mendoza',  42000, true),
  ('PRUEBA-004', 'Cabernet Franc',          'Finca Los Álamos',   'Cabernet Franc',     2020, 'Valle de Uco, Mendoza', 21000, true),
  ('PRUEBA-005', 'Cabernet Sauvignon',      'Bodega Tres Cerros', 'Cabernet Sauvignon', 2021, 'Maipú, Mendoza',        11500, true),
  ('PRUEBA-006', 'Blend de Tintos',         'Altos del Río',      'Blend',              2019, 'Mendoza',               26000, true),
  ('PRUEBA-007', 'Bonarda',                 'Viñas del Este',     'Bonarda',            2022, 'San Martín, Mendoza',    7900, true),
  ('PRUEBA-008', 'Syrah',                   'Cuesta Blanca',      'Syrah',              2021, 'Valle de Tulum, San Juan', 10200, false),
  ('PRUEBA-009', 'Pinot Noir',              'Patagonia Sur',      'Pinot Noir',         2022, 'Río Negro',             23500, true),
  ('PRUEBA-010', 'Torrontés',               'Altura Calchaquí',   'Torrontés',          2023, 'Cafayate, Salta',        8900, false),
  ('PRUEBA-011', 'Chardonnay',              'Finca Los Álamos',   'Chardonnay',         2022, 'Valle de Uco, Mendoza', 14800, true),
  ('PRUEBA-012', 'Sauvignon Blanc',         'Patagonia Sur',      'Sauvignon Blanc',    2023, 'Neuquén',               12300, true),
  ('PRUEBA-013', 'Rosado de Malbec',        'Viñas del Este',     'Rosado',             2023, 'Mendoza',                8400, true),
  ('PRUEBA-014', 'Espumante Extra Brut',    'Cuesta Blanca',      'Espumante',          null, 'Mendoza',               16900, true)
on conflict (nexus_id) do nothing;

update public.club_settings
   set wine_of_month_id = (select id from public.wines where nexus_id = 'PRUEBA-001'),
       wine_of_month_note = 'Elegido por la vinoteca para este mes'
 where id = 1;
