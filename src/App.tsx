import JSZip from "jszip";
import { useState } from "react";
import { parseMc } from "./mcParser";
import { renderChartSvg } from "./chartRenderer";

function sanitize(value: string) {
  return value
    .replace(/\s+/g, "-")
    .replace(/[<>:"/\\|?*]/g, "");
}

async function downloadPng(
  svg: string,
  fileName: string
) {
  const blob = new Blob(
    [svg],
    { type: "image/svg+xml" }
  );

  const url = URL.createObjectURL(blob);

  const img = new Image();

  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.src = url;
  });

  const canvas =
    document.createElement("canvas");

  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  ctx.drawImage(img, 0, 0);

  URL.revokeObjectURL(url);

  canvas.toBlob((blob) => {
    if (!blob) return;

    const pngUrl =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = pngUrl;
    a.download = fileName;

    a.click();

    URL.revokeObjectURL(pngUrl);
  });
}

function App() {
  const [svg, setSvg] = useState("");
  const [fileName, setFileName] = useState("chart.png");

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    for (const [name, entry] of Object.entries(
      zip.files
    )) {
      if (!name.endsWith(".mc")) continue;

      const text = await entry.async("text");

      const json = JSON.parse(text);

      const now = Math.floor(Date.now() / 1000);

      setFileName(
        `${sanitize(json.meta.song.title)}_` +
        `${sanitize(json.meta.version)}_` +
        `${now}.png`
      );

      const chartData = parseMc(text);

      const svgText = renderChartSvg(chartData);

      setSvg(svgText);

      break;
    }
  };

  return (
    <div>
      <h1>mcファイル画像化</h1>

      <input
        type="file"
        accept=".mcz"
        onChange={handleFile}
      />

      <button
        onClick={() =>
          downloadPng(svg, fileName)
        }
      >
        PNG保存
      </button>

      <div
        dangerouslySetInnerHTML={{
          __html: svg,
        }}
      />
    </div>
  );
}

export default App;