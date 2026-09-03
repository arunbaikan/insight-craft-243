// Client-side dashboard exporters. Every heavy library is imported lazily so
// the viewer bundle (and SSR) stays untouched until the user exports.
import type { WidgetPayload, WidgetRecord } from "@/lib/dashboards.functions";
import type { MetricResult } from "@/lib/metrics/types";
import { convertFromBase, getCurrency } from "@/lib/currency";
import { formatMetric } from "@/lib/format";

export type ExportFormat = "pdf" | "pptx" | "xlsx" | "csv" | "gdoc" | "png";

export type ExportContext = {
  element: HTMLElement;
  dashboardName: string;
  description?: string | null;
  periodLabel: string;
  widgets: WidgetRecord[];
  data: Record<string, WidgetPayload>;
};

function safeName(name: string) {
  return name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "dashboard";
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Capture the live dashboard DOM at high resolution. html-to-image renders
 * through an SVG foreignObject, so modern CSS (oklch colours, CSS variables,
 * gradients) survives exactly as rendered on screen.
 */
async function capturePng(element: HTMLElement): Promise<{ dataUrl: string; width: number; height: number }> {
  const { toPng } = await import("html-to-image");
  const rect = element.getBoundingClientRect();
  const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: bg,
    cacheBust: true,
    width: Math.ceil(rect.width),
    height: Math.ceil(element.scrollHeight),
    style: { transform: "none" },
    filter: (node) =>
      !(node instanceof HTMLElement && node.dataset["exportIgnore"] === "true"),
  });
  return { dataUrl, width: Math.ceil(rect.width), height: Math.ceil(element.scrollHeight) };
}

type Row = {
  widget: string;
  metric: string;
  value: string;
  raw: number | null;
  currency: string | null;
  previous: number | null;
  deltaPct: number | null;
  target: number | null;
  status: string;
};

function numeric(result: MetricResult): number | null {
  if (result.value === null || !Number.isFinite(result.value)) return null;
  return result.value_type === "currency" ? convertFromBase(result.value) : result.value;
}

function tableRows(ctx: ExportContext): Row[] {
  const code = getCurrency().code;
  const rows: Row[] = [];
  for (const widget of ctx.widgets) {
    const payload = ctx.data[widget.id];
    const title = widget.title ?? widget.widget_type;
    if (!payload || payload.status === "error") {
      rows.push({
        widget: title,
        metric: widget.metric_binding?.series?.[0]?.metric_key ?? "—",
        value: "—",
        raw: null,
        currency: null,
        previous: null,
        deltaPct: null,
        target: null,
        status: payload?.error ?? "no data",
      });
      continue;
    }
    for (const result of payload.series) {
      if (!result) continue;
      rows.push({
        widget: title,
        metric: result.name || result.key,
        value: formatMetric(result),
        raw: numeric(result),
        currency: result.value_type === "currency" ? code : null,
        previous: result.previous ?? null,
        deltaPct: result.delta_pct ?? null,
        target: result.target_value ?? null,
        status: "ok",
      });
    }
  }
  return rows;
}

function seriesRows(ctx: ExportContext) {
  const rows: { widget: string; metric: string; point: string; value: number }[] = [];
  for (const widget of ctx.widgets) {
    const payload = ctx.data[widget.id];
    if (!payload || payload.status !== "ok") continue;
    for (const result of payload.series) {
      if (!result) continue;
      const points = result.series.length ? result.series : result.breakdown;
      for (const p of points) {
        rows.push({
          widget: widget.title ?? widget.widget_type,
          metric: result.name || result.key,
          point: p.label,
          value: result.value_type === "currency" ? convertFromBase(p.value) : p.value,
        });
      }
    }
  }
  return rows;
}

export async function exportDashboard(format: ExportFormat, ctx: ExportContext) {
  const base = `${safeName(ctx.dashboardName)}-${safeName(ctx.periodLabel)}`;
  switch (format) {
    case "png":
      return exportPng(ctx, base);
    case "pdf":
      return exportPdf(ctx, base);
    case "pptx":
      return exportPptx(ctx, base);
    case "xlsx":
      return exportXlsx(ctx, base);
    case "csv":
      return exportCsv(ctx, base);
    case "gdoc":
      return exportDoc(ctx, base);
  }
}

