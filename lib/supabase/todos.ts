import { createClient } from './server';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  image_url?: string;
  created_at: Date;
}

export async function getTodos(): Promise<Todo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching todos:', error);
    return [];
  }

  return (data || []).map((todo) => ({
    ...todo,
    created_at: new Date(todo.created_at),
  }));
}