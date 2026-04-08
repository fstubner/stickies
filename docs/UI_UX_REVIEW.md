# UI/UX Design Review (Screenshot-Based + Reported Behavior)

Status: **Actionable Draft** | Last Updated: 2026-02-02

## Scope

This review is based on:

1) The provided screenshots for these states/views:

- S1: Canvas (empty) + Unplaced sticky notes panel
- S2: Canvas with 3 notes + semantic relationships
- S3: Note detail panel (right sidebar)
- S4: Bottom controls and drag-to-canvas flow
- S5: Color picker UI
- S6: Kanban view

2) Reported behavior:
- Notes should be drag-droppable on canvas
- Semantic similarity should connect notes with edges
- Right sidebar shows full note content & editing
- Appearance settings control theme and view modes

---

## Key UI Findings & Recommendations

### 1. Visual Hierarchy & Color Contrast

**Issue:**
- The current sticky note colors (pastels) may have low contrast against white/light canvas backgrounds for readability
- Control buttons (trash, etc.) could be more visually prominent

**Recommendation:**
- Add higher contrast borders or slight shadows to sticky notes
- Make action buttons (delete, edit) more discoverable with hover states and icons

### 2. Drag-and-Drop Feedback

**Issue:**
- Visual feedback when dragging a note onto the canvas is unclear
- No clear indication of drop zones or alignment grid

**Recommendation:**
- Add a "ghosted" preview while dragging
- Show grid lines or snap-to alignment on canvas
- Provide visual feedback on successful drop

### 3. Semantic Edge Display

**Issue:**
- Semantic relationship edges are visually thin and hard to see
- No clear legend or explanation of what the edges mean

**Recommendation:**
- Add interactive tooltips on edges: "Related because..."
- Use varying line weights/colors for different relationship strengths
- Add a legend in the UI

### 4. Right Sidebar Scrolling

**Issue:**
- Long note content may overflow the sidebar without clear indication
- No scrolling UX hints visible

**Recommendation:**
- Add overflow indicators or "fade out" effect at bottom
- Ensure scrollbar is always visible when content is scrollable

### 5. Kanban View Columns

**Issue:**
- The column headers and card layouts could be more distinct
- No clear visual separation between columns

**Recommendation:**
- Add subtle background colors to columns
- Improve card shadow/border styling

### 6. Accessibility

**Issue:**
- Color-only indicators (for tags, status) may not be accessible
- Keyboard navigation flow is unclear

**Recommendation:**
- Add text labels to color-coded elements
- Define and test tab order through all UI components

---

## Component-Specific Notes

### Canvas Component
- Consider adding a "zoom" control for large canvases
- Add context menu (right-click) for canvas actions
- Implement undo/redo visual states

### Sticky Note Card
- Add preview text when hovering (truncated content)
- Show due dates more prominently if important

### Kanban Column
- Add a "+" button to quickly create a note in that column
- Show count of notes per column

### Right Sidebar
- Consider a "fullscreen edit" mode for longer notes
- Add word count or character count

---

## Design System Notes

### Color Palette
- Ensure pastels meet WCAG AA contrast ratios
- Consider a "dark mode" variant

### Typography
- Ensure font sizes scale well on different screen sizes
- Test with longer content (wrapping)

### Spacing & Layout
- Consistent padding/margin across components
- Align form inputs with the grid

---

## Next Steps

1. Implement hover states for interactive elements
2. Add tooltips and help text
3. Test keyboard navigation and screen reader compatibility
4. Get user feedback on the semantic edge display
5. Refine the Kanban view styling
