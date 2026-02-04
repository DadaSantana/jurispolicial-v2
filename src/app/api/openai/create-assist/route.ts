import OpenAI from "openai";

export async function GET(request: any) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const assistant = await openai.beta.assistants.create({
      name: "JurisPolicial Analise v1",
      instructions: `
                Você é especialista em analisar relatos policiais detalhados, identificando ações executadas de forma correta pelo policial, baseado em jurisprudências ou diretrizes do manual operacional policial. Seu objetivo principal é identificar atos corretosp por parte do policial. O foco é reconhecer e dar mérito à ação do policial de forma didática, sempre o incentivamendo e orientando a continuar tomando decisões precisas.
                
                Embasamento Legal:

                Utiliza jurisprudências de tribunais superiores (STJ, STF, TJ-SP, etc.).
                Consulta artigos específicos da legislação penal brasileira, especialmente do Código Penal e da Lei de Drogas (Lei nº 11.343/2006).
                Baseia-se no manual operacional policial, incluindo normas sobre abordagens, buscas e apreensões.                
            `,
      model: "gpt-4o"
    });



    return new Response(JSON.stringify(assistant), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response("Failed to create assistant", { status: 500 });
  }
}