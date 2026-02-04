'use client'
import React, { useEffect, useState } from 'react';
import { User } from '@/types/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  FileText, 
  File, 
  Package, 
  TrendingUp, 
  DollarSign, 
  Activity,
  CreditCard,
  UserCheck,
  UserX,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart3
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux/store';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  Timestamp, 
  where,
  startAt,
  endAt
} from 'firebase/firestore';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { isSubscriptionActive } from '@/services/subscriptionService';
// Função auxiliar para formatar datas em português
const formatDate = (date: Date, formatStr: string): string => {
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  
  if (formatStr === 'MMM') {
    return months[date.getMonth()];
  }
  
  if (formatStr.includes('dd') && formatStr.includes('MMMM') && formatStr.includes('yyyy')) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
  }
  
  if (formatStr.includes('dd') && formatStr.includes('MMM') && formatStr.includes('HH:mm')) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} de ${month} às ${hours}:${minutes}`;
  }
  
  return date.toLocaleDateString('pt-BR');
};

interface DashboardData {
  totalUsers: number;
  totalPosts: number;
  totalConteudos: number;
  totalProdutos: number;
  totalConsultas: number;
  activeSubscriptions: number;
  inactiveSubscriptions: number;
  trialSubscriptions: number;
  usersGrowth: {
    date: string;
    count: number;
  }[];
  planDistribution: {
    name: string;
    value: number;
    color: string;
  }[];
  monthlyRevenue: {
    month: string;
    revenue: number;
  }[];
  recentActivities: {
    type: string;
    description: string;
    timestamp: Timestamp;
    creatorName?: string;
  }[];
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  activeUsersPercentage: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Page = () => {
  const user: User = useSelector((state: RootState) => state.userSlice.user);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalUsers: 0,
    totalPosts: 0,
    totalConteudos: 0,
    totalProdutos: 0,
    totalConsultas: 0,
    activeSubscriptions: 0,
    inactiveSubscriptions: 0,
    trialSubscriptions: 0,
    usersGrowth: [],
    planDistribution: [],
    monthlyRevenue: [],
    recentActivities: [],
    newUsersThisMonth: 0,
    newUsersLastMonth: 0,
    activeUsersPercentage: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch total counts from each collection
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const postsSnapshot = await getDocs(collection(db, 'posts'));
        const conteudosSnapshot = await getDocs(collection(db, 'conteudos'));
        const produtosSnapshot = await getDocs(collection(db, 'produtos'));
        const consultasSnapshot = await getDocs(collection(db, 'consultas'));

        // Process users data
        const usersData: User[] = [];
        let activeSubs = 0;
        let inactiveSubs = 0;
        let trialSubs = 0;
        const planCounts: Record<string, number> = {};
        
        const now = new Date();
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        
        let newUsersThisMonth = 0;
        let newUsersLastMonth = 0;

        usersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          const userObj = {
            ...userData,
            dataCadastro: userData.dataCadastro instanceof Timestamp
              ? userData.dataCadastro.toDate()
              : userData.dataCadastro,
            ultimoLogin: userData.ultimoLogin instanceof Timestamp
              ? userData.ultimoLogin.toDate()
              : userData.ultimoLogin,
            plano: userData.plano ? {
              ...userData.plano,
              inicio: userData.plano.inicio instanceof Timestamp
                ? userData.plano.inicio.toDate()
                : userData.plano.inicio,
              termino: userData.plano.termino instanceof Timestamp
                ? userData.plano.termino.toDate()
                : userData.plano.termino,
            } : undefined
          } as User;

          usersData.push(userObj);

          // Count subscriptions
          if (userObj.plano) {
            const isActive = isSubscriptionActive(userObj);
            if (isActive) {
              activeSubs++;
              const planType = userObj.plano.tipo || 'gratuito';
              planCounts[planType] = (planCounts[planType] || 0) + 1;
            } else if (userObj.plano.status === 'trial') {
              trialSubs++;
            } else {
              inactiveSubs++;
            }
          } else {
            inactiveSubs++;
          }

          // Count new users
          const cadastroDate = userObj.dataCadastro instanceof Date 
            ? userObj.dataCadastro 
            : new Date(userObj.dataCadastro);
          
          if (cadastroDate >= firstDayThisMonth) {
            newUsersThisMonth++;
          } else if (cadastroDate >= firstDayLastMonth && cadastroDate <= lastDayLastMonth) {
            newUsersLastMonth++;
          }
        });

        // Calculate users growth over last 6 months
        const usersGrowth: { date: string; count: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          
          const count = usersData.filter(u => {
            const cadastroDate = u.dataCadastro instanceof Date 
              ? u.dataCadastro 
              : new Date(u.dataCadastro);
            return cadastroDate >= monthStart && cadastroDate <= monthEnd;
          }).length;

          usersGrowth.push({
            date: formatDate(monthStart, 'MMM'),
            count
          });
        }

        // Plan distribution
        const planDistribution = Object.entries(planCounts).map(([name, value], index) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: COLORS[index % COLORS.length]
        }));

        // Estimate monthly revenue (simplified - you can enhance this with actual payment data)
        const monthlyRevenue = usersGrowth.map((_, index) => {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
          const monthUsers = usersData.filter(u => {
            const cadastroDate = u.dataCadastro instanceof Date 
              ? u.dataCadastro 
              : new Date(u.dataCadastro);
            return cadastroDate.getMonth() === monthDate.getMonth() && 
                   cadastroDate.getFullYear() === monthDate.getFullYear();
          });
          
          // Estimate revenue based on active subscriptions
          const revenue = monthUsers.reduce((sum, u) => {
            if (u.plano && isSubscriptionActive(u)) {
              const planPrices: Record<string, number> = {
                mensal: 97,
                trimestral: 270,
                semestral: 540,
                anual: 970
              };
              return sum + (planPrices[u.plano.tipo] || 0);
            }
            return sum;
          }, 0);

          return {
            month: formatDate(monthDate, 'MMM'),
            revenue: Math.round(revenue)
          };
        });

        // Get recent activities
        const recentPosts = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(3)));
        const recentConteudos = await getDocs(query(collection(db, 'conteudos'), orderBy('createdAt', 'desc'), limit(3)));
        const recentConsultas = await getDocs(query(collection(db, 'consultas'), orderBy('createdAt', 'desc'), limit(3)));
        const recentUsers = await getDocs(query(collection(db, 'users'), orderBy('dataCadastro', 'desc'), limit(3)));

        // Get all users for creator information
        const usersMap = new Map();
        usersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          usersMap.set(doc.id, userData.nome);
        });

        const activities = [
          ...recentPosts.docs.map(doc => {
            const data = doc.data();
            return {
              type: 'post',
              description: `Novo post: ${data.title}`,
              timestamp: data.createdAt,
              creatorName: usersMap.get(data.createdBy) || 'Usuário desconhecido'
            };
          }),
          ...recentConteudos.docs.map(doc => {
            const data = doc.data();
            return {
              type: 'conteudo',
              description: `Novo conteúdo: ${data.title}`,
              timestamp: data.createdAt,
              creatorName: usersMap.get(data.createdBy) || 'Usuário desconhecido'
            };
          }),
          ...recentConsultas.docs.map(doc => {
            const data = doc.data();
            return {
              type: 'consulta',
              description: `Nova consulta: ${data.title || 'Sem título'}`,
              timestamp: data.createdAt,
              creatorName: usersMap.get(data.createdBy) || 'Usuário desconhecido'
            };
          }),
          ...recentUsers.docs.map(doc => {
            const data = doc.data();
            return {
              type: 'usuario',
              description: `Novo usuário cadastrado: ${data.nome}`,
              timestamp: data.dataCadastro,
              creatorName: data.nome
            };
          })
        ].sort((a, b) => {
          const aTime = a.timestamp instanceof Timestamp ? a.timestamp.seconds : 0;
          const bTime = b.timestamp instanceof Timestamp ? b.timestamp.seconds : 0;
          return bTime - aTime;
        }).slice(0, 5);

        const totalUsersCount = usersSnapshot.size;
        const activeUsersPercentage = totalUsersCount > 0 
          ? Math.round((activeSubs / totalUsersCount) * 100)
          : 0;

        setDashboardData({
          totalUsers: totalUsersCount,
          totalPosts: postsSnapshot.size,
          totalConteudos: conteudosSnapshot.size,
          totalProdutos: produtosSnapshot.size,
          totalConsultas: consultasSnapshot.size,
          activeSubscriptions: activeSubs,
          inactiveSubscriptions: inactiveSubs,
          trialSubscriptions: trialSubs,
          usersGrowth,
          planDistribution,
          monthlyRevenue,
          recentActivities: activities,
          newUsersThisMonth,
          newUsersLastMonth,
          activeUsersPercentage
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando dados do dashboard...</p>
        </div>
      </div>
    );
  }

  const usersGrowthPercent = dashboardData.newUsersLastMonth > 0
    ? Math.round(((dashboardData.newUsersThisMonth - dashboardData.newUsersLastMonth) / dashboardData.newUsersLastMonth) * 100)
    : dashboardData.newUsersThisMonth > 0 ? 100 : 0;

  const estimatedRevenue = dashboardData.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Administrativo</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do sistema e métricas importantes
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(new Date(), "dd 'de' MMMM 'de' yyyy")}</span>
        </div>
      </div>
      
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Usuários
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData.totalUsers}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              {usersGrowthPercent >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              )}
              <span className={usersGrowthPercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(usersGrowthPercent)}% vs mês anterior
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboardData.newUsersThisMonth} novos este mês
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assinaturas Ativas
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData.activeSubscriptions}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-secondary rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${dashboardData.activeUsersPercentage}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {dashboardData.activeUsersPercentage}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboardData.trialSubscriptions} em trial
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Estimada
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              R$ {estimatedRevenue.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Últimos 6 meses
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conteúdos Publicados
            </CardTitle>
            <File className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboardData.totalConteudos}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {dashboardData.totalPosts} posts • {dashboardData.totalProdutos} produtos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Crescimento de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Crescimento de Usuários
            </CardTitle>
            <CardDescription>
              Novos usuários cadastrados nos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Usuários",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <LineChart data={dashboardData.usersGrowth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Distribuição de Planos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Distribuição de Planos
            </CardTitle>
            <CardDescription>
              Assinantes por tipo de plano
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.planDistribution.length > 0 ? (
              <ChartContainer
                config={dashboardData.planDistribution.reduce((acc, plan) => {
                  acc[plan.name] = {
                    label: plan.name,
                    color: plan.color,
                  };
                  return acc;
                }, {} as Record<string, { label: string; color: string }>)}
                className="h-[300px]"
              >
                <PieChart>
                  <Pie
                    data={dashboardData.planDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dashboardData.planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>Nenhum dado de plano disponível</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Receita e Status de Assinaturas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Receita Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Receita Mensal Estimada
            </CardTitle>
            <CardDescription>
              Receita estimada dos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Receita",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <BarChart data={dashboardData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--chart-2))"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status de Assinaturas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Status de Assinaturas
            </CardTitle>
            <CardDescription>
              Visão geral das assinaturas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">Ativas</span>
                  </div>
                  <span className="text-sm font-bold">{dashboardData.activeSubscriptions}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all" 
                    style={{ 
                      width: `${dashboardData.totalUsers > 0 
                        ? (dashboardData.activeSubscriptions / dashboardData.totalUsers) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="text-sm font-medium">Trial</span>
                  </div>
                  <span className="text-sm font-bold">{dashboardData.trialSubscriptions}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all" 
                    style={{ 
                      width: `${dashboardData.totalUsers > 0 
                        ? (dashboardData.trialSubscriptions / dashboardData.totalUsers) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-sm font-medium">Inativas</span>
                  </div>
                  <span className="text-sm font-bold">{dashboardData.inactiveSubscriptions}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all" 
                    style={{ 
                      width: `${dashboardData.totalUsers > 0 
                        ? (dashboardData.inactiveSubscriptions / dashboardData.totalUsers) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total de Usuários</span>
                  <span className="text-lg font-bold">{dashboardData.totalUsers}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Atividades Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Atividades Recentes
          </CardTitle>
          <CardDescription>
            Últimas ações no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.recentActivities.length > 0 ? (
              dashboardData.recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'post' ? 'bg-green-500' :
                    activity.type === 'conteudo' ? 'bg-blue-500' :
                    activity.type === 'usuario' ? 'bg-purple-500' :
                    'bg-orange-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.type !== 'usuario' && `Por ${activity.creatorName} • `}
                      {activity.timestamp instanceof Timestamp
                        ? formatDate(activity.timestamp.toDate(), "dd 'de' MMM 'às' HH:mm")
                        : formatDate(new Date(activity.timestamp), "dd 'de' MMM 'às' HH:mm")
                      }
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma atividade recente
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Page;
