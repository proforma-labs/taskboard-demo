import {
  STATUSES, PRIORITIES, MAX_TASKS, addTask, updateTask, moveTask,
  removeTask, filterTasks, taskCounts, serializeBoard, deserializeBoard, createExampleTasks,
} from './board.js';

const STORAGE_KEY = 'dayboard.board.v1';
const $ = (id) => document.getElementById(id);
const board = $('board');
const editor = $('task-dialog');
const form = $('task-form');
const help = $('help-dialog');
let tasks = [];
let editingId = null;
let editorReturnStatus = 'todo';
let toastTimer;
let undoAction = null;
let storageWarning = '';

const icons = {
  edit: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m12.5 3 4.5 4.5M3.5 12l9-9a1.5 1.5 0 0 1 2 0L17 5.5a1.5 1.5 0 0 1 0 2l-9 9-5 1 1-5Z"/></svg>',
  calendar: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3" y="4.5" width="14" height="12.5" rx="2"/><path d="M6 3v3m8-3v3M3 8.5h14"/></svg>',
  check: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 10 3.5 3.5L15 7"/></svg>',
};

function icon(name) {
  const element = document.createElement('span');
  element.innerHTML = icons[name];
  return element.firstElementChild;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function saveIndicator(saved) {
  const light = element('span', 'status-light');
  light.setAttribute('aria-hidden', 'true');
  $('save-status').replaceChildren(light, document.createTextNode(saved ? 'Saved on this device' : 'Not saved on this device'));
  $('save-status').classList.toggle('unsaved', !saved);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, serializeBoard(tasks));
    saveIndicator(true);
    if (storageWarning) {
      $('storage-notice').hidden = true;
      storageWarning = '';
    }
  } catch {
    storageWarning = 'Your browser couldn’t save this board. You can still use it, but changes will be lost when you leave. Allow local storage or free up browser storage to save your tasks.';
    $('storage-notice').textContent = storageWarning;
    $('storage-notice').hidden = false;
    saveIndicator(false);
  }
}

function notify(message, undo = null) {
  clearTimeout(toastTimer);
  undoAction = undo;
  $('toast-message').textContent = message;
  $('undo-button').hidden = !undo;
  $('toast').hidden = false;
  toastTimer = setTimeout(dismissToast, undo ? 12000 : 5000);
}

function dismissToast() {
  clearTimeout(toastTimer);
  $('toast').hidden = true;
  undoAction = null;
}

function commit(nextTasks, message, undo = null) {
  tasks = nextTasks;
  persist();
  render();
  notify(message, undo);
}

function filters() {
  return { query: $('search').value, priority: $('priority-filter').value, status: $('status-filter').value };
}

function taskCard(task) {
  const card = element('article', `task-card ${task.status}`);
  card.dataset.taskId = task.id;
  const top = element('div', 'card-top');
  const priority = element('span', `priority ${task.priority}`);
  const bars = element('span', 'priority-bars');
  bars.setAttribute('aria-hidden', 'true');
  bars.append(element('i'), element('i'), element('i'));
  priority.append(bars, document.createTextNode(`${PRIORITIES[task.priority]} priority`));
  const edit = element('button', 'icon-button edit-button');
  edit.type = 'button';
  edit.title = 'Edit task';
  edit.setAttribute('aria-label', `Edit ${task.title}`);
  edit.append(icon('edit'));
  edit.addEventListener('click', () => openEditor(task.status, task.id));
  top.append(priority, edit);
  const title = element('h3', '', task.title);
  card.append(top, title);
  if (task.description) card.append(element('p', '', task.description));
  const footer = element('div', 'card-footer');
  const date = element('span', 'card-date');
  date.append(icon(task.status === 'done' ? 'check' : 'calendar'));
  const timestamp = task.status === 'done' ? task.updatedAt : task.createdAt;
  const formatted = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(timestamp));
  date.append(document.createTextNode(task.status === 'done' ? 'A little win' : formatted));
  date.title = `${task.status === 'done' ? 'Updated' : 'Added'} ${new Date(timestamp).toLocaleDateString()}`;
  const select = element('select', 'card-status');
  select.setAttribute('aria-label', `Move ${task.title}`);
  for (const [status, label] of Object.entries(STATUSES)) {
    const option = element('option', '', label);
    option.value = status;
    option.selected = status === task.status;
    select.append(option);
  }
  select.addEventListener('change', () => {
    try {
      commit(moveTask(tasks, task.id, select.value, new Date().toISOString()), `Moved to ${STATUSES[select.value]}.`);
      board.querySelector(`[data-task-id="${task.id}"] select`)?.focus({ preventScroll: true });
    } catch (error) {
      notify(error.message);
      render();
    }
  });
  footer.append(date, select);
  card.append(footer);
  return card;
}

