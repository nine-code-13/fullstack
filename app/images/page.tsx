import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ImageUploadComponent from '@/components/image-upload/image-upload';
import ImageListComponent from '@/components/image-upload/image-list';

interface Image {
  id: string;
  name: string;
  original_size: number;
  compressed_size: number;
  url: string;
  created_at: string;
}

export default async function ImagesPage() {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session) {
    redirect('/auth/login');
  }

  // Fetch all images
  const { data: images, error: fetchError } = await supabase
    .from('images')
    .select('*')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('Error fetching images:', fetchError);
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <h2 className="font-bold text-2xl mb-4">图片上传管理</h2>
      <ImageUploadComponent />
      <ImageListComponent images={images as Image[] || []} />
    </div>
  );
}