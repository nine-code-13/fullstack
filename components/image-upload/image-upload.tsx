'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UploadFile { 
  file: File;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
  progress: number;
  status: 'idle' | 'compressing' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

const ImageUploadComponent = () => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const supabase = createClient();

  const compressImage = useCallback(async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
  }, []);

  const uploadFile = useCallback(async (file: File, index: number) => {
    try {
      // Update status to compressing
      setFiles(prevFiles => {
        const newFiles = [...prevFiles];
        newFiles[index] = {
          ...newFiles[index],
          status: 'compressing',
        };
        return newFiles;
      });

      // Compress the image
      const compressedFile = await compressImage(file);

      // Update compression info
      setFiles(prevFiles => {
        const newFiles = [...prevFiles];
        const originalSizeMB = newFiles[index].originalSize / (1024 * 1024);
        const compressedSizeMB = compressedFile.size / (1024 * 1024);
        const compressionRatio = Math.round((1 - (compressedFile.size / newFiles[index].originalSize)) * 100);

        newFiles[index] = {
          ...newFiles[index],
          compressedSize: compressedFile.size,
          compressionRatio,
          status: 'uploading',
        };
        return newFiles;
      });

      // Upload to Supabase Storage
      const fileName = `${Date.now()}-${compressedFile.name}`;
      const { error: uploadError, data } = await supabase
        .storage
        .from('todo-bucket')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      // Set progress to 100% after upload completes
      setFiles(prevFiles => {
        const newFiles = [...prevFiles];
        newFiles[index] = {
          ...newFiles[index],
          progress: 100,
        };
        return newFiles;
      });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('todo-bucket').getPublicUrl(fileName);

      // Save image metadata to database
      const { error: dbError } = await supabase
        .from('images')
        .insert([{
          name: file.name,
          original_size: file.size,
          compressed_size: compressedFile.size,
          url: publicUrl,
        }]);

      if (dbError) {
        throw dbError;
      }

      // Update status to completed
      setFiles(prevFiles => {
        const newFiles = [...prevFiles];
        newFiles[index] = {
          ...newFiles[index],
          status: 'completed',
        };
        return newFiles;
      });

      toast.success(`图片上传成功: ${file.name}`);

      // Remove completed file after 2 seconds
      setTimeout(() => {
        setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
      }, 2000);

    } catch (error) {
      console.error('Error uploading file:', error);
      setFiles(prevFiles => {
        const newFiles = [...prevFiles];
        newFiles[index] = {
          ...newFiles[index],
          status: 'failed',
          error: error instanceof Error ? error.message : '未知错误',
        };
        return newFiles;
      });
      toast.error(`上传失败: ${file.name}`);
    }
  }, [compressImage, supabase]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter to only accept image files
    const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('请上传图片文件');
      return;
    }

    // Add new files to state
    const newFiles: UploadFile[] = imageFiles.map(file => ({
      file,
      originalSize: file.size,
      progress: 0,
      status: 'idle',
    }));

    setFiles(prevFiles => {
      const updatedFiles = [...prevFiles, ...newFiles];
      
      // Start uploading each file
      newFiles.forEach((fileObj, index) => {
        uploadFile(fileObj.file, prevFiles.length + index);
      });
      
      return updatedFiles;
    });

  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif'] },
    multiple: true,
  });

  const formatFileSize = (size: number): string => {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>图片上传</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <Upload className="h-12 w-12 text-primary" />
              <p className="text-xl font-medium">释放文件以上传</p>
              <p className="text-sm text-muted-foreground">支持JPG、PNG、GIF格式</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3">
              <Upload className="h-12 w-12 text-gray-400" />
              <p className="text-xl font-medium">拖拽图片到此处</p>
              <p className="text-sm text-muted-foreground">或点击选择文件</p>
              <Button className="mt-2">选择图片</Button>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="mt-8 space-y-4">
            {files.map((file, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <span className="font-medium truncate max-w-xs">{file.file.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {file.status === 'compressing' && (
                      <span className="text-sm text-blue-600">压缩中...</span>
                    )}
                    {file.status === 'uploading' && (
                      <span className="text-sm text-blue-600">上传中...</span>
                    )}
                    {file.status === 'completed' && (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        完成
                      </span>
                    )}
                    {file.status === 'failed' && (
                      <span className="flex items-center gap-1 text-sm text-red-600">
                        <XCircle className="h-4 w-4" />
                        失败
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Progress value={file.progress} className="w-full" />
                  
                  {file.status === 'compressing' && (
                    <div className="text-xs text-blue-600">
                      正在压缩图片...
                    </div>
                  )}
                  
                  {file.status === 'uploading' && file.compressedSize && (
                    <div className="flex justify-between text-xs text-blue-600">
                      <span>上传进度: {file.progress}%</span>
                      <span>{formatFileSize(file.compressedSize)}</span>
                    </div>
                  )}
                  
                  {file.status === 'completed' && file.compressedSize && (
                    <div className="flex justify-between text-xs text-green-600">
                      <span>原始大小: {formatFileSize(file.originalSize)}</span>
                      <span>压缩大小: {formatFileSize(file.compressedSize)} ({file.compressionRatio}% 减少)</span>
                    </div>
                  )}
                  
                  {file.status === 'failed' && file.error && (
                    <div className="text-xs text-red-600">
                      错误: {file.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ImageUploadComponent;