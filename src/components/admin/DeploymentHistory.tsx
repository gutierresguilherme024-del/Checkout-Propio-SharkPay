import { useState, useEffect } from 'react'
import { Clock, Package, GitCommit, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface DeployVersion {
  version: string
  deployed_at: string
  summary: string
  commit_hash: string
  changed_files: string[]
  breaking_changes?: boolean
  type?: string
}

interface VersionHistory {
  versions: DeployVersion[]
}

export function DeploymentHistory() {
  const [currentVersion, setCurrentVersion] = useState<DeployVersion | null>(null)
  const [history, setHistory] = useState<DeployVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadVersionData()
  }, [])

  const loadVersionData = async () => {
    try {
      setLoading(true)
      setError(null)

      let versionLoaded = false
      let historyLoaded = false

      // Tentativa 1: Carregar versão atual do JSON
      try {
        const versionRes = await fetch('/version.json', { 
          cache: 'no-cache',
          headers: { 'Accept': 'application/json' }
        })
        if (versionRes.ok) {
          const contentType = versionRes.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            const versionData = await versionRes.json()
            setCurrentVersion(versionData)
            versionLoaded = true
          }
        }
      } catch (err) {
        console.warn('[DeploymentHistory] Versão atual não disponível:', err)
      }

      // Tentativa 2: Carregar histórico do JSON
      try {
        const historyRes = await fetch('/version-history.json', { 
          cache: 'no-cache',
          headers: { 'Accept': 'application/json' }
        })
        if (historyRes.ok) {
          const contentType = historyRes.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            const historyData: VersionHistory = await historyRes.json()
            if (historyData.versions && Array.isArray(historyData.versions)) {
              setHistory(historyData.versions.slice(0, 10))
              historyLoaded = true
            }
          }
        }
      } catch (err) {
        console.warn('[DeploymentHistory] Histórico JSON não disponível:', err)
      }

      // Fallback: Se nenhum dado foi carregado, definir versão padrão
      if (!versionLoaded && !historyLoaded) {
        console.info('[DeploymentHistory] Usando versão padrão (histórico em construção)')
        setCurrentVersion({
          version: '1.0.0',
          deployed_at: new Date().toISOString(),
          summary: 'Sistema de versionamento em ativação',
          commit_hash: 'pending',
          changed_files: []
        })
        setHistory([])
      }

    } catch (err) {
      console.error('[DeploymentHistory] Erro inesperado:', err)
      // Não definir erro - apenas deixar vazio com mensagem amigável
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const toggleVersion = (version: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(version)) {
        newSet.delete(version)
      } else {
        newSet.add(version)
      }
      return newSet
    })
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    } catch {
      return dateString
    }
  }

  const getTypeBadgeColor = (type?: string) => {
    switch (type) {
      case 'feat':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'fix':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'refactor':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'docs':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'chore':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'feat':
        return 'Nova Feature'
      case 'fix':
        return 'Correção'
      case 'refactor':
        return 'Refatoração'
      case 'docs':
        return 'Documentação'
      case 'chore':
        return 'Manutenção'
      default:
        return type || 'Atualização'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Histórico de Atualizações
          </CardTitle>
          <CardDescription>Carregando versões...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">Buscando histórico de deploys...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Histórico de Atualizações
        </CardTitle>
        <CardDescription>
          Versão atual: <strong className="text-foreground">{currentVersion?.version || 'Desconhecida'}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <div className="flex justify-center">
              <div className="rounded-full bg-muted p-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Histórico em construção</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                O sistema de versionamento automático está ativo. As próximas atualizações
                aparecerão aqui automaticamente após cada deploy.
              </p>
            </div>
          </div>
        ) : (
          history.map((deploy, index) => {
            const isExpanded = expandedVersions.has(deploy.version)
            const isCurrent = deploy.version === currentVersion?.version

            return (
              <Collapsible
                key={deploy.version}
                open={isExpanded}
                onOpenChange={() => toggleVersion(deploy.version)}
              >
                <div
                  className={`border rounded-lg p-3 transition-colors ${
                    isCurrent
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-card hover:bg-accent/50'
                  }`}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-0 h-auto hover:bg-transparent"
                    >
                      <div className="flex items-start gap-3 text-left flex-1">
                        <Package className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">
                              v{deploy.version}
                            </span>
                            {isCurrent && (
                              <Badge variant="default" className="text-xs">
                                Atual
                              </Badge>
                            )}
                            {deploy.type && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${getTypeBadgeColor(deploy.type)}`}
                              >
                                {getTypeLabel(deploy.type)}
                              </Badge>
                            )}
                            {deploy.breaking_changes && (
                              <Badge variant="destructive" className="text-xs">
                                Breaking Change
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {deploy.summary}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(deploy.deployed_at)}
                            </span>
                            {deploy.commit_hash && deploy.commit_hash !== 'initial' && (
                              <span className="flex items-center gap-1">
                                <GitCommit className="h-3 w-3" />
                                {deploy.commit_hash}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground ml-2" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-3 pt-3 border-t">
                    <div className="space-y-2 text-xs">
                      {deploy.changed_files && deploy.changed_files.length > 0 && (
                        <div>
                          <p className="font-semibold text-muted-foreground mb-1">
                            Arquivos alterados ({deploy.changed_files.length}):
                          </p>
                          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                            {deploy.changed_files.slice(0, 5).map((file, i) => (
                              <li key={i} className="truncate">
                                {file}
                              </li>
                            ))}
                            {deploy.changed_files.length > 5 && (
                              <li className="text-primary">
                                +{deploy.changed_files.length - 5} arquivos...
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })
        )}

        {history.length >= 10 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            Mostrando as últimas 10 versões
          </p>
        )}
      </CardContent>
    </Card>
  )
}
