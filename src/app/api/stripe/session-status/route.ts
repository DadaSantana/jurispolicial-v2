import stripe from "@/lib/stripe";


export async function POST(request: any) {
    try {
        const body = await request.json()
        const session = await stripe.checkout.sessions.retrieve(body.id);
       /*  const searchParams = request.nextUrl.searchParams
        const query = searchParams.get('query')
        const session = await stripe.checkout.sessions.retrieve(query); */

        return new Response(JSON.stringify({ status: session }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error }), { status: 500 });
    }
}
