import type { TableBlock as TableBlockT } from "@/types/blocks";

interface Props {
  payload: TableBlockT;
}

/**
 * Renders a table in a horizontally scrollable wrapper so long-row content
 * (common in benchmark tables) doesn't break the page width on mobile.
 */
export function TableBlock({ payload }: Props) {
  if (payload.rows.length === 0) return null;
  const [first, ...rest] = payload.rows;
  return (
    <div className="my-4 overflow-x-auto">
      <table>
        {payload.header ? (
          <thead>
            <tr>
              {first.map((cell, ci) => (
                <th key={ci}>{cell}</th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {(payload.header ? rest : payload.rows).map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
