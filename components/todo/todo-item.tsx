'use client';

import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Trash2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  imageUrl?: string;
  createdAt: Date;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <div className="flex items-start gap-3 p-4 bg-card rounded-lg border shadow-sm">
      <Checkbox
        checked={todo.completed}
        onCheckedChange={(checked) => onToggle(todo.id, !!checked)}
        className="mt-1"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium ${todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {todo.text}
          </p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(todo.id)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
        
        {todo.imageUrl && (
          <div className="mt-3 rounded-md overflow-hidden border">
            <Image
              src={todo.imageUrl}
              alt="Todo attachment"
              width={300}
              height={200}
              className="w-full h-auto object-cover"
            />
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mt-2">
          {new Date(todo.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}