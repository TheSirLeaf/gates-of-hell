import { NumInput } from './NumInput';

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

/** Controle com − / + e digitação direta. */
export function Stepper({ value, onChange, min = 0, max = 999, label, size = 'md' }: Props) {
  return (
    <div className={`stepper stepper--${size}`}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Diminuir ${label}`} disabled={value <= min}>
        −
      </button>
      <NumInput label={label} value={value} min={min} max={max} onChange={onChange} className="stepper__input" />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Aumentar ${label}`} disabled={value >= max}>
        +
      </button>
    </div>
  );
}
