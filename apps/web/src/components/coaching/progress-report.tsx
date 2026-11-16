import type { ProgressReport as Report } from '@gymos/contracts';
import { Card, CardHeader } from '@/components/ui';
import { formatDisplayDate } from '@/lib/display-date';
import styles from './progress-report.module.css';

const metrics = [
  { key: 'weightKg', label: 'Weight', unit: 'kg' },
  { key: 'bmi', label: 'BMI', unit: '' },
  { key: 'bodyFatPct', label: 'Body fat', unit: '%' },
] as const;

export function ProgressReport({ report, path }: { report: Report; path: string }) {
  const start = Date.parse(report.from);
  const days = Math.max(1, (Date.parse(report.through) - start) / 86_400_000);
  return <Card>
    <CardHeader title="Progress report"/>
    <p><time dateTime={report.from}>{formatDisplayDate(report.from)}</time> to <time dateTime={report.through}>{formatDisplayDate(report.through)}</time> · {report.timeZone}</p>
    <p>{report.completedSessions} completed PT {report.completedSessions === 1 ? 'session' : 'sessions'} during this period.</p>
    <form action={path} method="get" className={styles.filters}>
      <label className="ui-field"><span>Report end date</span><input type="date" name="through" required defaultValue={report.through} max={report.today}/></label>
      <button className="ui-button ui-button-secondary" type="submit">Show report</button>
      {report.through !== report.today && <a className="platform-text-link" href={path}>Latest 90 days</a>}
    </form>
    {report.measurements.length ? <>
      <div className={styles.charts}>
        {metrics.map(({ key, label, unit }) => {
          const points = report.measurements.flatMap(row => row[key] === null ? [] : [{ date: row.measuredOn, value: Number(row[key]) }]);
          if (!points.length) return null;
          const minimum = Math.min(...points.map(point => point.value));
          const maximum = Math.max(...points.map(point => point.value));
          const range = maximum - minimum;
          return <section className={styles.chart} key={key} aria-label={`${label} trends`}>
            <h3>{label}{unit ? ` (${unit})` : ''}</h3>
            <div className={styles.plot} aria-hidden="true">{points.map(point => <span key={point.date} className={styles.point}
              style={{ left: `${4 + 92 * (Date.parse(point.date) - start) / (days * 86_400_000)}%`,
                bottom: `${range ? 10 + 80 * (point.value - minimum) / range : 50}%` }}/>)}</div>
            <div className={styles.chartScale}><small>Low {minimum}</small><small>High {maximum}</small></div>
          </section>;
        })}
      </div>
      <div className="ui-table-shell"><div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Measurement history">
        <table><caption>Measured values by date</caption>
          <thead><tr><th scope="col">Date</th><th scope="col">Weight (kg)</th><th scope="col">Height (cm)</th><th scope="col">BMI</th><th scope="col">Body fat (%)</th></tr></thead>
          <tbody>{[...report.measurements].reverse().map(row => <tr key={row.measuredOn}>
            <th scope="row"><time dateTime={row.measuredOn}>{formatDisplayDate(row.measuredOn)}</time></th>
            <td>{row.weightKg ?? '—'}</td><td>{row.heightCm ?? '—'}</td>
            <td>{row.bmi ?? '—'}</td><td>{row.bodyFatPct ?? '—'}</td>
          </tr>)}</tbody>
        </table>
      </div></div>
      <p className="ui-field-hint">BMI uses weight and height recorded on the same day.</p>
    </> : <p>No measurements recorded during this period.</p>}
  </Card>;
}