function render() {
  const counts = taskCounts(tasks);
  const currentFilters = filters();
  const visible = filterTasks(tasks, currentFilters);
  const isFiltered = Boolean(currentFilters.query.trim() || currentFilters.priority !== 'all' || currentFilters.status !== 'all');
  $('total-count').textContent = counts.total;
  $('progress-count').textContent = `${counts.done} of ${counts.total} complete`;
  const percent = counts.total ? Math.round(counts.done / counts.total * 100) : 0;
  $('progress-fill').style.width = `${percent}%`;
  $('progress').setAttribute('aria-valuenow', String(percent));
  $('progress').setAttribute('aria-valuetext', `${counts.done} of ${counts.total} tasks complete`);
  $('progress-message').textContent = counts.total === 0 ? 'A fresh start. What’s one thing you’d like to do?'
    : counts.done === counts.total ? 'Look at that. A little space to enjoy the day.'
      : counts.done > 0 ? 'A little progress, every day.' : 'Good things start with a small first step.';
  $('filter-summary').hidden = !isFiltered;
  $('filter-result').textContent = `${visible.length} of ${counts.total} ${counts.total === 1 ? 'task' : 'tasks'} shown`;
  board.replaceChildren();

  for (const [status, label] of Object.entries(STATUSES)) {
    const column = element('section', `column ${status}`);
    column.setAttribute('aria-labelledby', `column-title-${status}`);
    const heading = element('div', 'column-heading');
    const dot = element('span', 'column-dot');
    dot.setAttribute('aria-hidden', 'true');
    const title = element('h2', '', label);
    title.id = `column-title-${status}`;
    const matching = visible.filter((task) => task.status === status);
    const count = element('span', 'column-count', String(matching.length));
    count.setAttribute('aria-label', `${matching.length} ${matching.length === 1 ? 'task' : 'tasks'}`);
    const add = element('button', 'icon-button', '+');
    add.type = 'button';
    add.setAttribute('aria-label', `Add task to ${label}`);
    add.addEventListener('click', () => openEditor(status));
    heading.append(dot, title, count, add);
    const cards = element('div', 'cards');
    for (const task of matching) cards.append(taskCard(task));
    if (!matching.length) {
      const empty = element('div', 'empty');
      const mark = element('span', 'empty-icon', status === 'done' ? '✓' : '＋');
      mark.setAttribute('aria-hidden', 'true');
      const emptyTitle = isFiltered ? 'Nothing matches here.' : { todo: 'A little room to begin.', doing: 'One thing at a time.', done: 'Good things take a little time.' }[status];
      const emptyCopy = isFiltered ? 'Try another search or clear your filters.' : { todo: 'Add your first task. Small is a great place to start.', doing: 'Move a task here when you’re ready to give it your attention.', done: 'Your finished tasks will find a home here.' }[status];
      empty.append(mark, element('h3', '', emptyTitle), element('p', '', emptyCopy));
      cards.append(empty);
    }
    const bottomAdd = element('button', 'column-add');
    bottomAdd.type = 'button';
    bottomAdd.dataset.addStatus = status;
    const plus = element('span', '', '+');
    plus.setAttribute('aria-hidden', 'true');
    bottomAdd.append(plus, document.createTextNode('Add a task'));
    bottomAdd.setAttribute('aria-label', `Add a task in ${label}`);
    bottomAdd.addEventListener('click', () => openEditor(status));
    column.append(heading, cards, bottomAdd);
    board.append(column);
  }
}

