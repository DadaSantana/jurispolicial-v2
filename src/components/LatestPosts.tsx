'use client'
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Instagram } from 'lucide-react';
import Link from 'next/link';
import { Post } from '@/types/Post';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const LatestPosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('dataCriacao', 'desc'), limit(6));
        const querySnapshot = await getDocs(q);
        
        const postsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];

        setPosts(postsData);
      } catch (error) {
        console.error('Erro ao buscar posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Carregando posts...</h2>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Últimas Publicações</h2>
          <p className="text-gray-600">
            Mantenha-se atualizado com nossos conteúdos sobre legislação, técnicas e novidades relacionadas ao ambiente policial
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post) => (
            <div 
              key={post.id} 
              className={cn(
                "bg-white rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg",
                post.exclusivo && "border-2 border-[#FFD700]"
              )}
            >
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={post.imagem} 
                  alt={post.titulo} 
                  className="w-full h-full object-cover transition-transform hover:scale-105"
                />
                {post.exclusivo && (
                  <div className="absolute top-2 right-2 bg-[#FFD700] text-black px-3 py-1 rounded-full text-sm font-semibold">
                    Exclusivo
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 text-gray-900">{post.titulo}</h3>
                <p className="text-gray-600 mb-4">{post.descricao}</p>
                <div className="flex justify-between">
                  <Button asChild variant="outline" className="text-primary border-primary hover:bg-primary hover:text-white">
                    <Link href={post.linkInstagram}>Ler Mais</Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon" className="text-pink-600 hover:text-pink-700">
                    <a href={post.linkInstagram} target="_blank" rel="noopener noreferrer" aria-label="Ver no Instagram">
                      <Instagram />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Button asChild variant="outline" className="text-primary border-primary">
            <Link href="https://www.instagram.com/juris_policial/">Ver Todas as Publicações</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default LatestPosts;
