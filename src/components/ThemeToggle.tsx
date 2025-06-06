import { Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const checked = theme === "dark";
  const toggle = () => setTheme(checked ? "light" : "dark");

  return (
    <button
      className="flex items-center space-x-2"
      onClick={toggle}
      aria-label="Toggle theme"
    >
      {checked ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <Switch checked={checked} onCheckedChange={toggle} />
    </button>
  );
}
