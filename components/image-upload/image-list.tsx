'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Trash2, ZoomIn, XCircle, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface Image {
  id: string;
  name: string;
  original_size: number;
  compressed_size: number;
  url: string;
  created_at: string;
}

interface ImageListComponentProps {
  images: Image[];
}

const ImageListComponent = ({ images }: ImageListComponentProps) => {
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const supabase = createClient();

  const formatFileSize = (size: number): string => {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyImageUrl = (url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => {
        toast.success('图片链接已复制到剪贴板');
      })
      .catch(err => {
        console.error('复制失败:', err);
        toast.error('复制失败，请手动复制链接');
      });
  };

  const deleteImage = async (image: Image) => {
    setIsDeleting(image.id);
    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('id', image.id);

      if (dbError) {
        throw dbError;
      }

      // Delete from storage
      const fileName = image.url.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase
          .storage
          .from('todo-bucket')
          .remove([fileName]);

        if (storageError) {
          throw storageError;
        }
      }

      toast.success('图片已删除');
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败，请稍后重试');
    } finally {
      setIsDeleting(null);
    }
  };

  const openImageModal = (image: Image) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  if (images.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>已上传图片</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">暂无已上传的图片</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>已上传图片</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <Card key={image.id} className="overflow-hidden group">
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={image.url}
                    alt={image.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => openImageModal(image)}
                      className="h-8 w-8"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => copyImageUrl(image.url)}
                      className="h-8 w-8"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => deleteImage(image)}
                      className="h-8 w-8"
                      disabled={isDeleting === image.id}
                    >
                      {isDeleting === image.id ? (
                        <span className="loading loading-spinner h-4 w-4" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium truncate">{image.name}</p>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(image.compressed_size)}</span>
                      <span>{formatDate(image.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Image Preview Modal */}
      {isModalOpen && selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full">
            <Button
              size="icon"
              variant="destructive"
              onClick={closeImageModal}
              className="absolute top-2 right-2 z-10"
            >
              <XCircle className="h-6 w-6" />
            </Button>
            <div className="w-full h-full flex items-center justify-center">
              <Image
                src={selectedImage.url}
                alt={selectedImage.name}
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="absolute bottom-2 left-0 right-0 bg-black/50 p-3 text-white">
              <div className="flex justify-between items-center">
                <p className="font-medium">{selectedImage.name}</p>
                <div className="flex gap-4 text-sm">
                  <span>原始大小: {formatFileSize(selectedImage.original_size)}</span>
                  <span>压缩大小: {formatFileSize(selectedImage.compressed_size)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageListComponent;