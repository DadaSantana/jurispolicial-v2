import stripe from "@/lib/stripe";


export async function POST(request: any) {
    try {
        const body = await request.json()
        /* const searchParams = request.nextUrl.searchParams
        const id = searchParams.get('query') */
        const subscription = await stripe.subscriptions.retrieve(body.subscription as string);

        return new Response(JSON.stringify({ status: subscription }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error }), { status: 500 });
    }
}
