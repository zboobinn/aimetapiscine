export interface SpecRow {
  label: string;
  value: string;
}

export interface SpecTableProps {
  rows: SpecRow[];
  caption?: string;
}

/** Filets 1px --coping, mono sur les valeurs, sans-serif sur les libellés. */
export function SpecTable({ rows, caption }: SpecTableProps) {
  return (
    <table className="w-full border-collapse" style={{ color: "var(--ink)" }}>
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b" style={{ borderColor: "var(--coping)" }}>
            <th
              scope="row"
              className="py-2 pr-4 text-left font-normal"
              style={{ color: "var(--ink-60)" }}
            >
              {row.label}
            </th>
            <td className="py-2 text-right font-mono tabular-nums">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
