export const STATUSES = Object.freeze({ todo: 'To do', doing: 'In progress', done: 'Done' });
export const PRIORITIES = Object.freeze({ high: 'High', medium: 'Medium', low: 'Low' });
export const MAX_TASKS = 200;

function assertDate(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new Error('The task date is invalid.');
  }
  return value;
}

function taskFields(input) {
  if (!input || typeof input !== 'object') throw new Error('This task is invalid.');
  if (typeof input.title !== 'string') throw new Error('Give your task a title.');
  const title = input.title.trim();
  if (!title) throw new Error('Give your task a title.');
  if (title.length > 120) throw new Error('Keep the title under 121 characters.');
  const description = input.description ?? '';
  if (typeof description !== 'string' || description.length > 1000) {
    throw new Error('Keep notes under 1,001 characters.');
  }
  const status = input.status ?? 'todo';
  const priority = input.priority ?? 'medium';
  if (typeof status !== 'string' || !Object.hasOwn(STATUSES, status)) throw new Error('Choose a valid task status.');
  if (typeof priority !== 'string' || !Object.hasOwn(PRIORITIES, priority)) throw new Error('Choose a valid priority.');
  return { title, description: description.trim(), status, priority };
}

export function createTask(input, { id, now }) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    throw new Error('The task id is invalid.');
  }
  return { id, ...taskFields(input), createdAt: assertDate(now), updatedAt: now };
}

export function addTask(tasks, input, metadata) {
  if (tasks.length >= MAX_TASKS) throw new Error('This board holds up to 200 tasks. Remove one to make room.');
  const task = createTask(input, metadata);
  if (tasks.some((item) => item.id === task.id)) throw new Error('This task already exists.');
  return [...tasks, task];
}

export function updateTask(tasks, id, changes, now) {
  if (!tasks.some((task) => task.id === id)) throw new Error('This task is no longer on the board.');
  assertDate(now);
  return tasks.map((task) => task.id === id
    ? { ...task, ...taskFields({ ...task, ...changes }), updatedAt: now }
    : task);
}

export function moveTask(tasks, id, status, now) {
  return updateTask(tasks, id, { status }, now);
}

export function removeTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

export function filterTasks(tasks, { query = '', priority = 'all', status = 'all' } = {}) {
  const needle = query.trim().toLocaleLowerCase();
  return tasks.filter((task) =>
    (priority === 'all' || task.priority === priority) &&
    (status === 'all' || task.status === status) &&
    (!needle || `${task.title}\n${task.description}`.toLocaleLowerCase().includes(needle)));
}

export function taskCounts(tasks) {
  return tasks.reduce((counts, task) => {
    counts[task.status] += 1;
    counts.total += 1;
    return counts;
  }, { total: 0, todo: 0, doing: 0, done: 0 });
}

export function serializeBoard(tasks) {
  return JSON.stringify({ version: 1, tasks });
}

export function deserializeBoard(raw) {
  if (typeof raw !== 'string' || raw.length > 1_000_000) throw new Error('The saved board is invalid.');
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !Array.isArray(data.tasks) || data.tasks.length > MAX_TASKS) {
    throw new Error('The saved board format is unsupported.');
  }
  const ids = new Set();
  return data.tasks.map((input) => {
    const task = createTask(input, { id: input?.id, now: input?.createdAt });
    if (ids.has(task.id)) throw new Error('The saved board contains duplicate tasks.');
    ids.add(task.id);
    return { ...task, updatedAt: assertDate(input.updatedAt) };
  });
}

export function createExampleTasks(now) {
  const examples = [
    ['Sketch the new homepage', 'Start with the big picture. A rough first pass is a perfectly good first step.', 'todo', 'high'],
    ['Plan a little time outside', 'Find a new walking route. Leave the headphones at home.', 'todo', 'low'],
    ['Choose next week’s priorities', 'Three things that would make the week feel like a win.', 'todo', 'medium'],
    ['Turn good notes into a clear plan', 'Pull out the useful bits, connect the dots, and choose what comes next.', 'doing', 'high'],
    ['Make something just for fun', 'No brief, no deadline. Follow the interesting idea.', 'doing', 'medium'],
    ['Clear a corner of the desk', 'A little space goes a long way.', 'done', 'low'],
    ['Make room for focused work', 'One quiet hour, one thing at a time.', 'done', 'medium'],
  ];
  return examples.map(([title, description, status, priority], index) =>
    createTask({ title, description, status, priority }, { id: `sample-${index + 1}`, now }));
}