function openEditor(status = 'todo', id = null) {
  const task = id ? tasks.find((item) => item.id === id) : null;
  if (id && !task) return;
  editingId = id;
  editorReturnStatus = status;
  form.reset();
  $('form-error').hidden = true;
  $('dialog-eyebrow').textContent = task ? 'A LITTLE MORE CLARITY' : 'MAKE A LITTLE ROOM';
  $('dialog-title').textContent = task ? 'Make it your own.' : 'A new task.';
  $('task-title').value = task?.title ?? '';
  $('task-description').value = task?.description ?? '';
  $('task-status').value = task?.status ?? status;
  $('task-priority').value = task?.priority ?? 'medium';
  $('delete-task').hidden = !task;
  $('save-task').textContent = task ? 'Save changes' : 'Add task ↗';
  editor.showModal();
  $('task-title').focus();
}

function closeEditor(focusTaskId = editingId) {
  editor.close();
  const target = focusTaskId ? board.querySelector(`[data-task-id="${focusTaskId}"] .edit-button`)
    : board.querySelector(`[data-add-status="${editorReturnStatus}"]`);
  (target ?? $('new-task')).focus({ preventScroll: true });
  editingId = null;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = { title: $('task-title').value, description: $('task-description').value, status: $('task-status').value, priority: $('task-priority').value };
  try {
    const id = editingId ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const nextTasks = editingId ? updateTask(tasks, id, input, now) : addTask(tasks, input, { id, now });
    commit(nextTasks, editingId ? 'Task updated. A little clearer.' : `Task added to ${STATUSES[input.status]}.`);
    closeEditor(id);
  } catch (error) {
    $('form-error').textContent = error.message;
    $('form-error').hidden = false;
  }
});

$('delete-task').addEventListener('click', () => {
  const index = tasks.findIndex((task) => task.id === editingId);
  if (index < 0) return closeEditor();
  const removed = tasks[index];
  commit(removeTask(tasks, removed.id), 'Task deleted.', () => {
    if (tasks.length >= MAX_TASKS) return notify('The board is full. Remove a task before restoring this one.');
    if (tasks.some((task) => task.id === removed.id)) return;
    const position = Math.min(index, tasks.length);
    commit([...tasks.slice(0, position), removed, ...tasks.slice(position)], 'Task restored.');
  });
  closeEditor(null);
});

$('new-task').addEventListener('click', () => openEditor());
$('close-dialog').addEventListener('click', () => closeEditor());
$('cancel-dialog').addEventListener('click', () => closeEditor());
editor.addEventListener('cancel', (event) => { event.preventDefault(); closeEditor(); });
$('search').addEventListener('input', render);
$('priority-filter').addEventListener('change', render);
$('status-filter').addEventListener('change', render);
$('clear-filters').addEventListener('click', () => {
  $('search').value = '';
  $('priority-filter').value = 'all';
  $('status-filter').value = 'all';
  render();
  $('search').focus();
});
for (const id of ['help-button', 'about-footer']) $(id).addEventListener('click', () => help.showModal());
for (const id of ['close-help', 'got-it']) $(id).addEventListener('click', () => help.close());
$('dismiss-toast').addEventListener('click', dismissToast);
$('undo-button').addEventListener('click', () => { const action = undoAction; dismissToast(); action?.(); });
$('today').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  tasks = raw === null ? createExampleTasks(new Date().toISOString()) : deserializeBoard(raw);
  if (raw === null) persist();
} catch {
  tasks = createExampleTasks(new Date().toISOString());
  storageWarning = 'Your saved board couldn’t be read. Sample tasks are shown instead. Your next change will try to save a new board on this device.';
  $('storage-notice').textContent = storageWarning;
  $('storage-notice').hidden = false;
  saveIndicator(false);
}

window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  try {
    tasks = event.newValue === null ? [] : deserializeBoard(event.newValue);
    render();
    saveIndicator(true);
    notify('Board updated in another tab.');
  } catch {
    notify('A saved update couldn’t be read. This board is unchanged.');
  }
});
render();
