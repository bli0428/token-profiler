import type { DashboardCaveat } from "../api/types";

type Props = {
  caveats: DashboardCaveat[];
};

export function CaveatList({ caveats }: Props) {
  if (caveats.length === 0) return null;
  return (
    <ul className="caveat-list" aria-label="Caveats">
      {caveats.map((caveat, index) => (
        <li className={`state state-${caveat.severity}`} key={`${caveat.code}-${index}-${caveat.message}`}>
          <strong>{caveat.code}</strong>
          <span>{caveat.message}</span>
        </li>
      ))}
    </ul>
  );
}
