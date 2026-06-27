type Props = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: Props) {
  return (
    <section className="state-panel" aria-live="polite">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}
