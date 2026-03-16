import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

export function ExploreDatePicker({
  selectedDate,
  onSelect,
  onActivate,
  availableDateKeys,
  active,
  emptyLabel = "Pick a date",
}: {
  selectedDate?: Date;
  onSelect: (date?: Date) => void;
  onActivate?: () => void;
  availableDateKeys: Set<string>;
  active: boolean;
  emptyLabel?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={onActivate}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            active
              ? "border-fuchsia-300 bg-gradient-to-r from-pink-500 to-violet-500 text-white"
              : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20 hover:text-white"
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {selectedDate ? format(selectedDate, "EEE, MMM d") : emptyLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto rounded-2xl border-white/10 bg-zinc-950/95 p-0 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          disabled={(date) => !availableDateKeys.has(format(date, "yyyy-MM-dd"))}
          onSelect={onSelect}
          className="text-white"
          classNames={{
            day_selected:
              "bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:bg-pink-500 focus:bg-pink-500",
            day_today: "bg-white/10 text-white",
            nav_button:
              "size-7 bg-white/5 border border-white/10 p-0 opacity-100 hover:bg-white/10",
            head_cell: "w-8 text-[0.7rem] uppercase tracking-[0.18em] text-zinc-500",
            caption_label: "text-sm font-semibold text-white",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
