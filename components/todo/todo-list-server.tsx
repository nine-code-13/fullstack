'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TodoItem } from './todo-item';
import { TodoInput } from './todo-input';
import { Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  image_url?: string;
  created_at: Date;
}

export function TodoListServer() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [currentFilter, setCurrentFilter] = useState<
    'all' | 'active' | 'completed'
  >('all');
  const supabase = createClient();

  useEffect(() => {
    const fetchTodos = async () => {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching todos:', error);
        return;
      }

      if (data) {
        setTodos(
          data.map((todo) => ({
            ...todo,
            created_at: new Date(todo.created_at),
          })),
        );
      }
    };

    fetchTodos();
  }, []);

  const filteredTodos = todos.filter((todo) => {
    if (currentFilter === 'active') return !todo.completed;
    if (currentFilter === 'completed') return todo.completed;
    return true;
  });

  const handleAddTodo = async (text: string, imageUrl?: string) => {
    try {
      const { data, error } = await supabase
        .from('todos')
        .insert({
          text,
          completed: false,
          image_url: imageUrl,
        })
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        setTodos([
          { ...data, created_at: new Date(data.created_at) },
          ...todos,
        ]);
      }
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  const handleToggleTodo = async (id: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ completed })
        .eq('id', id);
      if (error) throw error;
      setTodos(
        todos.map((todo) => (todo.id === id ? { ...todo, completed } : todo)),
      );
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) throw error;
      setTodos(todos.filter((todo) => todo.id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Todo List</h1>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select
            defaultValue={currentFilter}
            onValueChange={(value) =>
              setCurrentFilter(value as 'all' | 'active' | 'completed')
            }
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

      <TodoInput onAddTodo={handleAddTodo} />

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
              todo={{
                ...todo,
                createdAt: todo.created_at,
                imageUrl: todo.image_url,
              }}
              onToggle={handleToggleTodo}
              onDelete={handleDeleteTodo}
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
