import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface TermosAssinaturaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermosAssinatura({ open, onOpenChange }: TermosAssinaturaProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Termos de Cancelamento de Assinatura</DialogTitle>
          <DialogDescription>
            Política de cancelamento e reembolso
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 text-sm">
          <section>
            <h3 className="font-semibold mb-2">1. Direito de Arrependimento</h3>
            <p>De acordo com o Art. 49 do Código de Defesa do Consumidor (Lei nº 8.078/90), o assinante tem o direito de desistir da assinatura no prazo de 7 (sete) dias a contar da data de ativação, com direito ao reembolso integral do valor pago.</p>
          </section>

          <section>
            <h3 className="font-semibold mb-2">2. Cancelamento dentro do Período de 7 dias</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Reembolso integral do valor pago</li>
              <li>Cancelamento imediato da assinatura</li>
              <li>Retorno automático ao plano gratuito</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-2">3. Cancelamento após 7 dias</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Não haverá reembolso do valor pago</li>
              <li>O acesso aos recursos premium continuará até o final do período pago</li>
              <li>Não haverá renovação automática após o término do período</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-2">4. Base Legal</h3>
            <p>Esta política está em conformidade com o Código de Defesa do Consumidor brasileiro, especificamente:</p>
            <blockquote className="border-l-2 pl-4 my-2 italic">
              "Art. 49. O consumidor pode desistir do contrato, no prazo de 7 dias a contar de sua assinatura ou do ato de recebimento do produto ou serviço, sempre que a contratação de fornecimento de produtos e serviços ocorrer fora do estabelecimento comercial, especialmente por telefone ou a domicílio."
            </blockquote>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
