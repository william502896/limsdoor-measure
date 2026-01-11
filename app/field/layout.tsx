import FieldLayoutClient from "./FieldLayoutClient";

export const metadata = {
    title: "FieldX - Field App",
};

export default function FieldLayout({ children }: { children: React.ReactNode }) {
    return <FieldLayoutClient>{children}</FieldLayoutClient>;
}
