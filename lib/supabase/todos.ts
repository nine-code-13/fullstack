import { createClient } from './client';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  image_url?: string;
  created_at: Date;
  user_id: string;
}

// 超时重试函数
const retryWithTimeout = async <T>(fn: () => Promise<T>, retries = 1, timeout = 3000): Promise<T> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const result = await fn();
    clearTimeout(id);
    return result;
  } catch (error) {
    clearTimeout(id);
    
    if (retries > 0 && (error instanceof Error && error.name === 'AbortError')) {
      console.log(`Request timed out, retrying... (${retries} retries left)`);
      return retryWithTimeout(fn, retries - 1, timeout);
    }
    
    throw error;
  }
};

export async function getTodos(): Promise<Todo[]> {
  const supabase = await createClient();
  
  // Get the current user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error('Error getting user:', userError);
    return [];
  }
  
  if (!userData.user) {
    console.error('No user found');
    return [];
  }
  
  try {
    const { data, error } = await retryWithTimeout(() => 
      supabase
        .from('todos')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
    );

    if (error) throw error;

    return (data || []).map((todo) => ({
      ...todo,
      created_at: new Date(todo.created_at),
    }));
  } catch (error) {
    console.error('Error fetching todos:', error);
    return [];
  }
}

export async function addTodo(text: string, imageUrl?: string): Promise<Todo> {
  const supabase = await createClient();
  
  // Get the current user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw new Error('Authentication error: ' + userError.message);
  }
  
  if (!userData.user) {
    throw new Error('You must be logged in to add a todo');
  }
  
  try {
    const { data, error } = await retryWithTimeout(() => 
      supabase
        .from('todos')
        .insert({
          text,
          completed: false,
          image_url: imageUrl,
          user_id: userData.user.id,
        })
        .select('*')
        .single()
    );

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        throw new Error('A todo with this text already exists');
      }
      throw error;
    }

    if (!data) {
      throw new Error('Failed to add todo: No data returned');
    }

    return {
      ...data,
      created_at: new Date(data.created_at),
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error adding todo:', error.message);
      throw error;
    } else {
      console.error('Error adding todo:', error);
      throw new Error('Failed to add todo');
    }
  }
}