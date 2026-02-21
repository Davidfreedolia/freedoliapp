-- Verify columns exist + supplier_id is nullable
select column_name, is_nullable, data_type
from information_schema.columns
where table_name = 'supplier_quotes'
  and column_name in ('supplier_id', 'supplier_name_raw')
order by column_name;

-- Verify validity columns still exist (safety)
select column_name, is_nullable, data_type
from information_schema.columns
where table_name = 'supplier_quotes'
  and column_name in ('validity_status', 'validity_notes', 'go_samples', 'is_selected')
order by column_name;
