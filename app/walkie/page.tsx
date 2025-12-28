import WalkieTalkie from "./walkie-client";

export default function WalkiePage({
    searchParams,
}: {
    searchParams?: { room?: string; name?: string };
}) {
    const room = (searchParams?.room || "limsdoor-main").trim();
    const name = (searchParams?.name || "현장").trim();

    return (
        <div style={{ padding: 16 }}>
            <WalkieTalkie roomId={room} displayName={name} />
        </div>
    );
}