async function exportPng(ctx: ExportContext, base: string) {
  const { dataUrl } = await capturePng(ctx.element);
  const blob = await (await fetch(dataUrl)).blob();
  download(blob, `${base}.png`);
}

async function exportPdf(ctx: ExportContext, base: string) {
  const [{ jsPDF }, shot] = await Promise.all([import("jspdf"), capturePng(ctx.element)]);
  const landscape = shot.width >= shot.height;
  const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const headerH = 46;

  pdf.setFontSize(16);
  pdf.text(ctx.dashboardName, margin, margin + 6);
  pdf.setFontSize(9);
  pdf.setTextColor(120);
  pdf.text(
    `${ctx.periodLabel} · ${getCurrency().code} · exported ${new Date().toLocaleString()}`,
    margin,
    margin + 22,
  );
  pdf.setTextColor(0);

  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2 - headerH;
  const scale = Math.min(availW / shot.width, availH / shot.height);
  const drawW = shot.width * scale;
  const drawH = shot.height * scale;

  if (drawH <= availH) {
    pdf.addImage(shot.dataUrl, "PNG", margin, margin + headerH, drawW, drawH, undefined, "FAST");
  } else {
    // Very tall boards: slice the capture across pages at full width.
    const sliceH = Math.floor((availH / availW) * shot.width);
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.src = shot.dataUrl;
    await new Promise((res) => (img.onload = res));
    let y = 0;
    let first = true;
    while (y < img.height) {
      const h = Math.min(sliceH * (img.width / shot.width), img.height - y);
      canvas.width = img.width;
      canvas.height = h;
      const cctx = canvas.getContext("2d")!;
      cctx.clearRect(0, 0, canvas.width, canvas.height);
      cctx.drawImage(img, 0, y, img.width, h, 0, 0, img.width, h);
      if (!first) pdf.addPage();
      const top = first ? margin + headerH : margin;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, top, availW, (h / img.width) * availW, undefined, "FAST");
      y += h;
      first = false;
    }
  }
  pdf.save(`${base}.pdf`);
}

async function exportPptx(ctx: ExportContext, base: string) {
  const [{ default: PptxGenJS }, shot] = await Promise.all([import("pptxgenjs"), capturePng(ctx.element)]);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.title = ctx.dashboardName;

  const slide = pptx.addSlide();
  slide.background = { color: "0B1220" };
  slide.addText(ctx.dashboardName, { x: 0.4, y: 0.25, w: 9.2, h: 0.4, fontSize: 22, bold: true, color: "FFFFFF" });
  slide.addText(`${ctx.periodLabel} · ${getCurrency().code}`, {
    x: 0.4, y: 0.65, w: 9.2, h: 0.3, fontSize: 11, color: "9AB0C8",
  });

  const maxW = 9.2;
  const maxH = 4.15;
  const ratio = shot.height / shot.width;
  let w = maxW;
  let h = w * ratio;
  if (h > maxH) { h = maxH; w = h / ratio; }
  slide.addImage({ data: shot.dataUrl, x: (10 - w) / 2, y: 1.0, w, h });

  // Second slide: the numbers as an editable table.
  const rows = tableRows(ctx);
  if (rows.length) {
    const table = pptx.addSlide();
    table.background = { color: "FFFFFF" };
    table.addText(`${ctx.dashboardName} — KPI values`, { x: 0.4, y: 0.3, w: 9.2, h: 0.4, fontSize: 18, bold: true });
    table.addTable(
      [
        [
          { text: "Widget", options: { bold: true } },
          { text: "Metric", options: { bold: true } },
          { text: "Value", options: { bold: true } },
          { text: "vs prev", options: { bold: true } },
          { text: "Target", options: { bold: true } },
        ],
        ...rows.slice(0, 40).map((r) => [
          r.widget,
          r.metric,
          r.value,
          r.deltaPct === null ? "—" : `${r.deltaPct > 0 ? "+" : ""}${r.deltaPct.toFixed(1)}%`,
          r.target === null ? "—" : String(r.target),
        ]),
      ],
      { x: 0.4, y: 0.9, w: 9.2, fontSize: 10, border: { type: "solid", color: "DDDDDD", pt: 1 }, autoPage: true },
    );
  }
  await pptx.writeFile({ fileName: `${base}.pptx` });
}

