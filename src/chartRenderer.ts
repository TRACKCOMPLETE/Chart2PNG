import type { ChartData } from "./chart";

const BLOCK_BEATS = 8;
const BLOCK_WIDTH = 120;
const BLOCK_HEIGHT = 900;

const BLOCK_GAP = 50;
const LEFT_MARGIN = 30;
const TOP_AND_BOTTOM_MARGIN = 20;
const PLAY_HEIGHT = BLOCK_HEIGHT - TOP_AND_BOTTOM_MARGIN * 2;

const TAP_COLOR = "#4FC3F7";
const HOLD_COLOR = "#FFB74D";

const GRID_COLOR = "#666";
const BEAT_COLOR = "#333";

const BACKGROUND_COLOR = "#000";

export function renderChartSvg(
  chart: ChartData,
  startMeasure: number,
  endMeasure: number,
): string {
  const startBeat = (startMeasure - 1) * 4;

  const endBeat = endMeasure * 4;

  const visibleBeatCount = endBeat - startBeat;

  const blockCount = Math.ceil(visibleBeatCount / BLOCK_BEATS);

  const width = LEFT_MARGIN + blockCount * (BLOCK_WIDTH + BLOCK_GAP);

  const pixelsPerBeat = PLAY_HEIGHT / BLOCK_BEATS;

  let gridSvg = "";

  const firstVisibleMeasure = Math.floor(startBeat / 4) + 1;

  for (let block = 0; block < blockCount; block++) {
    const blockX = LEFT_MARGIN + block * (BLOCK_WIDTH + BLOCK_GAP);

    // 小節番号
    const firstMeasure = firstVisibleMeasure + block * 2;

    const secondMeasure = firstMeasure + 1;

    gridSvg += `
    <text
        x="${blockX - 20}"
        y="${BLOCK_HEIGHT - 4 - TOP_AND_BOTTOM_MARGIN}"
        font-size="14"
        fill="white"
        text-align="right"
    >
        ${firstMeasure}
    </text>
`;

    gridSvg += `
    <text
        x="${blockX - 20}"
        y="${TOP_AND_BOTTOM_MARGIN + PLAY_HEIGHT / 2 - 4}"
        font-size="14"
        fill="white"
        text-align="right"
    >
        ${secondMeasure}
    </text>
`;

    // レーン線
    for (let lane = 0; lane <= chart.columns; lane++) {
      const x = blockX + lane * (BLOCK_WIDTH / chart.columns);

      gridSvg += `
                <line
                    x1="${x}"
                    y1="0"
                    x2="${x}"
                    y2="${BLOCK_HEIGHT}"
                    stroke="${GRID_COLOR}"
                    stroke-width="1"
                />
            `;
    }

    // 拍線
    for (let beat = 0; beat <= BLOCK_BEATS; beat++) {
      const y = BLOCK_HEIGHT - TOP_AND_BOTTOM_MARGIN - beat * pixelsPerBeat;

      gridSvg += `
                <line
                    x1="${blockX}"
                    y1="${y}"
                    x2="${blockX + BLOCK_WIDTH}"
                    y2="${y}"
                    stroke="${BEAT_COLOR}"
                    stroke-width="1"
                />
            `;
    }
  }

  let notesSvg = "";

  const visibleNotes = chart.notes.filter((note) => {
    const noteEnd = note.end ?? note.start;

    return noteEnd >= startBeat && note.start <= endBeat;
  });

  for (const note of visibleNotes) {
    const localBeat = note.start - startBeat;

    const block = Math.floor(localBeat / BLOCK_BEATS);

    const beatInBlock = localBeat % BLOCK_BEATS;

    const laneWidth = BLOCK_WIDTH / chart.columns;

    const noteWidth = laneWidth * 0.8;

    const x =
      LEFT_MARGIN +
      block * (BLOCK_WIDTH + BLOCK_GAP) +
      note.lane * laneWidth +
      laneWidth * 0.1;

    const y =
      BLOCK_HEIGHT - TOP_AND_BOTTOM_MARGIN - beatInBlock * pixelsPerBeat;

    // ホールド
    if (note.end !== undefined) {
      const startsExactlyOnBoundary =
        Math.abs(localBeat % BLOCK_BEATS) < 0.0001;

      if (startsExactlyOnBoundary && block > 0) {
        const prevX =
          LEFT_MARGIN +
          (block - 1) * (BLOCK_WIDTH + BLOCK_GAP) +
          note.lane * laneWidth +
          laneWidth * 0.1;

        notesSvg += `
          <rect
            x="${prevX}"
            y="0"
            width="${noteWidth}"
            height="${TOP_AND_BOTTOM_MARGIN}"
            fill="${HOLD_COLOR}"
            rx="2"
          />
        `;
        notesSvg += `
          <rect
            x="${prevX}"
            y="0"
            width="${noteWidth}"
            height="${TOP_AND_BOTTOM_MARGIN - 2}"
            fill="${HOLD_COLOR}"
          />
        `;
      }
      const localEndBeat = note.end - startBeat;
      const endsExactlyOnBoundary =
        Math.abs(localEndBeat % BLOCK_BEATS) < 0.0001;

      const endBlock = Math.floor(localEndBeat / BLOCK_BEATS);

      if (
        endBlock === block ||
        (endBlock === block + 1 && endsExactlyOnBoundary)
      ) {
        const endLocalBeat = localEndBeat % BLOCK_BEATS;
        const adjustedEndLocalBeat = endsExactlyOnBoundary
          ? BLOCK_BEATS
          : endLocalBeat;

        const endY =
          BLOCK_HEIGHT -
          TOP_AND_BOTTOM_MARGIN -
          adjustedEndLocalBeat * pixelsPerBeat;

        const topY = Math.min(y, endY);

        const height = Math.abs(endY - y);

        notesSvg += `
          <rect
              x="${x}"
              y="${topY}"
              width="${noteWidth}"
              height="${height}"
              fill="${HOLD_COLOR}"
              rx="2"
          />
        `;

        if (endsExactlyOnBoundary && endBlock === block + 1) {
          const endX =
            LEFT_MARGIN +
            endBlock * (BLOCK_WIDTH + BLOCK_GAP) +
            note.lane * laneWidth +
            laneWidth * 0.1;

          const endY = BLOCK_HEIGHT - TOP_AND_BOTTOM_MARGIN;

          notesSvg += `
            <rect
              x="${endX}"
              y="${endY}"
              width="${noteWidth}"
              height="4"
              fill="${HOLD_COLOR}"
              rx="2"
            />
          `;
          notesSvg += `
            <rect
              x="${endX}"
              y="${endY + 2}"
              width="${noteWidth}"
              height="${TOP_AND_BOTTOM_MARGIN}"
              fill="${HOLD_COLOR}"
            />
          `;
        }
      } else {
        notesSvg += `
          <rect
              x="${x}"
              y="0"
              width="${noteWidth}"
              height="${y}"
              fill="${HOLD_COLOR}"
              rx="2"
          />
        `;
        notesSvg += `
          <rect
              x="${x}"
              y="0"
              width="${noteWidth}"
              height="${y - 2}"
              fill="${HOLD_COLOR}"
          />
        `;

        for (
          let middleBlock = block + 1;
          middleBlock < endBlock;
          middleBlock++
        ) {
          const middleX =
            LEFT_MARGIN +
            middleBlock * (BLOCK_WIDTH + BLOCK_GAP) +
            note.lane * laneWidth +
            laneWidth * 0.1;

          notesSvg += `
            <rect
                x="${middleX}"
                y="0"
                width="${noteWidth}"
                height="${BLOCK_HEIGHT}"
                fill="${HOLD_COLOR}"
            />
        `;
        }

        const lastX =
          LEFT_MARGIN +
          endBlock * (BLOCK_WIDTH + BLOCK_GAP) +
          note.lane * laneWidth +
          laneWidth * 0.1;

        const endLocalBeat = localEndBeat % BLOCK_BEATS;

        const lastHeight =
          BLOCK_HEIGHT - TOP_AND_BOTTOM_MARGIN - endLocalBeat * pixelsPerBeat;

        notesSvg += `
          <rect
              x="${lastX}"
              y="${lastHeight}"
              width="${noteWidth}"
              height="${BLOCK_HEIGHT}"
              fill="${HOLD_COLOR}"
              rx="2"
          />
        `;
        notesSvg += `
          <rect
              x="${lastX}"
              y="${lastHeight + 2}"
              width="${noteWidth}"
              height="${BLOCK_HEIGHT}"
              fill="${HOLD_COLOR}"
          />
        `;
      }
    }
    // タップ
    else {
      notesSvg += `
        <rect
          x="${x}"
          y="${y - 3}"
          width="${noteWidth}"
          height="6"
          fill="${TAP_COLOR}"
          rx="2"
        />
      `;

      const startsExactlyOnBoundary =
        Math.abs(localBeat % BLOCK_BEATS) < 0.0001;

      if (startsExactlyOnBoundary && block > 0) {
        const prevX =
          LEFT_MARGIN +
          (block - 1) * (BLOCK_WIDTH + BLOCK_GAP) +
          note.lane * laneWidth +
          laneWidth * 0.1;

        const prevY = TOP_AND_BOTTOM_MARGIN;

        notesSvg += `
          <rect
            x="${prevX}"
            y="${prevY - 3}"
            width="${noteWidth}"
            height="6"
            fill="${TAP_COLOR}"
            rx="2"
          />
        `;
      }
    }
  }

  return `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="${width}"
            height="${BLOCK_HEIGHT}"
        >
            <rect
                x="0"
                y="0"
                width="${width}"
                height="${BLOCK_HEIGHT}"
                fill="${BACKGROUND_COLOR}"
            />

            ${gridSvg}
            ${notesSvg}
        </svg>
    `;
}
