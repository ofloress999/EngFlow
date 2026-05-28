type StatProps = {
  title: string;
  value: string;
  detail?: string;
};

export function Stat({ title, value, detail }: StatProps) {
  return (
    <div className="panel-flat rounded-2xl p-4">
      <p className="muted text-sm font-semibold">{title}</p>
      <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
      {detail && <p className="subtle mt-1 text-xs font-semibold">{detail}</p>}
    </div>
  );
}
