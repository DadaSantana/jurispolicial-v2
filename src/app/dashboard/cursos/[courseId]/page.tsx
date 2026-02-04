'use client'
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux/store';
import { User } from '@/types/user';
import { Course, Module, Lesson } from '@/types/course';
import { getCourse, getCourseModules, getCourseLessons } from '@/services/courseService';
import { getUserCourseProgress, markLessonComplete, calculateProgress } from '@/services/courseProgressService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  CheckCircle, 
  FileText, 
  Video, 
  Download, 
  ChevronRight,
  ChevronDown,
  X,
  ThumbsUp,
  ThumbsDown,
  Play
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const Page = () => {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const user: User = useSelector((state: RootState) => state.userSlice.user);

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [userProgress, setUserProgress] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completingLesson, setCompletingLesson] = useState<string | null>(null);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({});
  const [autoCompletedLessons, setAutoCompletedLessons] = useState<Set<string>>(new Set());
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Rastrear progresso do vídeo do Vimeo
  useEffect(() => {
    if (!activeLesson || activeLesson.tipo !== 'video' || !activeLesson.url) {
      return;
    }

    const lessonId = activeLesson.id;

    // Verificar se já foi completado automaticamente ou manualmente
    if (autoCompletedLessons.has(lessonId) || isLessonComplete(lessonId)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      // Verificar se a mensagem é do Vimeo
      if (event.origin !== 'https://player.vimeo.com') {
        return;
      }

      try {
        let data;
        if (typeof event.data === 'string') {
          try {
            data = JSON.parse(event.data);
          } catch {
            return;
          }
        } else {
          data = event.data;
        }

        // Vimeo Player API envia eventos em formato diferente
        // Eventos podem ser: play, pause, progress, timeupdate, etc.
        if (data.event === 'progress' || data.event === 'timeupdate') {
          const seconds = data.data?.seconds || data.data?.currentTime || 0;
          const duration = data.data?.duration || data.data?.duration || 1;
          
          if (duration > 0) {
            const progressPercent = (seconds / duration) * 100;

            // Atualizar progresso do vídeo
            setVideoProgress(prev => ({
              ...prev,
              [lessonId]: progressPercent
            }));

            // Se o progresso atingir 95% ou mais, marcar como concluído automaticamente
            if (progressPercent >= 95 && !autoCompletedLessons.has(lessonId) && !isLessonComplete(lessonId)) {
              setAutoCompletedLessons(prev => new Set(prev).add(lessonId));
              handleCompleteLesson(lessonId);
            }
          }
        }
      } catch (error) {
        // Ignorar erros de parsing
        console.debug('Erro ao processar evento do Vimeo:', error);
      }
    };

    // Escutar mensagens do player do Vimeo
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [activeLesson?.id, activeLesson?.tipo, activeLesson?.url, autoCompletedLessons]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Buscar curso
        const courseData = await getCourse(courseId);
        if (!courseData) {
          toast({
            title: 'Erro',
            description: 'Curso não encontrado',
            variant: 'destructive'
          });
          router.push('/dashboard/cursos');
          return;
        }
        setCourse(courseData);

        // Verificar se usuário está inscrito
        if (user?.uid) {
          const progress = await getUserCourseProgress(user.uid, courseId);
          if (!progress) {
            toast({
              title: 'Acesso negado',
              description: 'Você precisa se inscrever neste curso primeiro.',
              variant: 'destructive'
            });
            router.push('/dashboard/cursos');
            return;
          }
          setUserProgress(progress);
        }

        // Buscar módulos
        const modulesData = await getCourseModules(courseId);
        setModules(modulesData);

        // Buscar todas as aulas do curso
        const lessonsData = await getCourseLessons(courseId);
        setLessons(lessonsData);

        // Abrir primeiro módulo por padrão
        if (modulesData.length > 0) {
          setOpenModules({ [modulesData[0].id]: true });
          
          // Definir primeira aula como ativa
          const firstModuleLessons = lessonsData.filter(l => l.moduleId === modulesData[0].id);
          if (firstModuleLessons.length > 0) {
            setActiveLesson(firstModuleLessons[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching course data:', error);
        toast({
          title: 'Erro ao carregar curso',
          description: 'Não foi possível carregar os dados do curso.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    if (courseId && mounted) {
      fetchData();
    }
  }, [courseId, user?.uid, mounted]);

  const handleLessonClick = (lesson: Lesson) => {
    setActiveLesson(lesson);
  };

  const handleCompleteLesson = async (lessonId: string) => {
    if (!user?.uid) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para completar aulas.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setCompletingLesson(lessonId);

      const response = await fetch(`/api/cursos/${courseId}/progresso`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          lessonId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao marcar aula como completa');
      }

      // Atualizar progresso local
      const updatedProgress = await getUserCourseProgress(user.uid, courseId);
      setUserProgress(updatedProgress);

      // Recalcular progresso
      const newProgress = await calculateProgress(user.uid, courseId);

      toast({
        title: 'Aula concluída!',
        description: `Seu progresso: ${newProgress}%`,
      });

      // Verificar se concluiu o curso
      if (newProgress >= (course?.porcentagemMinimaCertificado || 100)) {
        toast({
          title: 'Parabéns!',
          description: 'Você concluiu o curso! Verifique seus certificados.',
        });
      }

      // Ir para próxima aula
      const currentIndex = lessons.findIndex(l => l.id === lessonId);
      if (currentIndex < lessons.length - 1) {
        setActiveLesson(lessons[currentIndex + 1]);
      }
    } catch (error: any) {
      console.error('Error completing lesson:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível marcar a aula como completa.',
        variant: 'destructive'
      });
    } finally {
      setCompletingLesson(null);
    }
  };

  const toggleModule = (moduleId: string) => {
    setOpenModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const isLessonComplete = (lessonId: string) => {
    return userProgress?.aulasCompletas?.includes(lessonId) || false;
  };

  const getModuleLessonsForModule = (moduleId: string) => {
    return lessons.filter(lesson => lesson.moduleId === moduleId).sort((a, b) => a.ordem - b.ordem);
  };

  const getLessonIcon = (lesson: Lesson) => {
    switch (lesson.tipo) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '--:--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}`;
    }
    return `${mins}:00`;
  };

  const getCurrentLessonIndex = () => {
    if (!activeLesson) return { moduleIndex: -1, lessonIndex: -1 };
    
    const moduleIndex = modules.findIndex(m => {
      const moduleLessons = getModuleLessonsForModule(m.id);
      return moduleLessons.some(l => l.id === activeLesson.id);
    });
    
    if (moduleIndex >= 0) {
      const moduleLessons = getModuleLessonsForModule(modules[moduleIndex].id);
      const lessonIndex = moduleLessons.findIndex(l => l.id === activeLesson.id);
      return { moduleIndex, lessonIndex };
    }
    
    return { moduleIndex: -1, lessonIndex: -1 };
  };

  const goToNextLesson = () => {
    const { moduleIndex, lessonIndex } = getCurrentLessonIndex();
    if (moduleIndex >= 0 && lessonIndex >= 0) {
      const moduleLessons = getModuleLessonsForModule(modules[moduleIndex].id);
      if (lessonIndex < moduleLessons.length - 1) {
        setActiveLesson(moduleLessons[lessonIndex + 1]);
      } else if (moduleIndex < modules.length - 1) {
        const nextModuleLessons = getModuleLessonsForModule(modules[moduleIndex + 1].id);
        if (nextModuleLessons.length > 0) {
          setActiveLesson(nextModuleLessons[0]);
          setOpenModules(prev => ({ ...prev, [modules[moduleIndex + 1].id]: true }));
        }
      }
    }
  };

  const getCurrentLessonPosition = () => {
    const { moduleIndex, lessonIndex } = getCurrentLessonIndex();
    if (moduleIndex >= 0 && lessonIndex >= 0) {
      const moduleLessons = getModuleLessonsForModule(modules[moduleIndex].id);
      return `${lessonIndex + 1}/${moduleLessons.length}`;
    }
    return '';
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return url;
    
    // Vimeo URL formats:
    // https://vimeo.com/123456789
    // https://player.vimeo.com/video/123456789
    // https://vimeo.com/123456789?h=abc123
    
    // Extract Vimeo video ID
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    
    if (vimeoMatch) {
      const videoId = vimeoMatch[1];
      // Adicionar parâmetros para permitir rastreamento de progresso
      return `https://player.vimeo.com/video/${videoId}?autoplay=0&title=0&byline=0&portrait=0&api=1`;
    }
    
    // YouTube URL formats:
    // https://www.youtube.com/watch?v=VIDEO_ID
    // https://youtu.be/VIDEO_ID
    // https://www.youtube.com/embed/VIDEO_ID
    
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0`;
    }
    
    // If already an embed URL or other format, return as is
    return url;
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Curso não encontrado</p>
          <Button onClick={() => router.push('/dashboard/cursos')}>
            Voltar para Cursos
          </Button>
        </div>
      </div>
    );
  }

  const progressPercentage = userProgress?.progresso || 0;
  const completedLessons = userProgress?.aulasCompletas?.length || 0;
  const totalLessons = lessons.length;

  return (
    <div className="fixed inset-0 left-64 flex flex-col bg-gray-50" style={{ width: 'calc(100% - 16rem)' }}>
      {/* Top Header */}
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/cursos')}
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cursos
          </Button>
          <div className="text-sm text-gray-400">
            {course.titulo} {activeLesson && `> ${activeLesson.titulo} ${getCurrentLessonPosition() && `(${getCurrentLessonPosition()})`}`}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-gray-400">
            Progresso: {progressPercentage}%
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
            {user?.nome?.charAt(0).toUpperCase() || '?'}
          </div>
        </div>
      </header>

      {/* Main Content Area - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Center Area - Video/Content Player */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {activeLesson ? (
            <>
              {/* Video/Content Player */}
              <div className="flex-1 flex flex-col bg-black relative">
                {activeLesson.tipo === 'video' && activeLesson.url ? (
                  <div className="flex-1 flex items-center justify-center">
                    <iframe
                      ref={iframeRef}
                      src={getEmbedUrl(activeLesson.url)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      frameBorder="0"
                      title={activeLesson.titulo}
                    />
                  </div>
                ) : activeLesson.tipo === 'pdf' && activeLesson.pdfUrl ? (
                  <div className="flex-1 flex items-center justify-center">
                    <iframe
                      src={activeLesson.pdfUrl}
                      className="w-full h-full"
                      title={activeLesson.titulo}
                    />
                  </div>
                ) : activeLesson.tipo === 'texto' && activeLesson.url ? (
                  <div className="flex-1 flex items-center justify-center">
                    <iframe
                      src={activeLesson.url}
                      className="w-full h-full"
                      title={activeLesson.titulo}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-white">
                    <div className="text-center">
                      <Video className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-400">Conteúdo não disponível</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Lesson Info and Actions */}
              <div className="bg-white border-t border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {activeLesson.titulo} {getCurrentLessonPosition() && `(${getCurrentLessonPosition()})`}
                    </h2>
                    {activeLesson.descricao && (
                      <p className="text-gray-600">{activeLesson.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        <span className="text-sm">0</span>
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {!isLessonComplete(activeLesson.id) && (
                    <Button
                      onClick={() => handleCompleteLesson(activeLesson.id)}
                      disabled={completingLesson === activeLesson.id}
                      className="bg-primary text-white"
                    >
                      {completingLesson === activeLesson.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Marcar como Concluída
                        </>
                      )}
                    </Button>
                  )}
                  
                  {activeLesson.pdfUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(activeLesson.pdfUrl, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={goToNextLesson}
                    disabled={getCurrentLessonIndex().lessonIndex === getModuleLessonsForModule(
                      modules[getCurrentLessonIndex().moduleIndex]?.id || ''
                    ).length - 1 && getCurrentLessonIndex().moduleIndex === modules.length - 1}
                  >
                    Próxima aula
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <Play className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Selecione uma aula para começar</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Course Curriculum */}
        {rightSidebarOpen && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Conteúdo do Curso</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRightSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {modules.map((module, moduleIndex) => {
                  const moduleLessons = getModuleLessonsForModule(module.id);
                  const completedModuleLessons = moduleLessons.filter(l => isLessonComplete(l.id)).length;
                  const moduleProgress = moduleLessons.length > 0
                    ? Math.round((completedModuleLessons / moduleLessons.length) * 100)
                    : 0;
                  const isOpen = openModules[module.id] || false;

                  return (
                    <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <Collapsible open={isOpen} onOpenChange={() => toggleModule(module.id)}>
                        <CollapsibleTrigger className="w-full p-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {moduleIndex + 1}. {module.titulo}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{moduleLessons.length} aulas</span>
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="p-2 space-y-1">
                            {moduleLessons.map((lesson) => {
                              const completed = isLessonComplete(lesson.id);
                              const isActive = activeLesson?.id === lesson.id;

                              return (
                                <button
                                  key={lesson.id}
                                  onClick={() => handleLessonClick(lesson)}
                                  className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors ${
                                    isActive
                                      ? 'bg-primary text-white'
                                      : completed
                                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                      : 'hover:bg-gray-50 text-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {completed ? (
                                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                    ) : (
                                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${
                                        isActive ? 'border-white' : 'border-gray-300'
                                      }`} />
                                    )}
                                    <span className="truncate text-left">{lesson.titulo}</span>
                                  </div>
                                  {lesson.duracaoEstimada && (
                                    <span className={`text-xs ml-2 flex-shrink-0 ${
                                      isActive ? 'text-white/80' : 'text-gray-500'
                                    }`}>
                                      {formatDuration(lesson.duracaoEstimada)}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Progress Summary */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progresso do Curso</span>
                  <span className="font-semibold text-primary">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-gray-500">
                  {completedLessons} de {totalLessons} aulas concluídas
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Right Sidebar Toggle (when closed) */}
        {!rightSidebarOpen && (
          <button
            onClick={() => setRightSidebarOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-800 text-white p-2 rounded-l-lg hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

      </div>
    </div>
  );
};

export default Page;
