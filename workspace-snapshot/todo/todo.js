#!/usr/bin/env node
/**
 * Simple command-line todo app stored in JSON.
 * Commands:
 *   add <task description>  - Add a new task
 *   list                    - List all tasks
 *   done <task_id>          - Mark a task as completed
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'todos.json');

function loadTodos() {
  if (!fs.existsSync(DB_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveTodos(todos) {
  fs.writeFileSync(DB_FILE, JSON.stringify(todos, null, 2), 'utf8');
}

function addTask(title) {
  const todos = loadTodos();
  const nextId = todos.reduce((max, t) => Math.max(max, t.id || 0), 0) + 1;
  const newTask = {
    id: nextId,
    title: title,
    done: false
  };
  todos.push(newTask);
  saveTodos(todos);
  console.log(`Added task ${nextId}: ${title}`);
}

function listTasks() {
  const todos = loadTodos();
  if (todos.length === 0) {
    console.log('No tasks found.');
    return;
  }
  for (const t of todos) {
    const status = t.done ? '[x]' : '[ ]';
    console.log(`${t.id}. ${status} ${t.title}`);
  }
}

function doneTask(idStr) {
  const taskId = parseInt(idStr, 10);
  if (isNaN(taskId)) {
    console.error(`Error: Invalid task ID '${idStr}'. Must be an integer.`);
    process.exit(1);
  }

  const todos = loadTodos();
  const task = todos.find(t => t.id === taskId);
  if (!task) {
    console.error(`Error: Task ${taskId} not found.`);
    process.exit(1);
  }

  task.done = true;
  saveTodos(todos);
  console.log(`Marked task ${taskId} as done: ${task.title}`);
}

function showHelp() {
  console.log('Usage: todo <command> [arguments]');
  console.log('\nCommands:');
  console.log('  add <task description>   Add a new task');
  console.log('  list                     List all tasks');
  console.log('  done <task_id>           Mark task as done');
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    showHelp();
    process.exit(1);
  }

  const cmd = args[0].toLowerCase();
  if (cmd === 'add') {
    if (args.length < 2) {
      console.error("Error: Missing task description for 'add'.");
      process.exit(1);
    }
    const title = args.slice(1).join(' ');
    addTask(title);
  } else if (cmd === 'list') {
    listTasks();
  } else if (cmd === 'done') {
    if (args.length < 2) {
      console.error("Error: Missing task ID for 'done'.");
      process.exit(1);
    }
    doneTask(args[1]);
  } else if (cmd === '-h' || cmd === '--help' || cmd === 'help') {
    showHelp();
  } else {
    console.error(`Unknown command: ${cmd}`);
    showHelp();
    process.exit(1);
  }
}

main();
