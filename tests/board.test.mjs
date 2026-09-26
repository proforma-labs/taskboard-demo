import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TASKS, createTask, addTask, updateTask, moveTask, removeTask,
  filterTasks, taskCounts, serializeBoard, deserializeBoard, createExampleTasks,
} from '../src/board.js';

const now = '2026-09-26T12:00:00.000Z';
const later = '2026-09-26T13:00:00.000Z';
const task = (id, input = {}) => createTask({ title: 'A useful next step', ...input }, { id, now });

test('creating and editing a task normalizes text without changing its identity or creation date', () => {
  const original = Object.freeze(task('first', { title: '  Make a plan  ', description: ' One clear step. ' }));
  const board = Object.freeze([original]);
  assert.equal(original.title, 'Make a plan');
  assert.equal(original.description, 'One clear step.');
  const changed = updateTask(board, 'first', { title: 'A better plan', priority: 'high', id: 'forged', createdAt: later }, later);
  assert.deepEqual(changed[0], { ...original, title: 'A better plan', priority: 'high', updatedAt: later });
  assert.equal(board[0].title, 'Make a plan');
  assert.notEqual(board, changed);
});

test('a task travels through all three columns and changes the progress count', () => {
  let board = [task('first'), task('second')];
  board = moveTask(board, 'first', 'doing', later);
  assert.deepEqual(taskCounts(board), { total: 2, todo: 1, doing: 1, done: 0 });
  board = moveTask(board, 'first', 'done', later);
  assert.deepEqual(taskCounts(board), { total: 2, todo: 1, doing: 0, done: 1 });
  board = moveTask(board, 'first', 'todo', later);
  assert.deepEqual(taskCounts(board), { total: 2, todo: 2, doing: 0, done: 0 });
  assert.equal(board[0].createdAt, now);
});

test('adding and deleting preserve the other tasks and their order', () => {
  const original = [task('first'), task('second')];
  const added = addTask(original, { title: 'Third task', status: 'doing' }, { id: 'third', now });
  assert.deepEqual(added.map((item) => item.id), ['first', 'second', 'third']);
  const removed = removeTask(added, 'second');
  assert.deepEqual(removed.map((item) => item.id), ['first', 'third']);
  assert.equal(original.length, 2);
  assert.equal(removed[0], original[0]);
});

test('search matches titles and notes without case sensitivity, and combines with both filters', () => {
  const tasks = [
    task('one', { title: 'Plan the launch', priority: 'high' }),
    task('two', { title: 'Write a note', description: 'Launch checklist', status: 'doing', priority: 'high' }),
    task('three', { title: 'Launch finished', status: 'done', priority: 'low' }),
  ];
  assert.equal(filterTasks(tasks, { query: '  LAUNCH ' }).length, 3);
  assert.deepEqual(filterTasks(tasks, { query: 'launch', priority: 'high', status: 'doing' }).map((item) => item.id), ['two']);
  assert.deepEqual(filterTasks(tasks, { query: 'no match' }), []);
  assert.equal(filterTasks(tasks).length, 3);
});

test('local persistence round-trips exact state, including an intentionally empty board', () => {
  const original = createExampleTasks(now);
  assert.deepEqual(deserializeBoard(serializeBoard(original)), original);
  assert.deepEqual(deserializeBoard(serializeBoard([])), []);
  assert.equal(new Set(original.map((item) => item.id)).size, original.length);
  assert.deepEqual(taskCounts(original), { total: 7, todo: 3, doing: 2, done: 2 });
});

test('invalid and oversized saved state cannot enter the board', () => {
  for (const raw of ['invalid JSON', 'null', '{}', '{"version":2,"tasks":[]}', JSON.stringify({ version: 1, tasks: [null] }), ' '.repeat(1_000_001)]) {
    assert.throws(() => deserializeBoard(raw));
  }
  for (const patch of [{ status: '__proto__' }, { status: ['todo'] }, { priority: ['high'] }, { priority: 'urgent' }, { title: '' }, { updatedAt: 'never' }, { createdAt: null }, { id: 'unsafe"id' }]) {
    assert.throws(() => deserializeBoard(JSON.stringify({ version: 1, tasks: [{ ...task('first'), ...patch }] })));
  }
  assert.throws(() => deserializeBoard(serializeBoard([task('same'), task('same')])));
});

test('limits protect task validation, unique ids, and missing-task updates', () => {
  for (const input of [{ title: ' ' }, { title: 'x'.repeat(121) }, { title: 'Task', description: 'x'.repeat(1001) }, { title: 'Task', status: 'unknown' }, { title: 'Task', priority: 'constructor' }]) {
    assert.throws(() => createTask(input, { id: 'new', now }));
  }
  assert.throws(() => addTask([task('same')], { title: 'Duplicate' }, { id: 'same', now }));
  assert.throws(() => updateTask([], 'missing', { title: 'Lost task' }, now));
  assert.throws(() => moveTask([task('first')], 'first', 'invalid', now));
  const full = Array.from({ length: MAX_TASKS }, (_, index) => task(`task-${index}`));
  assert.throws(() => addTask(full, { title: 'Too many' }, { id: 'overflow', now }));
  assert.throws(() => deserializeBoard(serializeBoard([...full, task('overflow')])));
});

test('task text stays data, with no interpretation of HTML-like content', () => {
  const input = task('text', { title: '<img src=x onerror=alert(1)>', description: '</script><script>example</script>' });
  const restored = deserializeBoard(serializeBoard([input]));
  assert.equal(restored[0].title, input.title);
  assert.equal(restored[0].description, input.description);
});
