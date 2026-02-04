'use client'
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Loader2, MessageCircle, CheckCircle, XCircle, Eye, EyeOff, Save, TestTube, Trash2, QrCode, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { zapiService, type ZApiConfig, type ZApiStatus, type ZApiQRCodeResponse } from '@/services/zapiService';

const WhatsAppConfigPage = () => {
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [loadingQRCode, setLoadingQRCode] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [status, setStatus] = useState<ZApiStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [config, setConfig] = useState<ZApiConfig>({
    instance: '',
    token: '',
    clientToken: ''
  });
  const [isConfigured, setIsConfigured] = useState(false);

  // Carregar configurações existentes
  useEffect(() => {
    const loadExistingConfig = async () => {
      try {
        setLoading(true);
        const existingConfig = await zapiService.loadConfig();
        
        if (existingConfig) {
          setConfig(existingConfig);
          setIsConfigured(true);
          
          // Carregar status da conexão
          await checkConnectionStatus();
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExistingConfig();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setCheckingStatus(true);
      const connectionStatus = await zapiService.getStatus();
      setStatus(connectionStatus);
      
      // Capturar informações de debug
      setDebugInfo({
        timestamp: new Date().toISOString(),
        status: connectionStatus,
        baseUrl: `https://api.z-api.io/instances/${config.instance}/token/${config.token}`,
        hasConfig: !!config.instance && !!config.token && !!config.clientToken
      });
      
      // Se instância ativa mas smartphone não conectado, carregar QR Code automaticamente
      if (connectionStatus.connected && !connectionStatus.smartphoneConnected) {
        console.log('🔄 Instância ativa mas smartphone desconectado. Carregando QR Code...');
        await loadQRCode();
      }
    } catch (error) {
      console.log('Erro ao verificar status:', error);
      setDebugInfo({
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        baseUrl: `https://api.z-api.io/instances/${config.instance}/token/${config.token}`,
        hasConfig: !!config.instance && !!config.token && !!config.clientToken
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const loadQRCode = async () => {
    try {
      setLoadingQRCode(true);
      const qrResponse = await zapiService.getQRCode();
      
      if (qrResponse.qrcode) {
        setQrCode(qrResponse.qrcode);
      } else if (qrResponse.error) {
        toast({
          title: 'Erro ao carregar QR Code',
          description: qrResponse.error,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao carregar QR Code',
        description: 'Não foi possível carregar o QR Code.',
        variant: 'destructive'
      });
    } finally {
      setLoadingQRCode(false);
    }
  };

  const handleRefreshQRCode = async () => {
    setQrCode(null);
    await loadQRCode();
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      
      if (!config.instance || !config.token || !config.clientToken) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Todos os campos devem ser preenchidos.',
          variant: 'destructive'
        });
        return;
      }

      await zapiService.saveConfig(config);
      setIsConfigured(true);
      
      toast({
        title: 'Configurações salvas',
        description: 'As configurações do Z-API foram salvas com sucesso.'
      });

      // Verificar status após salvar
      await checkConnectionStatus();
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      
      if (!config.instance || !config.token || !config.clientToken) {
        toast({
          title: 'Configuração incompleta',
          description: 'Preencha todos os campos antes de testar.',
          variant: 'destructive'
        });
        return;
      }

      const result = await zapiService.testConnection(config);
      
      if (result.success) {
        toast({
          title: 'Conexão bem-sucedida',
          description: 'A conexão com o Z-API foi estabelecida com sucesso.'
        });
        
        // Verificar status após teste
        await checkConnectionStatus();
      } else {
        toast({
          title: 'Falha na conexão',
          description: result.error || 'Não foi possível conectar com o Z-API.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro no teste',
        description: 'Erro ao testar a conexão.',
        variant: 'destructive'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleClearConfig = async () => {
    try {
      setLoading(true);
      await zapiService.clearConfig();
      
      setConfig({
        instance: '',
        token: '',
        clientToken: ''
      });
      setIsConfigured(false);
      setStatus(null);
      setQrCode(null);
      setDebugInfo(null);
      
      toast({
        title: 'Configurações removidas',
        description: 'As configurações do Z-API foram removidas com sucesso.'
      });
    } catch (error) {
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover as configurações.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!status) return 'secondary';
    if (status.connected && status.smartphoneConnected) return 'default';
    if (status.connected) return 'default';
    return 'destructive';
  };

  const getStatusText = () => {
    if (!status) return 'Não configurado';
    if (status.connected && status.smartphoneConnected) return 'Conectado';
    if (status.connected) return 'Instância ativa';
    return 'Desconectado';
  };

  const getStatusIcon = () => {
    if (!status) return <XCircle className="h-4 w-4" />;
    if (status.connected && status.smartphoneConnected) return <CheckCircle className="h-4 w-4" />;
    if (status.connected) return <CheckCircle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  const shouldShowQRCode = () => {
    return isConfigured && status && status.connected && !status.smartphoneConnected;
  };

  if (loading && !isConfigured) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações do WhatsApp</h1>
        <p className="text-muted-foreground">
          Configure a integração com Z-API para automatizar o atendimento via WhatsApp.
        </p>
      </div>

      {/* Status da Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Status da Conexão
            <Button
              variant="outline"
              size="sm"
              onClick={checkConnectionStatus}
              disabled={checkingStatus || !isConfigured}
            >
              {checkingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Verificar Status
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <Badge variant={getStatusColor()}>
              {getStatusText()}
            </Badge>
            {status?.error && (
              <span className="text-sm text-muted-foreground">
                - {status.error}
              </span>
            )}
          </div>
          
          {status && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Instância:</span>
                <Badge variant={status.connected ? 'default' : 'destructive'}>
                  {status.connected ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Smartphone:</span>
                <Badge variant={status.smartphoneConnected ? 'default' : 'destructive'}>
                  {status.smartphoneConnected ? 'Conectado' : 'Desconectado'}
                </Badge>
              </div>
            </div>
          )}

          {/* Instância Inativa - Dicas de Solução */}
          {status && !status.connected && isConfigured && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Instância Inativa - Possíveis soluções:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Verifique se as credenciais estão corretas</li>
                  <li>• Confirme se a instância está ativa no painel Z-API</li>
                  <li>• Aguarde alguns minutos e tente novamente</li>
                  <li>• Verifique se sua conta Z-API não está suspensa</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Debug Info */}
          {debugInfo && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
              >
                <Info className="h-4 w-4 mr-2" />
                {showDebugInfo ? 'Ocultar' : 'Mostrar'} Informações de Debug
              </Button>
              
              {showDebugInfo && (
                <div className="mt-2 p-3 bg-gray-100 rounded-md text-xs">
                  <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code para Conexão */}
      {shouldShowQRCode() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Conectar Smartphone
            </CardTitle>
            <CardDescription>
              Escaneie o QR Code abaixo com seu WhatsApp para conectar o smartphone à instância.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              {loadingQRCode ? (
                <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : qrCode ? (
                <div className="relative">
                  <img 
                    src={qrCode} 
                    alt="QR Code para conectar WhatsApp" 
                    className="w-64 h-64 border rounded-lg shadow-md"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg space-y-2">
                  <QrCode className="h-12 w-12 text-gray-400" />
                  <p className="text-sm text-gray-500">QR Code não disponível</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={loadQRCode} 
                  disabled={loadingQRCode}
                  variant="outline"
                >
                  {loadingQRCode ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <QrCode className="h-4 w-4 mr-2" />
                  )}
                  Gerar QR Code
                </Button>
                
                {qrCode && (
                  <Button 
                    onClick={handleRefreshQRCode} 
                    disabled={loadingQRCode}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                )}
              </div>
              
              <Alert>
                <AlertDescription>
                  📱 Abra o WhatsApp → Menu (três pontos) → Dispositivos conectados → Conectar um dispositivo → Escaneie este QR Code
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configurações Z-API */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Z-API</CardTitle>
          <CardDescription>
            Configure as chaves de acesso para a integração com Z-API. Os dados são armazenados de forma criptografada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              🔒 Seus dados são criptografados antes de serem salvos no banco de dados para máxima segurança.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="instance">Instance ID</Label>
              <Input
                id="instance"
                placeholder="Ex: 3C12345D..."
                value={config.instance}
                onChange={(e) => setConfig({ ...config, instance: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Encontre no painel Z-API → Instâncias → ID da sua instância
              </p>
            </div>

            <div>
              <Label htmlFor="token">Token</Label>
              <div className="relative">
                <Input
                  id="token"
                  type={showTokens ? 'text' : 'password'}
                  placeholder="Ex: A12B34C56D..."
                  value={config.token}
                  onChange={(e) => setConfig({ ...config, token: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowTokens(!showTokens)}
                >
                  {showTokens ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {isConfigured && config.token && (
                <p className="text-xs text-muted-foreground mt-1">
                  Token mascarado: {zapiService.getMaskedToken()}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Encontre no painel Z-API → Instâncias → Token da sua instância
              </p>
            </div>

            <div>
              <Label htmlFor="clientToken">Client Token</Label>
              <div className="relative">
                <Input
                  id="clientToken"
                  type={showTokens ? 'text' : 'password'}
                  placeholder="Ex: F78G90H12I..."
                  value={config.clientToken}
                  onChange={(e) => setConfig({ ...config, clientToken: e.target.value })}
                />
              </div>
              {isConfigured && config.clientToken && (
                <p className="text-xs text-muted-foreground mt-1">
                  Client Token mascarado: {zapiService.getMaskedClientToken()}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Encontre no painel Z-API → Instâncias → Client Token da sua instância
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSaveConfig} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Configurações
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleTestConnection} 
              disabled={testingConnection || !config.instance || !config.token || !config.clientToken}
            >
              {testingConnection ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TestTube className="h-4 w-4 mr-2" />}
              Testar Conexão
            </Button>
            
            {isConfigured && (
              <Button variant="destructive" onClick={handleClearConfig} disabled={loading}>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações sobre Z-API */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre Z-API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            O Z-API é uma plataforma que permite integrar o WhatsApp Business com sistemas externos. 
            Para obter suas credenciais:
          </p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Acesse o painel Z-API (dashboard.z-api.io)</li>
            <li>Crie uma nova instância ou use uma existente</li>
            <li>Copie o Instance ID, Token e Client Token</li>
            <li>Cole as informações nos campos acima</li>
            <li>Certifique-se de que a instância está ativa no painel</li>
          </ol>
          <p className="text-sm text-muted-foreground">
            ⚠️ Mantenha suas credenciais seguras e não as compartilhe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppConfigPage; 