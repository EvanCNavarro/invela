-- Check if Open Banking template already exists
DO $$ 
DECLARE
  template_exists BOOLEAN;
  template_id INT;
BEGIN
  -- Check if template exists
  SELECT EXISTS (
    SELECT 1 FROM task_templates WHERE task_type = 'open_banking'
  ) INTO template_exists;
  
  IF NOT template_exists THEN
    -- Create new template
    INSERT INTO task_templates (name, description, task_type, component_type, status)
    VALUES ('Open Banking Survey Template', 'Template for Open Banking assessments', 'open_banking', 'form', 'active')
    RETURNING id INTO template_id;
    
    -- Add global configurations
    INSERT INTO component_configurations (template_id, config_key, config_value, scope)
    VALUES 
      (template_id, 'enableAiSuggestions', 'true', 'global'),
      (template_id, 'defaultFieldType', 'textarea', 'global'),
      (template_id, 'enableRiskAnalysis', 'true', 'global');
    
    -- Add section configurations
    INSERT INTO component_configurations (template_id, config_key, config_value, scope, scope_target)
    VALUES 
      (template_id, 'sectionTitle', 'Functionality', 'section', 'functionality'),
      (template_id, 'sectionDescription', 'API functionality and compliance', 'section', 'functionality'),
      (template_id, 'sectionTitle', 'Security', 'section', 'security'),
      (template_id, 'sectionDescription', 'API security and authentication', 'section', 'security');
    
    RAISE NOTICE 'Created Open Banking template with ID: %', template_id;
  ELSE
    RAISE NOTICE 'Open Banking template already exists';
  END IF;
END $$;