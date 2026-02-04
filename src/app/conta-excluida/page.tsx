"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle2 className="w-16 h-16 text-green-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900">
          Conta Excluída com Sucesso
        </h1>
        
        <p className="text-gray-600">
          Sua conta e todos os dados associados foram permanentemente excluídos.
          Agradecemos por ter utilizado nossos serviços.
        </p>

        <Button
          onClick={() => router.push("/")}
          className="w-full"
        >
          Voltar para a página inicial
        </Button>
      </div>
    </div>
  );
}
