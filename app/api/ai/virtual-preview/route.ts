import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { image, options } = body;

        // Mock Processing Delay (3 seconds)
        await new Promise(resolve => setTimeout(resolve, 3000));

        // In a real scenario, this would call an AI generation service (e.g., Stable Diffusion, Midjourney API, or DALL-E)
        // For now, we return a mock response with a placeholder or the same image.

        // We'll just return the original image as the "preview" for the mock, 
        // effectively pretending we did something. 
        // In a real MVP, we might overlay a semi-transparent door PNG.

        return NextResponse.json({
            previewImages: {
                original: image,
                installedPreview: image, // In real app, this is the generated URL
                alternatives: []
            },
            description: `선택하신 ${options?.category || '중문'} (${options?.type || '기본'}) 가상 시공 결과입니다.`,
            customerGuide: "실제 시공 시 현장 여건에 따라 마감 디테일은 일부 달라질 수 있습니다."
        });

    } catch (error) {
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
