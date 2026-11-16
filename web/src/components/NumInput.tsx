interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  label: string;
}

export function NumInput({ value, onChange, min = 0, max = 999, disabled, className = '', label }: Props) {
  return (
    <input
      className={`input input--num ${className}`}
      type="number"
      inputMode="numeric"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        onChange(Number.isNaN(n) ? min : Math.min(max, Math.max(min, n)));
      }}
    />
  );
}
