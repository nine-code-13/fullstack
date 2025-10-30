'use client';

import { useState } from 'react';
import { TodoItem } from './todo-item';
import { TodoInput } from './todo-input';
import { Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  imageUrl?: string;
  createdAt: Date;
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([
    {
      id: '1',
      text: 'Learn Next.js',
      completed: false,
      createdAt: new Date(),
    },
    {
      id: '2',
      text: 'Build a Todo List',
      completed: true,
      createdAt: new Date(),
    },
    {
      id: '3',
      text: 'Deploy to Vercel',
      completed: false,
      createdAt: new Date(),
    },
  ]);
  
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const addTodo = (text: string, imageUrl?: string) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      imageUrl,
      createdAt: new Date(),
    };
    setTodos([newTodo, ...todos]);
  };

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  return (
    <div className="w-full max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Todo List</h1>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select
            value={filter}
            onValueChange={(value) => setFilter(value as 'all' | 'active' | 'completed')}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <TodoInput onAddTodo={addTodo} />
      
      <div className="mt-6 space-y-3">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg">No todos found</p>
            <p className="text-sm mt-2">Add a new todo to get started!</p>
          </div>
        ) : (
          filteredTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          ))
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {filteredTodos.length} of {todos.length} todos
        </p>
      </div>
    </div>
  );
}