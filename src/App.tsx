import JSZip from "jszip";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./App.css";
import { useEffect, useState } from "react";
import { parseMc } from "./mcParser";
import { renderChartSvg } from "./chartRenderer";

function sanitize(value: string) {
  return value
    .replace(/\s+/g, "-")
    .replace(/[<>:"/\\|?*]/g, "");
}

async function downloadPng(svg: string, fileName: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () =>
      reject(new Error("画像の読み込みに失敗しました"));
    img.src = url;
  });

  const scale = 2;

  const canvas = document.createElement("canvas");
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;


  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    return;
  }
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  canvas.toBlob((pngBlob) => {
    if (!pngBlob) return;

    const pngUrl = URL.createObjectURL(pngBlob);
    const a = document.createElement("a");

    a.href = pngUrl;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(pngUrl);
  });
}

function downloadSvg(
  svg: string,
  fileName: string
) {
  const blob = new Blob(
    [svg],
    { type: "image/svg+xml" }
  );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;
  a.download =
    fileName.replace(
      /\.png$/,
      ".svg"
    );

  a.click();

  URL.revokeObjectURL(url);
}

type ChartInfo = {
  fileName: string;
  version: string;
};

function App() {
  const [svg, setSvg] = useState("");
  const [fileName, setFileName] = useState("chart.png");

  const [charts, setCharts] = useState<ChartInfo[]>([]);
  const [selectedMc, setSelectedMc] = useState("");

  const [startMeasure, setStartMeasure] = useState<number>(1);
  const [endMeasure, setEndMeasure] = useState<number>(1);
  const [maxMeasure, setMaxMeasure] = useState<number>(1);

  const [zipData, setZipData] = useState<JSZip | null>(null);
  const [chartData, setChartData] = useState<any>(null);

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    const mcEntries = Object.values(zip.files)
      .filter(
        (file) => !file.dir && file.name.endsWith(".mc")
      )
      .map((file) => file.name);

    if (mcEntries.length === 0) {
      return;
    }

    const chartInfos: ChartInfo[] = [];

    for (const mcFile of mcEntries) {
      const entry = zip.file(mcFile);
      if (!entry) continue;

      const text = await entry.async("text");
      const json = JSON.parse(text);

      chartInfos.push({
        fileName: mcFile,
        version: json?.meta?.version ?? mcFile,
      });
    }

    setZipData(zip);
    setCharts(chartInfos);
    setSelectedMc(chartInfos[0].fileName);
  };

  // 譜面ファイルの読み込みだけを担当する
  useEffect(() => {
    let isCancelled = false;

    const loadChart = async () => {
      if (!zipData || !selectedMc) {
        setChartData(null);
        setSvg("");
        return;
      }

      const entry = zipData.file(selectedMc);
      if (!entry) return;

      const text = await entry.async("text");
      if (isCancelled) return;

      const json = JSON.parse(text);

      const now = Math.floor(Date.now() / 1000);
      setFileName(
        `${sanitize(json?.meta?.song?.title ?? "unknown")}_` +
        `${sanitize(json?.meta?.version ?? "unknown")}_` +
        `${now}.png`
      );

      const parsed = parseMc(text);
      setChartData(parsed);

      const maxBeat =
        parsed.notes.length > 0
          ? Math.max(...parsed.notes.map((n) => n.end ?? n.start))
          : 0;

      const measureCount = Math.max(1, Math.ceil(maxBeat / 4));
      setMaxMeasure(measureCount);

      // 新しい譜面を選んだときだけ初期化する
      setStartMeasure(1);
      setEndMeasure(measureCount);
    };

    loadChart();

    return () => {
      isCancelled = true;
    };
  }, [zipData, selectedMc]);

  // 表示範囲が崩れたときの補正
  useEffect(() => {
    setEndMeasure((prev) => Math.max(prev, startMeasure));
  }, [startMeasure]);

  // SVGの再描画だけを担当する
  useEffect(() => {
    if (!chartData) {
      setSvg("");
      return;
    }

    const safeStart = Math.min(
      Math.max(1, startMeasure),
      maxMeasure
    );
    const safeEnd = Math.min(
      Math.max(safeStart, endMeasure),
      maxMeasure
    );

    setSvg(
      renderChartSvg(chartData, safeStart, safeEnd)
    );
  }, [chartData, startMeasure, endMeasure, maxMeasure]);

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
              onChange={(e) =>
                setSelectedMc(e.target.value)
              }
            >
              {charts.map((chart) => (
                <option
                  key={chart.fileName}
                  value={chart.fileName}
                >
                  {chart.version}
                </option>
              ))}
            </select>
          )}
          <div className="dropdown">
            <button
              className="btn btn-primary dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
            >
              保存
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => downloadPng(svg, fileName)}
                  disabled={!svg}
                >
                  PNG保存
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => downloadSvg(svg, fileName)}
                  disabled={!svg}
                >
                  SVG保存
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="d-flex gap-2 align-items-center mb-3">
          <span>表示範囲</span>

          <select
            className="form-select"
            style={{ maxWidth: "120px" }}
            value={startMeasure}
            onChange={(e) =>
              setStartMeasure(Number(e.target.value))
            }
          >
            {Array.from(
              { length: maxMeasure },
              (_, i) => i + 1
            ).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <span>～</span>

          <select
            className="form-select"
            style={{ maxWidth: "120px" }}
            value={endMeasure}
            onChange={(e) =>
              setEndMeasure(Number(e.target.value))
            }
          >
            {Array.from(
              {
                length: maxMeasure - startMeasure + 1,
              },
              (_, i) => startMeasure + i
            ).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="card">
          <div className="card-header text-center">
            譜面プレビュー
          </div>

          <div className="card-body p-3">
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