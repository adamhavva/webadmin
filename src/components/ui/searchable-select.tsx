"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

export type SearchableOption = {
  value: string;
  label: string;
  sublabel?: string;
  unitCost?: number | null;
};

type SearchableSelectProps = {
  value: string;
  onChange: (value: string, option: SearchableOption | null) => void;
  fetcher: (
    query: string,
    signal: AbortSignal
  ) => Promise<SearchableOption[]>;
  initialOption?: SearchableOption | null;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  errorText?: string;
  disabled?: boolean;
  className?: string;
  debounceMs?: number;
};

// ============================================================
// Component
// ============================================================

export function SearchableSelect({
  value,
  onChange,
  fetcher,
  initialOption = null,
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  emptyText = "Tidak ditemukan",
  errorText = "Gagal memuat opsi",
  disabled,
  className,
  debounceMs = 300,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [options, setOptions] = React.useState<SearchableOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<SearchableOption | null>(
    initialOption
  );

  // Sinkronkan label dengan value + options + initialOption
  React.useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (initialOption && initialOption.value === value) {
      setSelected(initialOption);
      return;
    }
    const found = options.find((o) => o.value === value);
    if (found) setSelected(found);
  }, [value, options, initialOption]);

  // Fetch saat popover dibuka / query berubah
  React.useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await fetcher(query.trim(), controller.signal);
        setOptions(result);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : errorText);
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [open, query, debounceMs, fetcher, errorText]);

  function handleSelect(option: SearchableOption) {
    setSelected(option);
    onChange(option.value, option);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-full justify-between font-normal",
          !selected && "text-muted-foreground",
          className
        )}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>

      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />

          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Memuat...
              </div>
            ) : error ? (
              <div className="px-4 py-6 text-center text-sm text-destructive">
                {error}
              </div>
            ) : options.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => handleSelect(opt)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4 shrink-0",
                        selected?.value === opt.value
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}