import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { AdvanceDecline } from '../../types/breadth';

interface Props {
  data: AdvanceDecline;
}

export function AdvanceDeclineCard({ data }: Props) {
  const chartData = [
    { name: 'Advances', value: data.advances, color: 'hsl(142 76% 36%)' },
    { name: 'Declines', value: data.declines, color: 'hsl(0 84% 60%)' },
    { name: 'Unchanged', value: data.unchanged, color: 'hsl(215 20% 50%)' },
  ];
  const pct = (n: number) => ((n / data.total) * 100).toFixed(1);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Advance / Decline
      </h2>
      <div className="flex items-center gap-6">
        <div className="h-36 w-36 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" stroke="none">
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} (${pct(value)}%)`, name]}
                contentStyle={{ background: 'hsl(222 84% 5%)', border: '1px solid hsl(217 33% 17%)', borderRadius: 8 }}
                labelStyle={{ color: 'hsl(210 40% 98%)' }}
                itemStyle={{ color: 'hsl(215 20% 65%)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3">
          {chartData.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                <span className="text-sm text-muted-foreground">{entry.name}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-medium tabular-nums" style={{ color: entry.color }}>
                  {entry.value.toLocaleString()}
                </span>
                <span className="ml-1 text-xs text-muted-foreground">({pct(entry.value)}%)</span>
              </div>
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between text-xs text-muted-foreground">
            <span>Total stocks</span>
            <span className="font-mono font-medium text-foreground">{data.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>A/D Ratio</span>
            <span className={`font-mono font-medium ${data.advanceDeclineRatio >= 1 ? 'text-[hsl(142_76%_36%)]' : 'text-destructive'}`}>
              {data.advanceDeclineRatio.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
