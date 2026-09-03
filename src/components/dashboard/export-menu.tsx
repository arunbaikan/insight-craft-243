import { useState } from "react";
import { Download, FileImage, FileSpreadsheet, FileText, Loader2, Presentation, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportDashboard, type ExportContext, type ExportFormat } from "@/lib/export/dashboard-export";

const OPTIONS: { format: ExportFormat; label: string; hint: string; icon: typeof FileText }[] = [
  { format: "pdf", label: "PDF", hint: "Pixel-perfect print layout", icon: FileText },
  { format: "pptx", label: "PowerPoint (.pptx)", hint: "Cover slide + KPI table", icon: Presentation },
  { format: "gdoc", label: "Google Docs / Word (.doc)", hint: "Opens in Docs, Word or Pages", icon: FileText },
  { format: "xlsx", label: "Excel (.xlsx)", hint: "Values, series and metadata", icon: FileSpreadsheet },
  { format: "csv", label: "CSV", hint: "Flat KPI value list", icon: Table2 },
  { format: "png", label: "PNG image", hint: "Full-resolution snapshot", icon: FileImage },
];

export function DashboardExportMenu({ getContext }: { getContext: () => ExportContext | null }) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  async function run(format: ExportFormat) {
    const ctx = getContext();
    if (!ctx) {
      toast.error("Dashboard is still loading — try again in a moment.");
      return;
    }
    setBusy(format);
    const id = toast.loading(`Preparing ${format.toUpperCase()} export…`);
    try {
      await exportDashboard(format, ctx);
      toast.success(`${format.toUpperCase()} export ready`, { id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed", { id });
    } finally {
      setBusy(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy !== null}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Export dashboard</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.format} onSelect={() => void run(o.format)} className="gap-2">
            <o.icon className="size-4 text-muted-foreground" />
            <span className="flex flex-col">
              <span className="text-sm">{o.label}</span>
              <span className="text-xs text-muted-foreground">{o.hint}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
