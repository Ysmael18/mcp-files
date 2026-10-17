# Todo App

A simple command-line todo application with JSON persistence.

## Features
- `add <description>`: Adds a new task to `todos.json`.
- `list`: Displays all tasks with their completion status (`[ ]` or `[x]`).
- `done <id>`: Marks the specified task ID as done.

## Usage

### Shell wrapper:
```bash
./todo/todo add "Buy groceries"
./todo/todo list
./todo/todo done 1
```

### Python:
```bash
python3 todo/todo.py add "Buy groceries"
python3 todo/todo.py list
python3 todo/todo.py done 1
```

### Node.js:
```bash
node todo/todo.js add "Buy groceries"
node todo/todo.js list
node todo/todo.js done 1
```

## Storage
Tasks are stored in `todo/todos.json`.
