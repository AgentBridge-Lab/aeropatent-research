SELECT
  column_name,
  data_type
FROM `patents-public-data.patents.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'publications'
ORDER BY ordinal_position;

