import OpenAI from "openai";
export const maxDuration = 60;

export async function POST(request: any) {
    const retorno: any[] = [];
    let status = '';
    let stringJson = '';

    try {
        const body = await request.json();
        const { data } = body;

        if (!data) {
            return new Response(JSON.stringify({ error: "Nenhum texto enviado." }), { status: 400 });
        }


        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const assistant = await openai.beta.assistants.retrieve('asst_TrDDW6hlCMBeYBHoo94XHCDG');
        const thread = await openai.beta.threads.create();

        const mensagem = await openai.beta.threads.messages.create(
            thread.id,
            {
                role: "user",
                content: [
                    { type: "text", text: JSON.stringify(data) }
                ],
            }
        );

        retorno.push(mensagem);

        const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
            assistant_id: assistant.id,
        });

        if (run.status === 'completed') {
            status = run.status;
            const messages = await openai.beta.threads.messages.list(run.thread_id);

            // **MANIPULAÇÃO DE RESPOSTAS:** Lida com diferentes tipos de conteúdo na resposta.
            // A resposta da IA pode conter texto, imagens, etc.
            for (const message of messages.data) {
                for (const contentItem of message.content) {
                    if (contentItem.type === 'text' && message.role === 'assistant') {
                        stringJson += contentItem.text.value;
                    } else if (contentItem.type === 'image_file') {
                        // Lida com imagens, se necessário.
                        console.log("Imagem recebida:", contentItem.image_file.file_id);
                    } // Adicione outros tipos conforme necessário.
                }
            }

        } else {
            status = run.status;
            console.error("Erro na execução:", run); // Log do erro para depuração
            return new Response(JSON.stringify({ error: `Erro na execução: ${run.status}` }), { status: 500 }); // Retorna o erro para o cliente
        }

        return new Response(JSON.stringify({ message: stringJson }), { status: 200 });
    } catch (error) {
        console.error("Erro na API:", error); // Log do erro para depuração
        return new Response(JSON.stringify({ error: error }), { status: 500 }); // Retorna o erro para o cliente
    }
}