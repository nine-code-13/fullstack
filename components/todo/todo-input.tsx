'use client';

import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Image as ImageIcon, Paperclip, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface TodoInputProps {
  onAddTodo: (text: string, imageUrl?: string) => void;
}

export function TodoInput({ onAddTodo }: TodoInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('No user found');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${userData.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('todo-bucket').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('todo-bucket').getPublicUrl(filePath);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      let imageUrl: string | undefined;
      if (selectedImage) {
        const uploadedUrl = await uploadImageToSupabase(selectedImage);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }
      onAddTodo(inputValue.trim(), imageUrl);
      setInputValue('');
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Input
          type="text"
          placeholder="Add a new todo..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 min-w-[200px]"
          disabled={isUploading}
        />
        
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
          id="image-upload"
          disabled={isUploading}
        />
        
        {!imagePreview ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => document.getElementById('image-upload')?.click()}
            className="h-10"
            disabled={isUploading}
          >
            <Paperclip className="h-4 w-4" />
            <span className="sr-only">Attach Image</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRemoveImage}
            className="h-10 text-destructive"
            disabled={isUploading}
          >
            <ImageIcon className="h-4 w-4" />
            <span className="sr-only">Remove Image</span>
          </Button>
        )}
        
        <Button
          type="submit"
          disabled={!inputValue.trim() || isUploading}
          className="h-10"
        >
          {isUploading ? (
            <UploadCloud className="h-4 w-4 animate-spin" />
          ) : (
            'Add'
          )}
        </Button>
      </div>
      
      {imagePreview && (
        <div className="flex items-center gap-3 p-3 bg-secondary rounded-md">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Image selected</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveImage}
            className="ml-auto text-xs"
            disabled={isUploading}
          >
            Remove
          </Button>
        </div>
      )}
    </form>
  );
}