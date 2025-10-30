'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addTodo as addTodoAPI } from '@/lib/supabase/todos';
import { TodoItem } from './todo-item';
import { TodoInput } from './todo-input';
import { Filter } from 'lucide-react';
import { getTodos } from '@/lib/supabase/todos';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import type { SupabaseChannel, PostgresChangesPayload } from '@supabase/ssr';
import type { Todo } from '@/lib/supabase/todos';

export function TodoListServer() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [currentFilter, setCurrentFilter] = useState<
    'all' | 'active' | 'completed'
  >('all');
  const supabase = createClient();

  useEffect(() => {
    let channel: SupabaseChannel | null = null;
    
    const init = async () => {
      try {
        // 获取当前用户
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('获取用户失败:', userError);
          return;
        }
        if (!userData.user) {
          console.error('没有找到用户');
          return;
        }
        
        // 获取 todos 数据
        const todos = await getTodos();
        setTodos(todos);
        
        // 设置实时订阅
        const channelName = `todos:${userData.user.id}`;
        channel = supabase
          .channel(channelName)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'todos',
            filter: `user_id=eq.${userData.user.id}`
          }, (payload: PostgresChangesPayload<Todo>) => {
            console.log(`实时更新 ${payload.eventType}:`, payload.new || payload.old);
            
            switch (payload.eventType) {
              case 'INSERT':
                if (payload.new) {
                  // 添加新 todo 到列表开头
                  setTodos(prev => [
                    { ...payload.new, created_at: new Date(payload.new.created_at) },
                    ...prev
                  ]);
                }
                break;
              case 'UPDATE':
                if (payload.new) {
                  // 更新 todo
                  setTodos(prev => prev.map(todo => 
                    todo.id === payload.new.id ? 
                      { ...payload.new, created_at: new Date(payload.new.created_at) } : todo
                  ));
                }
                break;
              case 'DELETE':
                if (payload.old) {
                  // 删除 todo
                  setTodos(prev => prev.filter(todo => todo.id !== payload.old.id));
                }
                break;
              default:
                console.warn('未知的事件类型:', payload.eventType);
                break;
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('实时订阅已建立');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('实时订阅出现错误');
            } else if (status === 'TIMED_OUT') {
              console.error('实时订阅超时');
            } else if (status === 'CLOSED') {
              console.log('实时订阅已关闭');
            }
          });
      } catch (error) {
        console.error('初始化失败:', error);
      }
    };

    init();

    // 组件卸载时取消订阅
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const filteredTodos = todos.filter((todo) => {
    if (currentFilter === 'active') return !todo.completed;
    if (currentFilter === 'completed') return todo.completed;
    return true;
  });

  const handleAddTodo = async (text: string, imageUrl?: string) => {
    try {
      const newTodo = await addTodoAPI(text, imageUrl);
      if (newTodo) {
        setTodos([
          newTodo,
          ...todos,
        ]);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error adding todo:', error.message);
        throw error;
      } else {
        console.error('Error adding todo:', error);
        throw new Error('Failed to add todo');
      }
    }
  };

  const handleToggleTodo = async (id: string, completed: boolean) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('No user found');

      const { error } = await supabase
        .from('todos')
        .update({ completed })
        .eq('id', id)
        .eq('user_id', userData.user.id);
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
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('No user found');
      
      // Get the todo to check if it has an image
      const { data: todo, error: getTodoError } = await supabase
        .from('todos')
        .select('image_url')
        .eq('id', id)
        .eq('user_id', userData.user.id)
        .single();
      
      if (getTodoError) throw getTodoError;
      
      // Delete the image if it exists
      if (todo.image_url) {
        // Extract the file path from the public URL
        const filePath = todo.image_url.split('/').slice(-2).join('/');
        const { error: deleteImageError } = await supabase.storage.from('todo-bucket').remove([filePath]);
        if (deleteImageError) console.error('Error deleting image:', deleteImageError);
      }
      
      // Delete the todo record
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', userData.user.id);
      
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
