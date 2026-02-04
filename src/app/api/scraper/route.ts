export const maxDuration = 60

export async function POST(request: Request) {
    const puppeteer = require("puppeteer-core");
    const chromium = require("@sparticuz/chromium");

    try {
        const body = await request.json();
        const { term } = body;

        await chromium.font(
            "https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf"
        );


        const isLocal = !!process.env.NEXT_PUBLIC_CHROME_EXECUTABLE_PATH;

        const browser = await puppeteer.launch({
            args: isLocal ? puppeteer.defaultArgs() : [
                ...chromium.args,
                '--hide-scrollbars',
                '--incognito',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security', // Desabilita a segurança na web
                '--disable-features=IsolateOrigins,site-per-process' // Desabilita o isolamento de origem
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: process.env.NEXT_PUBLIC_CHROME_EXECUTABLE_PATH || await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(`https://www.jusbrasil.com.br/jurisprudencia/busca?q=${term}&o=data&tribunal=stf&tribunal=stj&tribunal=tj`, { waitUntil: 'domcontentloaded' });

        await page.waitForSelector('div[data-doc-artifact="JURISPRUDENCE"]', { timeout: maxDuration * 1000 });

        const data = await page.evaluate(() => {
            const reputationElements = document.querySelectorAll('div[data-doc-artifact="JURISPRUDENCE"] a[href]');
            let links: any = [];
            reputationElements.forEach((element) => {
                const description = element.textContent?.trim() || '';
                const href = element.getAttribute('href') || '';
                links.push({ description, href });
            });
            return { links };
        });

        const pageTitle = await page.title();

        await browser.close();

        return new Response(JSON.stringify({
            test: true,
            pageTitle,
            data
        }), {
            status: 200
        });
    } catch (error) {
        console.error("Error:", error);
        return new Response(`Error: ${error}`, {
            status: 400,
        });
    }
}