async function exportXlsx(ctx: ExportContext, base: string) {
  const XLSX = await import("xlsx");
  const rows = tableRows(ctx);
  const wb = XLSX.utils.book_new();

  const summary = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      Widget: r.widget,
      Metric: r.metric,
      "Formatted value": r.value,
      Value: r.raw,
      Currency: r.currency ?? "",
      Previous: r.previous,
      "Change %": r.deltaPct,
      Target: r.target,
      Status: r.status,
    })),
  );
  summary["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, summary, "KPI Summary");

  const series = seriesRows(ctx);
  if (series.length) {
    const ws = XLSX.utils.json_to_sheet(
      series.map((s) => ({ Widget: s.widget, Metric: s.metric, Period: s.point, Value: s.value })),
    );
    ws["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, "Series data");
  }

  const meta = XLSX.utils.json_to_sheet([
    { Field: "Dashboard", Value: ctx.dashboardName },
    { Field: "Description", Value: ctx.description ?? "" },
    { Field: "Period", Value: ctx.periodLabel },
    { Field: "Presentation currency", Value: getCurrency().code },
    { Field: "Exchange rate", Value: getCurrency().rate },
    { Field: "Exported at", Value: new Date().toISOString() },
  ]);
  meta["!cols"] = [{ wch: 24 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, meta, "About");

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${base}.xlsx`);
}

async function exportCsv(ctx: ExportContext, base: string) {
  const rows = tableRows(ctx);
  const header = ["Widget", "Metric", "Formatted value", "Value", "Currency", "Previous", "Change %", "Target", "Status"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    header.map(esc).join(","),
    ...rows.map((r) =>
      [r.widget, r.metric, r.value, r.raw, r.currency, r.previous, r.deltaPct, r.target, r.status].map(esc).join(","),
    ),
  ].join("\r\n");
  download(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), `${base}.csv`);
}

/**
 * Word/Google Docs export: an HTML document with an .doc extension. Word,
 * Pages and Google Docs (File → Open / upload to Drive) all import it with the
 * dashboard image and the KPI table intact.
 */
async function exportDoc(ctx: ExportContext, base: string) {
  const shot = await capturePng(ctx.element);
  const rows = tableRows(ctx);
  const cell = (v: string, bold = false) =>
    `<td style="border:1px solid #d8dee7;padding:6px 8px;font-size:11pt;${bold ? "font-weight:700;background:#f2f5f9;" : ""}">${v}</td>`;
  const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head>
<meta charset="utf-8"><title>${ctx.dashboardName}</title>
<style>@page{size:A4 landscape;margin:1.5cm}body{font-family:Calibri,Arial,sans-serif;color:#0f172a}</style>
</head><body>
<h1 style="font-size:20pt;margin:0 0 4px">${ctx.dashboardName}</h1>
<p style="color:#64748b;font-size:10pt;margin:0 0 14px">${ctx.periodLabel} · ${getCurrency().code} · exported ${new Date().toLocaleString()}</p>
${ctx.description ? `<p style="font-size:11pt">${ctx.description}</p>` : ""}
<img src="${shot.dataUrl}" style="width:100%" />
<h2 style="font-size:14pt;margin:20px 0 8px">KPI values</h2>
<table style="border-collapse:collapse;width:100%">
<tr>${["Widget", "Metric", "Value", "vs prev", "Target"].map((h) => cell(h, true)).join("")}</tr>
${rows
  .map((r) =>
    `<tr>${[
      r.widget,
      r.metric,
      r.value,
      r.deltaPct === null ? "—" : `${r.deltaPct > 0 ? "+" : ""}${r.deltaPct.toFixed(1)}%`,
      r.target === null ? "—" : String(r.target),
    ]
      .map((v) => cell(v))
      .join("")}</tr>`,
  )
  .join("")}
</table></body></html>`;
  download(new Blob([html], { type: "application/msword" }), `${base}.doc`);
}
