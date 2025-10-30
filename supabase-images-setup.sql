-- 创建images表
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  original_size INTEGER NOT NULL,
  compressed_size INTEGER NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建存储桶
INSERT INTO storage.buckets (id, name, public) VALUES ('todo-bucket', 'todo-bucket', true);

-- 设置存储桶策略
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'todo-bucket');

CREATE POLICY "Allow public access to files" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'todo-bucket');

CREATE POLICY "Allow authenticated users to delete their own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'todo-bucket');