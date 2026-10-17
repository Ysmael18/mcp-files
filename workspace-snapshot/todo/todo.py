#!/usr/bin/env python3
"""
Simple command-line todo app stored in JSON.
Commands:
  add <task description>  - Add a new task
  list                    - List all tasks
  done <task_id>          - Mark a task as completed
  delete <task_id>        - Delete a task
"""

import sys
import json
import os

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "todos.json")

def load_todos():
    if not os.path.exists(DB_FILE):
        return []
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []

def save_todos(todos):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(todos, f, indent=2)

def add_task(title):
    todos = load_todos()
    next_id = max([t["id"] for t in todos], default=0) + 1
    new_task = {
        "id": next_id,
        "title": title,
        "done": False
    }
    todos.append(new_task)
    save_todos(todos)
    print(f"Added task {next_id}: {title}")

def list_tasks():
    todos = load_todos()
    if not todos:
        print("No tasks found.")
        return
    for t in todos:
        status = "[x]" if t.get("done") else "[ ]"
        print(f"{t['id']}. {status} {t['title']}")

def done_task(task_id_str):
    try:
        task_id = int(task_id_str)
    except ValueError:
        print(f"Error: Invalid task ID '{task_id_str}'. Must be an integer.")
        sys.exit(1)

    todos = load_todos()
    found = False
    for t in todos:
        if t["id"] == task_id:
            t["done"] = True
            found = True
            print(f"Marked task {task_id} as done: {t['title']}")
            break

    if not found:
        print(f"Error: Task {task_id} not found.")
        sys.exit(1)

    save_todos(todos)

def delete_task(task_id_str):
    try:
        task_id = int(task_id_str)
    except ValueError:
        print(f"Error: Invalid task ID '{task_id_str}'. Must be an integer.")
        sys.exit(1)

    todos = load_todos()
    task_to_delete = None
    for t in todos:
        if t["id"] == task_id:
            task_to_delete = t
            break

    if not task_to_delete:
        print(f"Error: Task {task_id} not found.")
        sys.exit(1)

    todos.remove(task_to_delete)
    save_todos(todos)
    print(f"Deleted task {task_id}: {task_to_delete['title']}")

def show_help():
    print("Usage: todo <command> [arguments]")
    print("\nCommands:")
    print("  add <task description>   Add a new task")
    print("  list                     List all tasks")
    print("  done <task_id>           Mark task as done")
    print("  delete <task_id>         Delete a task")

def main():
    if len(sys.argv) < 2:
        show_help()
        sys.exit(1)

    cmd = sys.argv[1].lower()
    if cmd == "add":
        if len(sys.argv) < 3:
            print("Error: Missing task description for 'add'.")
            sys.exit(1)
        title = " ".join(sys.argv[2:])
        add_task(title)
    elif cmd == "list":
        list_tasks()
    elif cmd == "done":
        if len(sys.argv) < 3:
            print("Error: Missing task ID for 'done'.")
            sys.exit(1)
        done_task(sys.argv[2])
    elif cmd == "delete":
        if len(sys.argv) < 3:
            print("Error: Missing task ID for 'delete'.")
            sys.exit(1)
        delete_task(sys.argv[2])
    elif cmd in ("-h", "--help", "help"):
        show_help()
    else:
        print(f"Unknown command: {cmd}")
        show_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
