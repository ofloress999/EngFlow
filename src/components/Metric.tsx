type MetricProps = {
  label: string;
  value: string;
};

export function Metric({ label, value }: MetricProps) {
  return (
    <div className="surface-soft rounded-xl p-3">
      <p className="subtle text-xs font-black uppercase">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}
