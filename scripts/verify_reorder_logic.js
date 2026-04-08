
const assert = require('assert');

function addNoteLogic(noteData, currentNotes) {
    if (noteData.order === undefined && noteData.workspaceId) {
        const workspaceNotes = currentNotes.filter(n => n.workspaceId === noteData.workspaceId);
        // Default 0 if empty, else max
        const maxOrder = workspaceNotes.length > 0
            ? Math.max(...workspaceNotes.map(n => n.order || 0))
            : 0;
        noteData.order = maxOrder + 1000;
    }
    return noteData;
}

function reorderLogic(currentNotes, orderedIds) {
    return currentNotes.map(n => {
       const newIndex = orderedIds.indexOf(n.id);
       if (newIndex !== -1) {
           return { ...n, order: newIndex * 1000 };
       }
       return n;
    });
}

try {
    console.log('Testing Order Calculation...');
    const notes = [
        { id: '1', workspaceId: 'w1', order: 1000 },
        { id: '2', workspaceId: 'w1', order: 2000 }
    ];

    // Test 1: Add to existing workspace
    const newNote = addNoteLogic({ workspaceId: 'w1' }, notes);
    assert.strictEqual(newNote.order, 3000, 'Should assign next order (3000)');
    console.log('PASS: Add to existing workspace');

    // Test 2: Add to new workspace
    const newNote2 = addNoteLogic({ workspaceId: 'w2' }, notes);
    assert.strictEqual(newNote2.order, 1000, 'Should start at 1000');
    console.log('PASS: Add to new workspace');

    console.log('Testing Reorder Logic...');
    const notesList = [
        { id: '1', order: 1000 },
        { id: '2', order: 2000 },
        { id: '3', order: 3000 }
    ];

    // Move 3 to top
    const orderedIds = ['3', '1', '2'];
    const reordered = reorderLogic(notesList, orderedIds);

    const n3 = reordered.find(n => n.id === '3');
    const n1 = reordered.find(n => n.id === '1');
    const n2 = reordered.find(n => n.id === '2');

    assert.strictEqual(n3.order, 0, 'First item order 0');
    assert.strictEqual(n1.order, 1000, 'Second item order 1000');
    assert.strictEqual(n2.order, 2000, 'Third item order 2000');
    console.log('PASS: Reorder logic');

    console.log('ALL TESTS PASSED');

} catch (e) {
    console.error('TEST FAILED:', e.message);
    process.exit(1);
}