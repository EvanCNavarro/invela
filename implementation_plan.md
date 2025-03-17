# Implementation Plan

## Completed Features ✅
- Database Enhancement
- OpenAI Integration
- File Processing Enhancement
- Document Count UI
- File State Management ✅
  - Moved file state to parent component
  - Preserved metadata across wizard steps
  - Added file list debugging view
  - Implemented complete file context persistence

### Phase 5: Document State Management ✅
1. File Persistence:
   - Store uploaded files in document wizard state ✅
   - Maintain file list across wizard steps ✅
   - Add file preview/list component ✅

2. Wizard Navigation Enhancement:
   - Save wizard state between steps ✅
   - Enable back navigation with preserved data ✅
   - Add progress indicators for each step ✅

### Phase 6: Document Analysis Integration 🔄

1. UI Structure & User Experience:
   - Document Row Layout:
     - Status Icon Implementation:
       - Green circle-check for processed documents
       - Invela logo spinner for documents currently processing
       - Grey circle-dashed for pending documents
     - File Name and Size columns
     - Processing Result Context:
       - "(Calculating Questions Answers...)" for active processing
       - Total count of answers found in green text
       - Empty state for pending documents
     - Highlight active processing rows with light grey background
     - Disable Next/Back buttons during processing

2. Compliance Questions Integration:
   - Retrieve questions from `card_fields.json`:
     - field_key
     - question
     - ai_search_instructions
     - partial_risk_score_max
     - id_card_responses_field_id

3. Processing Time Management:
   - Calculate initial estimated processing time
   - Dynamic updates based on actual processing speed
   - Real-time remaining time display
   - Progress indicators per document

4. Document Processing Architecture:
   - File Chunking Strategy:
     - PDFs: Extract ~3 pages (~16,000 chars) using pdf.js-extract
     - DOC/DOCX/TXT/CSV: Similar character limit chunking
   - Sequential Processing:
     - Process documents one at a time
     - Update progress indicators per chunk
   - OpenAI Integration:
     ```javascript
     const prompt = `
     You are a compliance analyst. Given the document chunk below, analyze and determine which compliance questions it answers based on provided "ai_search_instructions" for each question. Provide extracted answers in JSON format as follows:

     Document Text Chunk:
     ${extractedTextChunk}

     Compliance Questions:
     ${questionsWithSearchInstructions}

     JSON Response Format:
     {
       "answers": [
         {"field_key": "question_field_key", "answer": "Extracted relevant information from the document."}
       ]
     }

     Clearly reference the source document within each answer (e.g., "According to SOC2.pdf: [Answer Data]")."
     ```

5. Answer Aggregation System:
   - Combine answers across documents:
     - Eliminate duplicate answers
     - Maintain source attribution
     - Example format: "According to SOC2.pdf: [Answer Data]. According to Compliance.pdf: [Additional Answer Data]."
   - Clear presentation in UI:
     - Group by question
     - Show source documents
     - Display confidence scores

## (OLD) WizardStep1 Success Metrics
- Upload success rate > 99% ✅
- Classification accuracy > 95% ✅
- Real-time updates < 500ms ✅
- Fast classification time ✅
- Support for files up to 50MB ✅

### (NEW) WizardStep2 Success Metrics
- Document state persistence across sessions ✅
- < 2s response time for document analysis
- > 90% accuracy in card task validation
- Clear source attribution for all answers
- Efficient chunking with no token limit errors