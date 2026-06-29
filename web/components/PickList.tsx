import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// A labelled filter dropdown — the shared wrapper used by the reports + open-calls browsers.
export default function PickList({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-full sm:w-auto sm:min-w-[150px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
