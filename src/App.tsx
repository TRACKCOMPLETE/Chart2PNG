import JSZip from "jszip";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { useEffect, useState } from "react";
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

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
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

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(pngUrl);
  });
}

function App() {
  const [svg, setSvg] = useState("");
  const [fileName, setFileName] = useState("chart.png");

  type ChartInfo = {
    fileName: string;
    version: string;
  };

  const [charts, setCharts] = useState<ChartInfo[]>([]);
  const [selectedMc, setSelectedMc] = useState("");

  const [zipData, setZipData] = useState<JSZip | null>(null);

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    const mcEntries = Object.values(zip.files)
      .filter(
        file =>
          !file.dir &&
          file.name.endsWith(".mc")
      )
      .map(file => file.name);

    if (mcEntries.length === 0) {
      return;
    }

    const chartInfos: ChartInfo[] = [];

    for (const mcFile of mcEntries) {
      const entry = zip.file(mcFile);

      if (!entry) continue;

      const text =
        await entry.async("text");

      const json =
        JSON.parse(text);

      chartInfos.push({
        fileName: mcFile,
        version:
          json?.meta?.version ??
          mcFile
      });
    }

    setZipData(zip);
    setCharts(chartInfos);
    setSelectedMc(
      chartInfos[0].fileName
    );
  };

  useEffect(() => {
    let isCancelled = false;

    const loadChart = async () => {
      if (!zipData || !selectedMc) {
        return;
      }

      const entry = zipData.file(selectedMc);

      if (!entry) {
        return;
      }

      const text = await entry.async("text");
      if (isCancelled) return;

      const json = JSON.parse(text);

      const now = Math.floor(Date.now() / 1000);

      setFileName(
        `${sanitize(json?.meta?.song?.title ?? "unknown")}_` +
        `${sanitize(json?.meta?.version ?? "unknown")}_` +
        `${now}.png`
      );

      const chartData = parseMc(text);

      setSvg(
        renderChartSvg(chartData)
      );
    };

    loadChart();
    return () => {
      isCancelled = true; // クリーンアップ関数
    };
  }, [zipData, selectedMc]);

  return (
    <div>
      <header className="bg-dark text-white py-3">
        <h1 className="text-center m-0 black-ops-one-regular">
          Chart2PNG
        </h1>
      </header>

      <div className="container-fluid p-3">

        <div className="d-flex gap-2 align-items-center mb-3">

          <input
            type="file"
            accept=".mcz"
            onChange={handleFile}
            className="form-control"
            style={{ maxWidth: "300px" }}
          />

          {charts.length > 1 && (
            <select
              className="form-select"
              style={{ maxWidth: "200px" }}
              value={selectedMc}
              onChange={e =>
                setSelectedMc(e.target.value)
              }
            >
              {charts.map(chart => (
                <option
                  key={chart.fileName}
                  value={chart.fileName}
                >
                  {chart.version}
                </option>
              ))}
            </select>
          )}

          <button
            className="btn btn-primary"
            onClick={() =>
              downloadPng(svg, fileName)
            }
            disabled={!svg}
          >
            PNG保存
          </button>

        </div>

        <div className="card">
          <div className="card-header text-center">
            譜面プレビュー
          </div>

          <div className="card-body p-3">
            {/* ここで表示領域を狭くして中央に寄せる */}
            <div
              className="mx-auto"
              style={{
                maxWidth: "99%",
                overflowX: "auto",
                backgroundColor: "#f8f9fa",
              }}
            >
              <div
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;