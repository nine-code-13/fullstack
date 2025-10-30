import { createClient } from './client';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  image_url?: string;
  created_at: Date;
  user_id: string;
}

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
  
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userData.user.id)
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