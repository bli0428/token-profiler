type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorState({ title, message, actionLabel = "Retry", onAction }: Props) {
  return (
    <section className="state-panel state-panel-error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {onAction ? (
        <button className="primary-button" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
