type InputItem =
    | { role: "system" | "user"; content: string }
    | {
        role: "system" | "user";
        content: Array<
            | { type: "input_text"; text: string }
            | { type: "input_image"; image_url: string }
        >;
    };

export function buildTextOnly(system: string, user: string): InputItem[] {
    return [
        { role: "system", content: system },
        { role: "user", content: user },
    ];
}

export function buildTextWithImages(system: string, userText: string, imageUrls: string[]): InputItem[] {
    const content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string }> = [
        { type: "input_text", text: userText },
    ];

    for (const url of imageUrls || []) {
        if (typeof url === "string" && url.startsWith("http")) {
            content.push({ type: "input_image", image_url: url });
        }
    }

    return [
        { role: "system", content: system },
        { role: "user", content },
    ];
}
