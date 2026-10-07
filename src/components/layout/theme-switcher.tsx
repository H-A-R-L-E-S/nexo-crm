"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;
const options = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(subscribe, onClient, onServer);
  const current = hydrated ? options.find((option) => option.value === theme) : undefined;
  const Icon = current?.icon ?? Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={!hydrated} aria-label={`Cambiar tema${current ? `: ${current.label}` : ""}`} className="header-control">
          <Icon className="size-[18px]" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-48 p-1.5">
        <DropdownMenuLabel className="px-2 py-2">Apariencia</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={hydrated ? theme : undefined} onValueChange={setTheme} aria-label="Tema de la aplicación">
          {options.map(({ value, label, icon: OptionIcon }) => (
            <DropdownMenuRadioItem key={value} value={value} className="min-h-9 gap-2.5 px-2">
              <OptionIcon className="size-4" aria-hidden="true" />{label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
