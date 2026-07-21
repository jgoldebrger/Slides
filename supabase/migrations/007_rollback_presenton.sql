-- Roll back Presenton editor integration

ALTER TABLE decks DROP CONSTRAINT IF EXISTS decks_editor_provider_check;

ALTER TABLE decks
  DROP COLUMN IF EXISTS presenton_presentation_id,
  DROP COLUMN IF EXISTS presenton_edit_path,
  DROP COLUMN IF EXISTS editor_provider;
