import React from 'react';

const PromptTemplate = () => {
  const promptStructure = `
You are an AI assistant tasked with generating a report. Please structure your response in the following format:

TITLE: [Your Report Title]

SECTIONS:
1. [Section Title]
   [Section Content - can be text or structured data]

2. [Section Title]
   [Section Content - can be text or structured data]

3. [Section Title]
   [Section Content - can be text or structured data]

For text content, use markdown formatting for better readability:
- Use bullet points for lists
- Use numbered lists where appropriate
- Use bold for emphasis
- Use headings for subsections

For metrics or data visualization sections, specify the data in this format:
METRICS:
- Metric 1: [value] ([change])
- Metric 2: [value] ([change])
- Metric 3: [value] ([change])

The AI will then format this into a styled report with proper sections and visual hierarchy.
`;

  return (
    <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '5px' }}>
      {promptStructure}
    </pre>
  );
};

export default PromptTemplate;
