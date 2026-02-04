import OpenAI from "openai"
export const maxDuration = 60;

export async function POST(request: any, response: any) {
    try {
        const body = await request.json()
        const { data } = body


        const retorno: any[] = []
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

        const thread = await openai.beta.threads.create();

        const assistant = await openai.beta.assistants.retrieve(
            "asst_X9BfjjgEIIeMXg4xd1nSHL1g"
        );

        const message = await openai.beta.threads.messages.create(
            thread.id,
            {
                role: "user",
                content: data
            }
        );

        let run = await openai.beta.threads.runs.createAndPoll(
            thread.id,
            {
                assistant_id: assistant.id
            }
        );

        const runStatus = async () => {
            if (run.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(
                    run.thread_id
                );

                if (messages.data[0].content[0].type === 'text') {
                    retorno.push(messages.data[0].content[0].text);
                }

            }
        }

        await runStatus()

        return new Response(JSON.stringify({
            message: retorno[0].value
        }), {
            status: 200
        })
    } catch (error) {
        console.log(error)
        return new Response(`Error: ${error}`, {
            status: 400,
        })
    }
}