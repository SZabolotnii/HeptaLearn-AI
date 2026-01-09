export interface MarkdownSection {
  title: string;
  content: string;
}

export const parseMarkdownFile = async (file: File): Promise<MarkdownSection[]> => {
  const text = await file.text();
  
  // Split by headers H1 (#) or H2 (##) to create logical cards
  // Regex looks for lines starting with # or ##
  const lines = text.split('\n');
  const sections: MarkdownSection[] = [];
  
  let currentTitle = file.name;
  let currentContent: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check for H1 or H2 (e.g., "# Title" or "## Subtitle")
    if (/^#{1,2}\s/.test(line)) {
      // If previous section has content, push it
      if (currentContent.length > 0) {
        sections.push({
          title: currentTitle,
          content: currentContent.join('\n').trim()
        });
      }
      
      // Update title (clean up hashtags)
      currentTitle = line.replace(/^#+\s+/, '').trim();
      currentContent = [line]; // Include header in the card content context
    } else {
      currentContent.push(line);
    }
  }

  // Push the final section
  if (currentContent.length > 0) {
    sections.push({
      title: currentTitle,
      content: currentContent.join('\n').trim()
    });
  }
  
  // Fallback if no headers found
  if (sections.length === 0 && text.trim()) {
      return [{ title: file.name, content: text }];
  }

  return sections;
};