import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { fontSize: 12, fill: "#5E5A78" };

function Frame({ title, summary, children, table }) {
  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <div role="img" aria-label={summary} className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
      {table}
    </figure>
  );
}

export function CorrectIncorrectChart({ data }) {
  const title = "Correct and incorrect answers by day";
  return (
    <Frame title={title} summary={`${title}: ${data.map((d) => `${d.date} ${d.correct} correct, ${d.incorrect} incorrect`).join("; ")}.`}
      table={<table className="sr-only"><caption>{title}</caption><thead><tr><th>Date</th><th>Correct</th><th>Incorrect</th></tr></thead><tbody>{data.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.correct}</td><td>{d.incorrect}</td></tr>)}</tbody></table>}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="#E8E6F0" vertical={false} />
        <XAxis dataKey="date" tick={axis} tickFormatter={(d) => d.slice(5)} />
        <YAxis allowDecimals={false} tick={axis} />
        <Tooltip /><Legend />
        <Bar dataKey="correct" name="Correct" stackId="a" fill="#5842D1" isAnimationActive={false} />
        <Bar dataKey="incorrect" name="Incorrect" stackId="a" fill="#F59E8B" isAnimationActive={false} />
      </BarChart>
    </Frame>
  );
}

export function ReviewsChart({ data }) {
  const title = "Flashcards reviewed by day";
  return (
    <Frame title={title} summary={`${title}: ${data.map((d) => `${d.date} ${d.reviews}`).join("; ")}.`}
      table={<table className="sr-only"><caption>{title}</caption><thead><tr><th>Date</th><th>Reviews</th></tr></thead><tbody>{data.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.reviews}</td></tr>)}</tbody></table>}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="#E8E6F0" vertical={false} />
        <XAxis dataKey="date" tick={axis} tickFormatter={(d) => d.slice(5)} />
        <YAxis allowDecimals={false} tick={axis} />
        <Tooltip />
        <Bar dataKey="reviews" name="Cards reviewed" fill="#8F7CF5" isAnimationActive={false} />
      </BarChart>
    </Frame>
  );
}

/** Generic two-series-per-day chart for the admin overview. */
export function DailyBars({ data, bars, title }) {
  return (
    <Frame title={title} summary={`${title}: ${data.map((d) => `${d.date} ${bars.map((b) => `${b.label} ${d[b.key]}`).join(", ")}`).join("; ")}.`}
      table={<table className="sr-only"><caption>{title}</caption><thead><tr><th>Date</th>{bars.map((b) => <th key={b.key}>{b.label}</th>)}</tr></thead><tbody>{data.map((d) => <tr key={d.date}><td>{d.date}</td>{bars.map((b) => <td key={b.key}>{d[b.key]}</td>)}</tr>)}</tbody></table>}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="#E8E6F0" vertical={false} />
        <XAxis dataKey="date" tick={axis} tickFormatter={(d) => d.slice(5)} />
        <YAxis allowDecimals={false} tick={axis} />
        <Tooltip />{bars.length > 1 && <Legend />}
        {bars.map((b) => <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.color} isAnimationActive={false} />)}
      </BarChart>
    </Frame>
  );
}
