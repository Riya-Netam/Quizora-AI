import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Average quiz score per day. Includes a hidden data table so screen-reader users get the same facts. */
export default function ScoreTrend({ data, title = "Average score by day" }) {
  const summary = data.length
    ? `${title}: ${data.map((d) => `${d.date}, ${d.average_score} percent`).join("; ")}.`
    : `${title}: no data.`;
  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <div role="img" aria-label={summary} className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#E8E6F0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#5E5A78" }} tickFormatter={(d) => d.slice(5)} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#5E5A78" }} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v) => [`${v}%`, "Average score"]} labelFormatter={(l) => `Date: ${l}`} />
            <Line type="monotone" dataKey="average_score" stroke="#5842D1" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th>Date</th><th>Average score (%)</th><th>Attempts</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.average_score}</td><td>{d.attempts}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
