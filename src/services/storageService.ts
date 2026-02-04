
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { toast } from '@/hooks/use-toast';

interface UploadOptions {
  file: File;
  path: string;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  onSuccess?: (url: string) => void;
}

export const uploadFile = ({ file, path, onProgress, onError, onSuccess }: UploadOptions): { cancel: () => void } => {
  // Create a storage reference
  const storageRef = ref(storage, path);
  
  // Create the upload task
  const uploadTask = uploadBytesResumable(storageRef, file);
  
  // Register observers
  uploadTask.on(
    'state_changed',
    (snapshot) => {
      // Progress observer
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      if (onProgress) onProgress(progress);
    },
    (error) => {
      // Error observer
      console.error('Upload error:', error);
      if (onError) onError(error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível fazer o upload do arquivo.',
        variant: 'destructive'
      });
    },
    () => {
      // Completion observer
      getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
        if (onSuccess) onSuccess(downloadURL);
        toast({
          title: 'Upload concluído',
          description: 'Arquivo enviado com sucesso.',
        });
      });
    }
  );
  
  // Return cancel function
  return {
    cancel: () => uploadTask.cancel()
  };
};

export const deleteFile = async (url: string): Promise<boolean> => {
  try {
    // Extract the path from the URL
    const urlObj = new URL(url);
    const path = decodeURIComponent(urlObj.pathname.split('/o/')[1].split('?')[0]);
    
    // Create a reference to the file
    const fileRef = ref(storage, path);
    
    // Delete the file
    await deleteObject(fileRef);
    
    toast({
      title: 'Arquivo excluído',
      description: 'O arquivo foi excluído com sucesso.'
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    
    toast({
      title: 'Erro ao excluir',
      description: 'Não foi possível excluir o arquivo.',
      variant: 'destructive'
    });
    
    return false;
  }
};

// Simple helper for direct uploads when no progress tracking is needed
export const uploadFileToStorage = async (file: File, folder: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const path = `${folder}/${Date.now()}_${file.name}`;
    
    uploadFile({
      file,
      path,
      onSuccess: (url) => resolve(url),
      onError: (error) => reject(error)
    });
  });
};
