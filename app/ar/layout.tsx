export default function ArLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{
            width: '100%',
            height: '100dvh',
            overflow: 'hidden',
            position: 'relative',
            background: '#000',
            color: '#fff',
            userSelect: 'none',
            touchAction: 'none'
        }}>
            {children}
        </div>
    );
}
