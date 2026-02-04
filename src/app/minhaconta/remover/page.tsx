"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RemoverConta() {
  const [email, setEmail] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (email !== confirmacao) {
      setErro("Os emails não correspondem");
      return;
    }

    try {
      // Aqui você implementará a lógica de exclusão
      const response = await fetch("/api/usuario/excluir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Falha ao excluir conta");
      }

      router.push("/conta-excluida");
    } catch (error) {
      setErro("Erro ao excluir conta. Por favor, tente novamente.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle size={24} />
          <h1 className="text-2xl font-bold">Excluir Conta</h1>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700 font-medium mb-2">Atenção!</p>
          <p className="text-red-600 text-sm">
            Esta ação é irreversível. Ao excluir sua conta:
          </p>
          <ul className="list-disc list-inside text-sm text-red-600 mt-2 space-y-1">
            <li>Todos os seus dados serão permanentemente apagados</li>
            <li>Você perderá acesso a todos os recursos</li>
            <li>Esta ação não pode ser desfeita</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Digite seu email para confirmar
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="confirmacao" className="block text-sm font-medium text-gray-700 mb-1">
              Digite seu email novamente
            </label>
            <Input
              id="confirmacao"
              type="email"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full"
            />
          </div>

          {erro && (
            <div className="text-red-600 text-sm">
              {erro}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              variant="destructive"
              className="w-full"
            >
              Excluir minha conta permanentemente
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}