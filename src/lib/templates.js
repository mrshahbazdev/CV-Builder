/**
 * Each template is a real layout, not a skin: its own typography scale,
 * spacing rhythm, margins, section order and accent handling.
 */
export const TEMPLATES = {
  classic: {
    id: 'classic', name: 'Classic',
    blurb: 'Single column, serif, conservative. Law, finance, academia.',
    font: "Georgia, 'Times New Roman', serif",
    headingFont: "Georgia, 'Times New Roman', serif",
    nameSize: 24, baseSize: 10.5, lineHeight: 1.45,
    margin: 20, sectionGap: 7, entryGap: 5,
    sectionTitleStyle: 'caps-rule',
    columns: 'single', free: true
  },
  modern: {
    id: 'modern', name: 'Modern',
    blurb: 'Single column, sans, generous spacing, thin rules.',
    font: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    headingFont: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    nameSize: 26, baseSize: 10, lineHeight: 1.5,
    margin: 22, sectionGap: 8, entryGap: 6,
    sectionTitleStyle: 'accent-rule',
    columns: 'single', free: true
  },
  minimal: {
    id: 'minimal', name: 'Minimal',
    blurb: 'Almost no styling, maximum readability.',
    font: "'Helvetica Neue', Arial, sans-serif",
    headingFont: "'Helvetica Neue', Arial, sans-serif",
    nameSize: 22, baseSize: 10, lineHeight: 1.5,
    margin: 24, sectionGap: 6, entryGap: 4,
    sectionTitleStyle: 'plain',
    columns: 'single', free: true
  },
  sidebar: {
    id: 'sidebar', name: 'Sidebar',
    blurb: 'Two columns — skills and contact in a coloured rail.',
    font: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    headingFont: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    nameSize: 22, baseSize: 9.5, lineHeight: 1.45,
    margin: 0, railWidth: 62, railPad: 8, sectionGap: 7, entryGap: 5,
    railSections: ['skills', 'languages', 'certificates'],
    sectionTitleStyle: 'accent-rule',
    columns: 'rail'
  },
  compact: {
    id: 'compact', name: 'Compact',
    blurb: 'Dense — for 15+ years to fit in two pages.',
    font: "'Helvetica Neue', Arial, sans-serif",
    headingFont: "'Helvetica Neue', Arial, sans-serif",
    nameSize: 20, baseSize: 9, lineHeight: 1.3,
    margin: 16, sectionGap: 5, entryGap: 3,
    sectionTitleStyle: 'caps-rule',
    columns: 'single'
  },
  academic: {
    id: 'academic', name: 'Academic',
    blurb: 'Publications, grants, teaching — for research careers.',
    font: "Georgia, 'Times New Roman', serif",
    headingFont: "Georgia, 'Times New Roman', serif",
    nameSize: 22, baseSize: 10, lineHeight: 1.5,
    margin: 22, sectionGap: 6, entryGap: 5,
    order: ['summary', 'education', 'publications', 'experience', 'awards', 'skills', 'certificates', 'languages', 'projects'],
    sectionTitleStyle: 'caps-rule',
    columns: 'single'
  },
  creative: {
    id: 'creative', name: 'Creative',
    blurb: 'One restrained accent — design and marketing roles.',
    font: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    headingFont: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    nameSize: 28, baseSize: 10, lineHeight: 1.5,
    margin: 22, sectionGap: 8, entryGap: 6,
    sectionTitleStyle: 'accent-rule',
    columns: 'single'
  },
  technical: {
    id: 'technical', name: 'Technical',
    blurb: 'Built for projects and stacks, not just job titles.',
    font: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    headingFont: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    nameSize: 24, baseSize: 10, lineHeight: 1.45,
    margin: 20, sectionGap: 7, entryGap: 5,
    order: ['summary', 'skills', 'projects', 'experience', 'education', 'certificates', 'languages', 'awards', 'publications'],
    sectionTitleStyle: 'accent-rule',
    columns: 'single'
  }
};

export function templateList() {
  return Object.values(TEMPLATES);
}

export function getTemplate(id) {
  return TEMPLATES[id] || TEMPLATES.classic;
}
