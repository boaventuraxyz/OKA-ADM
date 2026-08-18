import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando painel">
      <Skeleton height="7rem" />
      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", marginTop: "1.25rem" }}>
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton height="8rem" key={index} />
        ))}
      </div>
    </div>
  );
}
